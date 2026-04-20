import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { getCharacterFleet } from "@/lib/eve";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  try {
     const fleet = await getCharacterFleet(session.characterId, session.accessToken);
     
     // Make sure the returned fleet_id is formatted strictly as a string
     if (fleet && fleet.fleet_id) {
       fleet.fleet_id = String(fleet.fleet_id).split('.')[0];
     }
     
     return Response.json(fleet || { fleet_id: null, role: null });
  } catch (e) {
     return Response.json({ fleet_id: null, role: null });
  }
}
