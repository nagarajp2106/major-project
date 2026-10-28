import React, { useEffect } from 'react';
import { AlertTriangle, PhoneCall, CheckCircle2, XCircle, VolumeX, Clock, MapPin, X } from 'lucide-react';
import type { Incident } from '../types';

interface EmergencyAlertModalProps {
  incident: Incident | null;
  onDismiss: () => void;
  onDispatchEMS: (incidentId: string) => void;
  onMarkFalseAlarm: (incidentId: string) => void;
  onStopSiren: () => void;
  isSirenPlaying: boolean;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  incident,
  onDismiss,
  onDispatchEMS,
  onMarkFalseAlarm,
  onStopSiren,
  isSirenPlaying,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && incident) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incident, onDismiss]);

  if (!incident) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white border-2 border-rose-500 shadow-2xl overflow-hidden animate-emergency"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs animate-bounce">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
                CRITICAL FALL DETECTED
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-white/25 font-mono">
                  {incident.id}
                </span>
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                Real-Time Kinematic State Machine: Immobility Confirmed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Siren Stop button */}
            {isSirenPlaying && (
              <button
                onClick={onStopSiren}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                <span>Silence Siren</span>
              </button>
            )}

            {/* Explicit Close Button */}
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-black/25 hover:bg-black/45 text-white transition-colors cursor-pointer flex items-center justify-center"
              title="Close Alert (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Snapshot Preview */}
            <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center relative shadow-sm">
              {incident.snapshot_base64 ? (
                <img
                  src={`data:image/jpeg;base64,${incident.snapshot_base64}`}
                  alt="Incident snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={`/api/snapshot?t=${Date.now()}`}
                  alt="Live Camera Snapshot"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/api/stream?t=${Date.now()}`;
                  }}
                />
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                {new Date(incident.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {/* Vital Telemetry */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Subject Target ID</span>
                  <span className="text-slate-900 font-mono font-bold">Person #{incident.track_id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Torso Incline Angle</span>
                  <span className="text-rose-600 font-mono font-bold">{incident.torso_angle}° (Crit: &lt;55°)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Vertical Velocity</span>
                  <span className="text-amber-700 font-mono font-bold">{incident.vertical_velocity} px/s</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Location Zone</span>
                  <span className="text-indigo-700 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    {incident.occlusion_zone_name || 'Camera Floor Area'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                ⚠️ Person is currently horizontal with zero movement detected over the last 4.0 seconds. Immediate caregiver check advised.
              </div>
            </div>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => onDispatchEMS(incident.id)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Dispatch EMS (911)</span>
            </button>

            <button
              onClick={() => onDispatchEMS(incident.id)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acknowledge & Caregiver</span>
            </button>

            <button
              onClick={() => onMarkFalseAlarm(incident.id)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all border border-slate-300 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>False Alarm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
