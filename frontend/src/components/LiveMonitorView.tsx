import React, { useRef } from 'react';
import {
  Video,
  RotateCcw,
  Upload,
  Maximize2,
  Gauge,
  Activity,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { TelemetryData, VideoSource } from '../types';
import type { TelemetryHistoryPoint } from '../hooks/useTelemetry';
import { uploadVideo } from '../services/api';

interface LiveMonitorViewProps {
  telemetry: TelemetryData;
  history: TelemetryHistoryPoint[];
  sources: VideoSource[];
  activeSource: string;
  onSourceChange: (sourceId: string) => void;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  telemetry,
  history,
  sources,
  activeSource,
  onSourceChange,
}) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = React.useState(false);

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);
    try {
      const res = await uploadVideo(file, true);
      if (res.status === 'success') {
        onSourceChange(res.file_path);
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
    } finally {
      setUploadProgress(false);
    }
  };

  const primaryTrack = telemetry.tracks[0];
  const torsoAngle = primaryTrack ? primaryTrack.torso_angle : 0;
  const velocity = primaryTrack ? primaryTrack.vertical_velocity : 0;
  const accel = primaryTrack ? primaryTrack.vertical_acceleration : 0;
  const occlusionRate = primaryTrack ? primaryTrack.occlusion_rate : 0;

  const getAngleColor = (ang: number) => {
    if (ang >= 60) return 'text-rose-600';
    if (ang >= 45) return 'text-amber-600';
    if (ang >= 25) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'CONFIRMED_FALL':
        return 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse font-bold';
      case 'FALL_DETECTED':
      case 'IMPACT':
        return 'bg-red-100 text-red-700 border-red-300 font-bold';
      case 'RAPID_DESCENT':
      case 'INACTIVITY_CHECK':
      case 'PRE_ALERT':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'MONITORING':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-heading">Live Camera Feed & Surveillance</h1>
            <p className="text-xs text-slate-500">Real-time YOLOv8-Pose 17-Keypoint Detection & Kinematic Tracking</p>
          </div>
        </div>

        {/* Source Switcher & Upload */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <select
              value={activeSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-9 text-xs font-semibold text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[220px] shadow-xs"
            >
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>{uploadProgress ? 'Processing...' : 'Upload Video'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => onSourceChange(activeSource)}
            title="Restart Stream"
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-300 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Stream Player & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Canvas (2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div
            ref={videoContainerRef}
            className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 aspect-video flex items-center justify-center shadow-lg"
          >
            {/* Live MJPEG Stream */}
            <img
              src="/api/stream"
              alt="Live Fall Detection Stream"
              className="w-full h-full object-contain select-none"
              onError={(e) => {
                setTimeout(() => {
                  (e.target as HTMLImageElement).src = `/api/stream?t=${Date.now()}`;
                }, 3000);
              }}
            />

            {/* Stream HUD Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE CAMERA
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-mono font-bold text-cyan-300 border border-slate-700">
                {telemetry.fps.toFixed(1)} FPS
              </span>
              <span className="hidden sm:inline px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-medium text-slate-200 border border-slate-700">
                Source: {activeSource === '0' ? 'Webcam #0' : activeSource}
              </span>
            </div>

            {/* Fullscreen Button */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-black/75 backdrop-blur-md text-slate-200 hover:text-white border border-slate-700 hover:bg-black/90 transition-colors cursor-pointer"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Real-Time Kinematic Rolling Chart */}
          <div className="p-4 rounded-2xl glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">Live Kinematic Rolling Telemetry</h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  Torso Angle (°)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                  Velocity (px/s)
                </span>
              </div>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="angleGradientLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="velGradientLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="angle"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#angleGradientLight)"
                    name="Torso Angle"
                  />
                  <Area
                    type="monotone"
                    dataKey="velocity"
                    stroke="#0891b2"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#velGradientLight)"
                    name="Velocity"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Dials & Active Targets */}
        <div className="space-y-4">
          {/* Kinematics Gauges Card */}
          <div className="p-4 rounded-2xl glass-panel space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">Biomechanical Telemetry</h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                {primaryTrack ? `Person #${primaryTrack.track_id}` : 'No Subject'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Torso Angle Gauge */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-xs text-slate-500 font-medium">Torso Incline</span>
                <div className="my-2">
                  <span className={`text-2xl font-bold font-mono ${getAngleColor(torsoAngle)}`}>
                    {torsoAngle.toFixed(1)}°
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      torsoAngle >= 60 ? 'bg-rose-500' : torsoAngle >= 45 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (torsoAngle / 90) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">Fall Limit: &gt;60°</span>
              </div>

              {/* Vertical Velocity */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-xs text-slate-500 font-medium">Vertical Velocity</span>
                <div className="my-2">
                  <span className="text-2xl font-bold font-mono text-cyan-700">
                    {velocity.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Pixels / sec</span>
              </div>

              {/* Impact Acceleration */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-xs text-slate-500 font-medium">Impact Accel</span>
                <div className="my-2">
                  <span className="text-xl font-bold font-mono text-indigo-700">
                    {accel.toFixed(2)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Peak G-Shock</span>
              </div>

              {/* Occlusion Imputation Rate */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-xs text-slate-500 font-medium">Occlusion Rate</span>
                <div className="my-2">
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {occlusionRate.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Joints Recovered</span>
              </div>
            </div>
          </div>

          {/* Active Tracklets List */}
          <div className="p-4 rounded-2xl glass-panel space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">Active Detected Subjects</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono border border-slate-200">
                {telemetry.tracks.length} In Frame
              </span>
            </div>

            {telemetry.tracks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Scanning camera frame for human silhouettes...
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {telemetry.tracks.map((track) => (
                  <div
                    key={track.track_id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">Person #{track.track_id}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStateBadge(
                            track.state
                          )}`}
                        >
                          {track.state}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        Angle: <span className="text-slate-800 font-mono font-bold">{track.torso_angle}°</span> • Zone:{' '}
                        <span className="text-indigo-600 font-semibold">{track.occlusion_zone_name || 'Floor'}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-cyan-700">{track.vertical_velocity} px/s</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
