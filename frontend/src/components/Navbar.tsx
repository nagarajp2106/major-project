import React from 'react';
import { Shield, Bell, Volume2, VolumeX, Radio, Activity } from 'lucide-react';

interface NavbarProps {
  fps: number;
  isConnected: boolean;
  activeSource: string;
  isSirenMuted: boolean;
  onToggleSirenMute: () => void;
  unacknowledgedCount: number;
  onOpenIncidents: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fps,
  isConnected,
  activeSource,
  isSirenMuted,
  onToggleSirenMute,
  unacknowledgedCount,
  onOpenIncidents,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-900 tracking-tight font-heading">AegisFall</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              AI SAAS
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Kinematic Fall Surveillance & Occlusion Engine</p>
        </div>
      </div>

      {/* Stream & System Status Indicators */}
      <div className="flex items-center gap-4">
        {/* Connection & FPS Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            )}
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {isConnected ? 'LIVE FEED' : 'OFFLINE'}
          </span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-indigo-600">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>{fps.toFixed(1)} FPS</span>
          </div>
        </div>

        {/* Active Source Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
          <Radio className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-500">Camera:</span>
          <span className="text-slate-900 font-semibold truncate max-w-[160px]">{activeSource === '0' ? 'Real Webcam #0' : activeSource}</span>
        </div>

        {/* Siren Sound Toggle */}
        <button
          onClick={onToggleSirenMute}
          title={isSirenMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            isSirenMuted
              ? 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isSirenMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Unread Alerts Bell */}
        <button
          onClick={onOpenIncidents}
          className="relative p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center animate-pulse shadow-sm">
              {unacknowledgedCount}
            </span>
          )}
        </button>

        {/* User / Caregiver Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            OP
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Security Console</p>
            <p className="text-[10px] text-slate-500 leading-none mt-1">Live Camera Feed</p>
          </div>
        </div>
      </div>
    </header>
  );
};
