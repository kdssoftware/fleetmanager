export async function refreshAccessToken(refreshToken: string) {
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
  if (!res.ok) throw new Error('Failed to refresh token');
  const data = await res.json();
  return data.access_token;
}

export async function getCharacterFleet(characterId: string, accessToken: string) {
  const res = await fetch(`https://esi.evetech.net/latest/characters/${characterId}/fleet/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch character fleet');
  return res.json();
}

export async function getFleetDetails(fleetId: string, accessToken: string) {
  const res = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null; 
  if (!res.ok) throw new Error('Failed to fetch fleet details');
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
  if (!res.ok) throw new Error(`Failed to invite: ${res.statusText}`);
  return true;
}

// --- NEW FUNCTION ---
export async function ensureFleetConfiguration(fleetId: string, accessToken: string) {
  // 1. Ensure Free Move is turned on
  const details = await getFleetDetails(fleetId, accessToken);
  if (details && !details.is_free_move) {
    await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // ESI expects motd to be included when updating fleet settings
      body: JSON.stringify({
        is_free_move: true,
        motd: details.motd || '' 
      }),
    });
  }

  // 2. Fetch current wings and squads
  const wingsRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!wingsRes.ok) return; // Silently abort config if user lacks Fleet Boss roles
  
  const wings = await wingsRes.json();
  let targetWingId;
  
  if (wings.length === 0) {
    // If no wings exist, create the first one to hold our squads
    const wingRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!wingRes.ok) return; 
    const wingData = await wingRes.json();
    targetWingId = wingData.wing_id;
  } else {
    // ESI returns arrays using standard IDs, capture the first available Wing
    targetWingId = wings[0].id || wings[0].wing_id;
  }

  // Find out what squads we already have across all wings
  const existingSquads = new Set<string>();
  for (const wing of wings) {
    if (wing.squads) {
      for (const squad of wing.squads) {
        existingSquads.add(squad.name);
      }
    }
  }

  // 3. Ensure "AFK", "Mining", "Combat", "Idle" squads exist
  const requiredSquads = ["AFK", "Mining", "Combat", "Idle"];
  for (const reqSquad of requiredSquads) {
    if (!existingSquads.has(reqSquad)) {
      // Step A: Create a generic squad
      const sqRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/wings/${targetWingId}/squads/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (sqRes.ok) {
        const sqData = await sqRes.json();
        
        // Step B: Rename it to the missing required squad name
        await fetch(`https://esi.evetech.net/latest/fleets/${fleetId}/squads/${sqData.squad_id}/`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: reqSquad }),
        });
      }
    }
  }
}
