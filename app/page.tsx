'use client';
import { Fleet, MyFleet, JoinFleetResult, AppConfig } from "@/types/types";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@/lib/constants";
import LoadingScreen from "@/components/LoadingScreen";
import AuthScreen from "@/components/AuthScreen";
import FleetCard from "@/components/FleetCard";

export default function Home() {
  const { data: session, status } = useSession();
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [designatedFleets, setDesignatedFleets] = useState<Fleet[]>([]);
  const [myFleetId, setMyFleetId] = useState<string | null>(null);
  const [myFleetRole, setMyFleetRole] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const socket = io();
      socketRef.current = socket;

      socket.on(SOCKET_EVENTS.CONFIG_UPDATE, (config: AppConfig) => {
        setAppConfig(config);
      });

      socket.on(SOCKET_EVENTS.FLEETS_UPDATE, (fleets: Fleet[]) => {
        setDesignatedFleets(fleets);
      });

      socket.on(SOCKET_EVENTS.MY_FLEET_UPDATE, (data: MyFleet) => {
        setMyFleetId(data.fleet_id ? String(data.fleet_id).split('.')[0] : null);
        setMyFleetRole(data.role ?? '');
      });

      socket.on(SOCKET_EVENTS.JOIN_FLEET_RESULT, (result: JoinFleetResult) => {
        if (result.success) {
          alert('Invite successfully sent! Please check your in-game notifications.');
        } else {
          alert(result.message || 'Failed to join.');
        }
      });

      const requestMyFleet = () => {
        socket.emit(SOCKET_EVENTS.REQUEST_MY_FLEET, {
          characterId: session.characterId,
          refreshToken: session.refreshToken
        });
      };

      requestMyFleet();
      const intervalId = setInterval(requestMyFleet, 5000);

      return () => {
        clearInterval(intervalId);
        socket.disconnect();
      };
    }
  }, [status, session]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const handleMarkFleet = (designation: string) => {
    if (!myFleetId) return alert('You are not currently in a fleet!');
    socketRef.current?.emit(SOCKET_EVENTS.MARK_FLEET, {
      designation,
      fleet_id: myFleetId,
      characterId: session.characterId,
      refreshToken: session.refreshToken
    });
  };

  const handleUnmarkFleet = (designation: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.UNMARK_FLEET, { designation });
  };

  const handleJoinFleet = (designation: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.JOIN_FLEET, {
      designation,
      characterId: session.characterId,
      refreshToken: session.refreshToken
    });
  };

  const handleSync = () => {
    socketRef.current?.emit(SOCKET_EVENTS.REQUEST_MY_FLEET, {
      characterId: session.characterId,
      refreshToken: session.refreshToken
    });
    socketRef.current?.emit(SOCKET_EVENTS.FORCE_UPDATE_FLEETS);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-eve-window/95 backdrop-blur-md border border-eve-border shadow-2xl flex flex-col">
        
        <div className="bg-eve-panel border-b border-eve-border px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <div className="size-3 bg-eve-border"></div>
              <div className="size-3 bg-eve-border"></div>
              <div className="size-3 bg-cyan-500 shadow-xs shadow-eve-blue/80"></div>
            </div>
            <h1 className="text-eve-highlight text-xs uppercase tracking-widest font-bold mt-0.5">
              {appConfig?.title || 'Loading...'}
            </h1>
          </div>
          <button 
            onClick={() => signOut()} 
            className="text-eve-text hover:text-rose-400 text-xs font-mono transition-colors"
          >
            [ DISCONNECT ]
          </button>
        </div>

        <div className="p-4 sm:p-6 text-sm">
          <div className="mb-6 p-3 bg-eve-panel/50 border border-eve-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="font-mono text-xs">
              <span className="text-eve-text/60">LOGGED IN AS: </span>
              <span className="text-eve-highlight font-semibold">{session.user?.name || 'Authenticated Pilot'}</span>
            </div>
            <div className="font-mono text-xs">
              <span className="text-eve-text/60">MY FLEET STATUS: </span>
              <span className={myFleetId ? "text-emerald-400 font-semibold shadow-emerald-500/20 drop-shadow-md" : "text-rose-400/80"}>
                {myFleetId ? (myFleetRole === 'fleet_commander' ? 'FLEET COMMANDER' : 'IN A FLEET') : 'NOT IN A FLEET'}
              </span>
            </div>
            <button 
              onClick={handleSync}
              className="text-cyan-500/80 hover:text-cyan-400 hover:shadow-xs hover:shadow-eve-blue/50 transition-all text-xs font-mono uppercase border-b border-cyan-500/30 hover:border-cyan-400 pb-0.5"
            >
              Sync
            </button>
          </div>

          <div className="space-y-4">
            {appConfig?.fleets.map(fleetConfig => (
              <FleetCard
                key={fleetConfig.name}
                designation={fleetConfig.name}
                fleet={designatedFleets.find(f => f.designation === fleetConfig.name)}
                myFleetId={myFleetId}
                onJoin={handleJoinFleet}
                onMark={handleMarkFleet}
                onUnmark={handleUnmarkFleet}
              />
            ))}
          </div>
          
        </div>
        
        <div className="bg-eve-panel/80 border-t border-eve-border px-4 py-1.5 flex justify-end">
          <div className="w-2 h-2 border-b border-r border-eve-text/30"></div>
        </div>

      </div>
    </div>
  );
}
