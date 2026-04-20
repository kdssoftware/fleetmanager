import { Fleet } from "@/types/types";

interface FleetCardProps {
  designation: string;
  fleet?: Fleet;
  myFleetId: string | null;
  onJoin: (designation: string) => void;
  onMark: (designation: string) => void;
  onUnmark: (designation: string) => void;
}

export default function FleetCard({ designation, fleet, myFleetId, onJoin, onMark, onUnmark }: FleetCardProps) {
  const isMyFleet = fleet && fleet.fleet_id?.toString() === myFleetId?.toString();
  const disableMarking = !myFleetId;

  return (
    <div className="bg-eve-panel border border-eve-border relative overflow-hidden mb-4 transition-all">
      <div className={`absolute top-0 left-0 w-1 h-full ${fleet ? 'bg-emerald-500 shadow-sm shadow-eve-lgreen/80' : 'bg-eve-border'}`}></div>
      
      <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-eve-highlight text-lg uppercase tracking-wider font-semibold mb-1">{designation} Fleet</h2>
          {fleet ? (
            <>
              <p className="text-xs text-emerald-400 font-mono flex items-center mb-3">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-xs shadow-eve-lgreen/80"></span>
                Available to join
              </p>
              <div className="bg-eve-bg/40 border border-eve-border/40 p-3 rounded-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 border-b border-eve-border/40 pb-2">
                  <div className="font-mono text-xs">
                    <span className="text-eve-text/50">FC: </span>
                    <span className="text-eve-highlight">{fleet.fc_name || 'Unknown'}</span>
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-eve-text/50">BOSS: </span>
                    <span className="text-eve-highlight">{fleet.boss_name || 'Unknown'}</span>
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-eve-text/50">TOTAL MEMBERS: </span>
                    <span className="text-eve-highlight">{fleet.total_members || 0}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {fleet.grouped_members && Object.keys(fleet.grouped_members).length > 0 ? (
                    Object.entries(fleet.grouped_members).map(([groupName, members]) => (
                      members.length > 0 && (
                        <div key={groupName} className="font-mono text-xs leading-relaxed">
                          <div className="text-eve-cyan/80 mb-0.5 uppercase tracking-wider flex items-center">
                            <span className="w-1 h-1 bg-eve-cyan/50 rounded-full mr-1.5"></span>
                            {groupName}
                          </div>
                          <div className="text-eve-text/80 pl-2.5 border-l border-eve-border/50 ml-0.5">
                            {members.join(', ')}
                          </div>
                        </div>
                      )
                    ))
                  ) : (
                    <div className="font-mono text-xs text-eve-text/50 italic">No members in fleet</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-eve-text/50 font-mono uppercase">NO FLEET Available, create and assign one</p>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2 sm:mt-0 mt-2">
          {fleet ? (
            <>
              <button 
                onClick={() => onJoin(designation)}
                className="bg-emerald-950/40 border border-emerald-500/70 text-emerald-400 hover:bg-emerald-900/60 hover:text-emerald-200 transition-all px-4 py-1.5 text-xs uppercase tracking-wide cursor-pointer grow sm:grow-0 shadow-xs shadow-eve-l-green/15 hover:shadow-md hover:shadow-eve-lgreen/30"
              >
                Join this Fleet
              </button>
              {isMyFleet ? (
                <button 
                  onClick={() => onUnmark(designation)}
                  className="bg-rose-950/40 border border-rose-500/70 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition-all px-4 py-1.5 text-xs uppercase tracking-wide cursor-pointer grow sm:grow-0 shadow-xs shadow-eve-pink/15 hover:shadow-md hover:shadow-eve-pink/30"
                >
                  Unassign my fleet
                </button>
              ) : (
                <button 
                  onClick={() => onMark(designation)}
                  disabled={disableMarking}
                  title={disableMarking ? "Requires being in a fleet" : ""}
                  className={`transition-all px-4 py-1.5 text-xs uppercase tracking-wide grow sm:grow-0
                    ${disableMarking 
                      ? "bg-eve-bg/50 border border-eve-border/50 text-eve-text/30 cursor-not-allowed" 
                      : "bg-amber-950/40 border border-amber-500/70 text-amber-400 hover:bg-amber-900/60 hover:text-amber-200 cursor-pointer shadow-xs shadow-eve-lyellow/15 hover:shadow-md hover:shadow-eve-lyellow/30"
                    }`}
                >
                  Override fleet
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={() => onMark(designation)}
              disabled={disableMarking}
              title={disableMarking ? "Requires being in a fleet" : ""}
              className={`transition-all px-4 py-1.5 text-xs uppercase tracking-wide -grow sm:grow-0
                ${disableMarking 
                  ? "bg-eve-bg/50 border border-eve-border/50 text-eve-text/30 cursor-not-allowed" 
                  : "bg-cyan-950/40 border border-cyan-500/70 text-cyan-400 hover:bg-cyan-900/60 hover:text-cyan-200 cursor-pointer shadow-eve-blue/15 shadow-xs hover:shadow-md hover:shadow-eve-blue/30"
                }`}
            >
              Assign My Fleet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
