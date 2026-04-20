import db from '@/lib/db';
import { refreshAccessToken, getFleetDetails, ensureFleetConfiguration } from '@/lib/eve';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

export async function GET() {
  const fleets = db.prepare('SELECT * FROM designated_fleets').all() as any[];
  const activeFleets =[];

  for (const fleet of fleets) {
    try {
      const accessToken = await refreshAccessToken(fleet.marker_refresh_token);
      const details = await getFleetDetails(fleet.fleet_id, accessToken);
      
      // Auto unmark logic: EVE fleets disappear (404) when empty. 
      if (!details) {
        db.prepare('DELETE FROM designated_fleets WHERE designation = ?').run(fleet.designation);
      } else {
        activeFleets.push({ designation: fleet.designation, fleet_id: fleet.fleet_id });
      }
    } catch (e) {
      // If token fails or fleet unreadable, purge to keep it clean.
      db.prepare('DELETE FROM designated_fleets WHERE designation = ?').run(fleet.designation);
    }
  }
  return Response.json(activeFleets);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  const { designation, fleet_id } = await req.json();
  
  // Force fleet_id into a clean string without decimals so SQLite binds it as TEXT
  const safeFleetId = String(fleet_id).split('.')[0];

  const stmt = db.prepare(`
    INSERT INTO designated_fleets (designation, fleet_id, marker_character_id, marker_refresh_token)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(designation) DO UPDATE SET
      fleet_id = excluded.fleet_id,
      marker_character_id = excluded.marker_character_id,
      marker_refresh_token = excluded.marker_refresh_token
  `);
  stmt.run(designation, safeFleetId, session.characterId, session.refreshToken);
  
  // --- NEW: Process structural configurations ---
  try {
    const accessToken = await refreshAccessToken(session.refreshToken);
    await ensureFleetConfiguration(safeFleetId, accessToken);
  } catch (e) {
    // Catch generic faults without failing the POST return 
    console.error(`Failed to execute structural configurations on ${safeFleetId}:`, e);
  }
  
  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  const url = new URL(req.url);
  const designation = url.searchParams.get('designation');
  if (designation) {
    db.prepare('DELETE FROM designated_fleets WHERE designation = ?').run(designation);
  }
  return Response.json({ success: true });
}
