import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import db from './lib/db';
import { refreshAccessToken, getFleetDetails, ensureFleetConfiguration, inviteToFleet, getCharacterFleet } from './lib/eve';
import { SOCKET_EVENTS } from './lib/constants';
import { getConfig } from './lib/config';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server);

  let activeFleets: any[] = [];
  let isUpdating = false;

  const updateFleets = async () => {
    if (isUpdating) return;
    isUpdating = true;
    try {
      db.prepare('CREATE TABLE IF NOT EXISTS user_tokens (character_id TEXT PRIMARY KEY, refresh_token TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
      const fleets = db.prepare('SELECT * FROM designated_fleets').all() as any[];
      const newActiveFleets: any[] = [];

      for (const fleet of fleets) {
        let accessToken: string | null = null;
        let details: any = null;
        let membersRes: Response | null = null;
        let validMarkerFound = false;
        let esiError = false;

        try {
          accessToken = await refreshAccessToken(fleet.marker_refresh_token);
          if (accessToken) {
            details = await getFleetDetails(fleet.fleet_id, accessToken);
            if (details) {
              membersRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleet.fleet_id}/members/`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (membersRes.ok) {
                validMarkerFound = true;
              } else if (membersRes.status === 403 || membersRes.status === 404) {
              } else if (membersRes.status >= 500) {
                throw new Error(`ESI Server Error: ${membersRes.status}`);
              } else {
                throw new Error(`Members fetch failed: ${membersRes.status}`);
              }
            }
          }
        } catch (e: any) {
          if (e.message === 'invalid_token') {
          } else {
            esiError = true;
            if (!e.message?.includes('ESI Server Error')) {
              console.error("Marker error:", e);
            }
          }
        }

        if (esiError) {
          const existingFleet = activeFleets.find(f => f.designation === fleet.designation);
          if (existingFleet) {
            newActiveFleets.push(existingFleet);
          }
          continue;
        }

        if (!validMarkerFound) {
          const allTokens = db.prepare('SELECT * FROM user_tokens WHERE character_id != ? ORDER BY updated_at DESC LIMIT 5').all(fleet.marker_character_id) as any[];
          
          for (const fallback of allTokens) {
            try {
              const fallbackToken = await refreshAccessToken(fallback.refresh_token);
              if (fallbackToken) {
                const fallbackDetails = await getFleetDetails(fleet.fleet_id, fallbackToken);
                if (fallbackDetails) {
                  const fallbackMembersRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleet.fleet_id}/members/`, {
                    headers: { Authorization: `Bearer ${fallbackToken}` }
                  });
                  if (fallbackMembersRes.ok) {
                    db.prepare('UPDATE designated_fleets SET marker_character_id = ?, marker_refresh_token = ? WHERE designation = ?')
                      .run(fallback.character_id, fallback.refresh_token, fleet.designation);
                    
                    accessToken = fallbackToken;
                    details = fallbackDetails;
                    membersRes = fallbackMembersRes;
                    fleet.marker_character_id = fallback.character_id;
                    fleet.marker_refresh_token = fallback.refresh_token;
                    validMarkerFound = true;
                    break;
                  }
                }
              }
            } catch (e) {}
          }

          if (!validMarkerFound) {
            db.prepare('DELETE FROM designated_fleets WHERE designation = ?').run(fleet.designation);
            continue;
          }
        }

        if (!validMarkerFound || !accessToken || !membersRes) {
          continue;
        }

        try {
          const wingsRes = await fetch(`https://esi.evetech.net/latest/fleets/${fleet.fleet_id}/wings/`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

          if (!wingsRes.ok && wingsRes.status >= 500) {
            throw new Error(`ESI Server Error: ${wingsRes.status}`);
          }

          let fcName = 'Unknown';
          let bossName = 'Unknown';
          let groupedMembers: Record<string, string[]> = {};
          let totalMembers = 0;

          if (wingsRes.ok) {
            const members = await membersRes.json();
            const wings = await wingsRes.json();

            const wingMap = new Map<number, string>();
            const squadMap = new Map<number, string>();

            for (const wing of wings) {
              wingMap.set(wing.id, wing.name);
              if (wing.squads) {
                for (const squad of wing.squads) {
                  squadMap.set(squad.id, squad.name);
                }
              }
            }

            const characterIds = members.map((m: any) => m.character_id);
            const markerCharId = Number(fleet.marker_character_id);
            
            if (!characterIds.includes(markerCharId)) {
              characterIds.push(markerCharId);
            }

            if (characterIds.length > 0) {
              const namesRes = await fetch('https://esi.evetech.net/latest/universe/names/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(characterIds)
              });

              if (!namesRes.ok && namesRes.status >= 500) {
                throw new Error(`ESI Server Error: ${namesRes.status}`);
              }

              if (namesRes.ok) {
                const namesData = await namesRes.json();
                const nameMap = new Map<number, string>(namesData.map((n: any) => [n.id, n.name]));

                bossName = nameMap.get(markerCharId) || 'Unknown';
                totalMembers = members.length;

                for (const m of members) {
                  const charName = nameMap.get(m.character_id) || 'Unknown';
                  let groupName = 'Unknown';

                  if (m.role === 'fleet_commander') {
                    groupName = 'Fleet Commander';
                    fcName = charName;
                  } else if (m.role === 'wing_commander') {
                    groupName = wingMap.get(m.wing_id) || 'Unknown Wing';
                  } else if (m.role === 'squad_commander' || m.role === 'squad_member') {
                    groupName = squadMap.get(m.squad_id) || 'Unknown Squad';
                  }

                  if (!groupedMembers[groupName]) {
                    groupedMembers[groupName] = [];
                  }
                  groupedMembers[groupName].push(charName);
                }
              }
            }
          }

          newActiveFleets.push({ 
            designation: fleet.designation, 
            fleet_id: fleet.fleet_id,
            fc_name: fcName,
            boss_name: bossName,
            grouped_members: groupedMembers,
            total_members: totalMembers
          });
        } catch (e: any) {
          if (e.message?.includes('ESI Server Error')) {
            const existingFleet = activeFleets.find(f => f.designation === fleet.designation);
            if (existingFleet) {
              newActiveFleets.push(existingFleet);
            }
          } else {
            console.error("Error processing fleet data:", e);
          }
        }
      }
      
      activeFleets = newActiveFleets;
      io.emit(SOCKET_EVENTS.FLEETS_UPDATE, activeFleets);
    } catch (e) {
      console.error("Update loop error:", e);
    } finally {
      isUpdating = false;
    }
  };

  setInterval(updateFleets, 5000);
  updateFleets();

  io.on('connection', (socket) => {
    socket.emit(SOCKET_EVENTS.CONFIG_UPDATE, getConfig());
    socket.emit(SOCKET_EVENTS.FLEETS_UPDATE, activeFleets);

    socket.on(SOCKET_EVENTS.FORCE_UPDATE_FLEETS, () => {
      updateFleets();
    });

    socket.on(SOCKET_EVENTS.REQUEST_MY_FLEET, async ({ characterId, refreshToken }) => {
      if (!characterId || !refreshToken) return;
      try {
        db.prepare('CREATE TABLE IF NOT EXISTS user_tokens (character_id TEXT PRIMARY KEY, refresh_token TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
        db.prepare(`
          INSERT INTO user_tokens (character_id, refresh_token, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP) 
          ON CONFLICT(character_id) DO UPDATE SET 
            refresh_token = excluded.refresh_token,
            updated_at = CURRENT_TIMESTAMP
        `).run(characterId, refreshToken);

        const accessToken = await refreshAccessToken(refreshToken);
        if (!accessToken) {
          socket.emit(SOCKET_EVENTS.MY_FLEET_UPDATE, { fleet_id: null, role: null });
          return;
        }

        const fleet = await getCharacterFleet(characterId, accessToken);
        if (fleet && fleet.fleet_id) {
          fleet.fleet_id = String(fleet.fleet_id).split('.')[0];
        }
        socket.emit(SOCKET_EVENTS.MY_FLEET_UPDATE, fleet || { fleet_id: null, role: null });
      } catch (e) {
        socket.emit(SOCKET_EVENTS.MY_FLEET_UPDATE, { fleet_id: null, role: null });
      }
    });

    socket.on(SOCKET_EVENTS.MARK_FLEET, async ({ designation, fleet_id, characterId, refreshToken }) => {
      if (!characterId || !refreshToken || !fleet_id) return;
      const safeFleetId = String(fleet_id).split('.')[0];
      
      db.prepare(`
        INSERT INTO designated_fleets (designation, fleet_id, marker_character_id, marker_refresh_token)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(designation) DO UPDATE SET
          fleet_id = excluded.fleet_id,
          marker_character_id = excluded.marker_character_id,
          marker_refresh_token = excluded.marker_refresh_token
      `).run(designation, safeFleetId, characterId, refreshToken);

      try {
        const accessToken = await refreshAccessToken(refreshToken);
        if (accessToken) {
          const config = getConfig();
          const fleetConfig = config.fleets.find(f => f.name === designation);
          const motd = fleetConfig?.motd || '';
          const squads = fleetConfig?.squads || [];
          await ensureFleetConfiguration(safeFleetId, accessToken, designation, motd, squads);
        }
      } catch (e) {
        console.error(`Failed to execute structural configurations on ${safeFleetId}:`, e);
      }
      updateFleets();
    });

    socket.on(SOCKET_EVENTS.UNMARK_FLEET, ({ designation }) => {
      db.prepare('DELETE FROM designated_fleets WHERE designation = ?').run(designation);
      updateFleets();
    });

    socket.on(SOCKET_EVENTS.JOIN_FLEET, async ({ designation, characterId, refreshToken }) => {
      if (!characterId || !refreshToken) return;
      
      db.prepare('CREATE TABLE IF NOT EXISTS user_tokens (character_id TEXT PRIMARY KEY, refresh_token TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
      db.prepare(`
        INSERT INTO user_tokens (character_id, refresh_token, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP) 
        ON CONFLICT(character_id) DO UPDATE SET 
          refresh_token = excluded.refresh_token,
          updated_at = CURRENT_TIMESTAMP
      `).run(characterId, refreshToken);

      const fleet = db.prepare('SELECT * FROM designated_fleets WHERE designation = ?').get(designation) as any;
      if (!fleet) {
        socket.emit(SOCKET_EVENTS.JOIN_FLEET_RESULT, { success: false, message: 'Fleet not found' });
        return;
      }

      try {
        const accessToken = await refreshAccessToken(fleet.marker_refresh_token);
        if (!accessToken) throw new Error('Failed to refresh access token');
        await inviteToFleet(fleet.fleet_id, characterId, accessToken);
        socket.emit(SOCKET_EVENTS.JOIN_FLEET_RESULT, { success: true });
      } catch(e) {
        socket.emit(SOCKET_EVENTS.JOIN_FLEET_RESULT, { success: false, message: 'Failed to join. The fleet might be transitioning bosses. Try again in a few seconds.' });
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
