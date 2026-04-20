import { signIn } from "next-auth/react";

export default function AuthScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-eve-window/90 backdrop-blur-md border border-eve-border shadow-2xl flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        <div className="bg-eve-panel border-b border-eve-border px-4 py-3 flex items-center space-x-3">
           <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-xs shadow-eve-lblue/80"></div>
           <h1 className="text-eve-highlight text-sm uppercase tracking-widest font-semibold">Authentication Required</h1>
        </div>
        <div className="p-6 flex flex-col items-center space-y-6">
          <p className="text-center text-xs text-eve-text leading-relaxed">
            Sign-in required, please authenticate.
          </p>
          <button 
            onClick={() => signIn('eveonline')}
            className="w-full bg-linear-to-r from-eve-panel via-teal-900/40 to-eve-panel border border-teal-500/70 text-teal-400 hover:bg-teal-900/60 hover:text-teal-200 transition-all px-4 py-2.5 text-xs uppercase tracking-widest cursor-pointer shadow-sm shadow-eve-llgreen/15 hover:shadow-md hover:shadow-eve-llgreen/30"
          >
            Sign-in with EVE Online
          </button>
        </div>
      </div>
    </div>
  );
}
