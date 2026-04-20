const tokenCache = new Map<string, { token: string, expiresAt: number }>();

export async function refreshAccessToken(refreshToken: string) {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }

  const basicAuth = Buffer.from(`${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  
  if (!res.ok) {
    if (res.status === 400) throw new Error('invalid_token');
    if (res.status >= 500) throw new Error(`ESI Server Error: ${res.status}`);
    throw new Error(`Failed to refresh token: ${res.status}`);
  }
  
  const data = await res.json();
  
  tokenCache.set(refreshToken, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  });
  
  return data.access_token;
}

export async function getCharacterFleet(characterId: string, accessToken: string) {
  const res = await fetch(`https://esi.evetech.net/latest/characters/${characterId}/fleet/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    if (res.status >= 500) throw new Error(`ESI Server Error: ${res.status}`);
    throw new Error(`Failed to fetch character fleet: ${res.status}`);
  }
  return res.json();
}

export async function getFleetDetails(fleetId: string, accessToken: string) {
  const res = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404 || res.status === 403) return null; 
  if (!res.ok) {
    if (res.status >= 500) throw new Error(`ESI Server Error: ${res.status}`);
    throw new Error(`Failed to fetch fleet details: ${res.status}`);
  }
  return res.json(); 
}

export async function inviteToFleet(fleetId: string, characterId: string, accessToken: string) {
  const res = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/members/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      character_id: parseInt(characterId, 10),
      role: 'squad_member',
    }),
  });
  if (!res.ok) {
    if (res.status >= 500) throw new Error(`ESI Server Error: ${res.status}`);
    throw new Error(`Failed to invite: ${res.statusText}`);
  }
  return true;
}

export async function ensureFleetConfiguration(fleetId: string, accessToken: string, designation: string, motd: string, requiredSquads: string[]) {
  await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_free_move: true,
      motd: motd 
    }),
  });

  const wingsRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!wingsRes.ok) return; 
  
  const wings = await wingsRes.json();
  let targetWingId;
  
  if (wings.length === 0) {
    const wingRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!wingRes.ok) return; 
    const wingData = await wingRes.json();
    targetWingId = wingData.wing_id;
  } else {
    targetWingId = wings[0].id || wings[0].wing_id;
  }

  const existingSquads = new Set<string>();
  for (const wing of wings) {
    if (wing.squads) {
      for (const squad of wing.squads) {
        if (squad.name === 'Squad 1') {
          const squadId = squad.id || squad.squad_id;
          await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/squads/${squadId}/`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } else {
          existingSquads.add(squad.name);
        }
      }
    }
  }

  for (const reqSquad of requiredSquads) {
    if (!existingSquads.has(reqSquad)) {
      const sqRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/${targetWingId}/squads/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (sqRes.ok) {
        const sqData = await sqRes.json();
        const newSquadId = sqData.squad_id || sqData.id;
        
        await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/squads/${newSquadId}/`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: reqSquad }),
        });

        existingSquads.add(reqSquad);
      }
    }
  }
}
