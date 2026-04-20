'use client';
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [designatedFleets, setDesignatedFleets] = useState<any[]>([]);
  const [myFleetId, setMyFleetId] = useState<string | null>(null);
  
  // Track if the player has the required boss/commander role to mark fleets
  const[canManageFleet, setCanManageFleet] = useState<boolean>(false);

  const fetchFleets = async () => {
    const res = await fetch('/api/fleets');
    if (res.ok) setDesignatedFleets(await res.json());
  };

  const fetchMyFleet = async () => {
    const res = await fetch('/api/my-fleet');
    if (res.ok) {
      const data = await res.json();
      setMyFleetId(data.fleet_id ? String(data.fleet_id).split('.')[0] : null);
      
      // In EVE, to modify fleet hierarchy (which our tool does), you need to be the fleet_commander or boss
      setCanManageFleet(data.role === 'fleet_commander');
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFleets();
      fetchMyFleet();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-eve-cyan animate-pulse font-mono text-sm tracking-widest">Establishing Neural Link...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-eve-window/90 backdrop-blur-md border border-eve-border shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          <div className="bg-eve-panel border-b border-eve-border px-4 py-3 flex items-center space-x-3">
             <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
             <h1 className="text-eve-highlight text-sm uppercase tracking-widest font-semibold">Authentication Required</h1>
          </div>
          <div className="p-6 flex flex-col items-center space-y-6">
            <p className="text-center text-xs text-eve-text leading-relaxed">
              Secure connection required. Please authenticate your capsuleer identity via CONCORD SSO to access fleet intelligence.
            </p>
            <button 
              onClick={() => signIn('eveonline')}
              className="w-full bg-gradient-to-r from-eve-panel via-teal-900/40 to-eve-panel border border-teal-500/70 text-teal-400 hover:bg-teal-900/60 hover:text-teal-200 transition-all px-4 py-2.5 text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_10px_rgba(20,184,166,0.15)] hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              Initialize Capsule Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  const markFleet = async (designation: string) => {
    if (!myFleetId) return alert('You are not currently in a fleet!');
    if (!canManageFleet) return alert('You must be the Fleet Commander/Boss to mark a fleet!');
    
    await fetch('/api/fleets', {
      method: 'POST',
      body: JSON.stringify({ designation, fleet_id: myFleetId })
    });
    fetchFleets();
  };

  const unmarkFleet = async (designation: string) => {
    await fetch(`/api/fleets?designation=${designation}`, { method: 'DELETE' });
    fetchFleets();
  };

  const joinFleet = async (designation: string) => {
    const res = await fetch('/api/fleets/join', {
      method: 'POST',
      body: JSON.stringify({ designation })
    });
    if (!res.ok) alert('Failed to join. Fleet has been automatically unmarked.');
    else alert('Invite successfully sent! Please check your in-game notifications.');
    fetchFleets();
  };

  const renderDesignation = (designation: string) => {
    const fleet = designatedFleets.find(f => f.designation === designation);
    const isMyFleet = fleet && fleet.fleet_id?.toString() === myFleetId?.toString();
    
    // Conditions to disable actions
    const disableMarking = !myFleetId || !canManageFleet;

    return (
      <div key={designation} className="bg-eve-panel border border-eve-border relative overflow-hidden mb-4 transition-all">
        {/* Accent Bar */}
        <div className={`absolute top-0 left-0 w-1 h-full ${fleet ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-eve-border'}`}></div>
        
        <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-eve-highlight text-lg uppercase tracking-wider font-semibold mb-1">{designation} Fleet</h2>
            {fleet ? (
              <p className="text-xs text-emerald-400 font-mono flex items-center">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                ACTIVE BROADCAST
              </p>
            ) : (
              <p className="text-xs text-eve-text/50 font-mono">NO FLEET ASSIGNED</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fleet ? (
              <>
                <button 
                  onClick={() => joinFleet(designation)}
                  className="bg-emerald-950/40 border border-emerald-500/70 text-emerald-400 hover:bg-emerald-900/60 hover:text-emerald-200 transition-all px-4 py-1.5 text-xs uppercase tracking-wide cursor-pointer flex-grow sm:flex-grow-0 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  Join Fleet
                </button>
                {isMyFleet ? (
                  <button 
                    onClick={() => unmarkFleet(designation)}
                    className="bg-rose-950/40 border border-rose-500/70 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition-all px-4 py-1.5 text-xs uppercase tracking-wide cursor-pointer flex-grow sm:flex-grow-0 shadow-[0_0_8px_rgba(244,63,94,0.15)] hover:shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  >
                    Unmark Mine
                  </button>
                ) : (
                  <button 
                    onClick={() => markFleet(designation)}
                    disabled={disableMarking}
                    title={disableMarking ? "Requires Fleet Commander role" : ""}
                    className={`transition-all px-4 py-1.5 text-xs uppercase tracking-wide flex-grow sm:flex-grow-0
                      ${disableMarking 
                        ? "bg-eve-bg/50 border border-eve-border/50 text-eve-text/30 cursor-not-allowed" 
                        : "bg-amber-950/40 border border-amber-500/70 text-amber-400 hover:bg-amber-900/60 hover:text-amber-200 cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.15)] hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      }`}
                  >
                    Override
                  </button>
                )}
              </>
            ) : (
              <button 
                onClick={() => markFleet(designation)}
                disabled={disableMarking}
                title={disableMarking ? "Requires Fleet Commander role" : ""}
                className={`transition-all px-4 py-1.5 text-xs uppercase tracking-wide flex-grow sm:flex-grow-0
                  ${disableMarking 
                    ? "bg-eve-bg/50 border border-eve-border/50 text-eve-text/30 cursor-not-allowed" 
                    : "bg-cyan-950/40 border border-cyan-500/70 text-cyan-400 hover:bg-cyan-900/60 hover:text-cyan-200 cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.15)] hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  }`}
              >
                Mark My Fleet
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-eve-window/95 backdrop-blur-md border border-eve-border shadow-2xl flex flex-col">
        
        {/* Window Header */}
        <div className="bg-eve-panel border-b border-eve-border px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-eve-border"></div>
              <div className="w-3 h-3 bg-eve-border"></div>
              <div className="w-3 h-3 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            </div>
            <h1 className="text-eve-highlight text-xs uppercase tracking-widest font-bold mt-0.5">MagikMain Fleet Manager</h1>
          </div>
          <button 
            onClick={() => signOut()} 
            className="text-eve-text hover:text-rose-400 text-xs font-mono transition-colors"
          >
            [ DISCONNECT ]
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 text-sm">
          {/* User Info Bar */}
          <div className="mb-6 p-3 bg-eve-panel/50 border border-eve-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="font-mono text-xs">
              <span className="text-eve-text/60">LOGGED IN AS: </span>
              <span className="text-eve-highlight font-semibold">{session.user?.name || 'Authenticated Pilot'}</span>
            </div>
            <div className="font-mono text-xs">
              <span className="text-eve-text/60">LOCAL STATUS: </span>
              <span className={myFleetId ? "text-emerald-400 font-semibold shadow-emerald-500/20 drop-shadow-md" : "text-rose-400/80"}>
                {myFleetId ? (canManageFleet ? 'FLEET COMMANDER' : 'SQUAD MEMBER') : 'OFFLINE'}
              </span>
            </div>
            <button 
              onClick={() => { fetchFleets(); fetchMyFleet(); }}
              className="text-cyan-500/80 hover:text-cyan-400 hover:shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all text-xs font-mono uppercase border-b border-cyan-500/30 hover:border-cyan-400 pb-0.5"
            >
              Sync
            </button>
          </div>

          {/* Fleets */}
          <div className="space-y-4">
            {renderDesignation('High Sec')}
            {renderDesignation('Wormhole')}
          </div>
          
        </div>
        
        {/* Window Footer */}
        <div className="bg-eve-panel/80 border-t border-eve-border px-4 py-1.5 flex justify-end">
          <div className="w-2 h-2 border-b border-r border-eve-text/30"></div>
        </div>

      </div>
    </div>
  );
}
