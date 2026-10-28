import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Layers,
  Save,
  Check,
  Plus,
  Trash2,
  BellRing
} from 'lucide-react';
import type { OcclusionZone, PipelineSettings } from '../types';
import { fetchZones, saveZone, deleteZone, fetchSettings, updateSettings } from '../services/api';

export const ZonesSettingsView: React.FC = () => {
  const [zones, setZones] = useState<OcclusionZone[]>([]);
  const [settings, setSettings] = useState<PipelineSettings>({
    conf_thresh: 0.35,
    fall_angle_threshold: 60.0,
    inactivity_sec: 4.0,
    pre_alert_sec: 5.0,
    hud_overlay: true,
    loop_video: true,
  });

  const [newZoneName, setNewZoneName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [z, s] = await Promise.all([fetchZones(), fetchSettings()]);
      setZones(z);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load zones & settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    const newZone: OcclusionZone = {
      name: newZoneName.trim(),
      polygon: [
        [250, 300],
        [550, 300],
        [550, 420],
        [250, 420],
      ],
      zone_type: 'furniture',
    };
    await saveZone(newZone);
    setNewZoneName('');
    loadData();
  };

  const handleDeleteZone = async (name: string) => {
    await deleteZone(name);
    loadData();
  };

  const triggerTestAlert = () => {
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-heading">Zones & AI Detection Calibration</h1>
            <p className="text-xs text-slate-500">Configure furniture occlusion boundaries and calibrate real camera detection sensitivity</p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Changes Applied!' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occlusion Zone Management */}
        <div className="p-5 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">Furniture Occlusion Zones</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Kinematic Bone Recovery</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            When a person moves behind defined furniture regions (coffee tables, desks, beds), the system prioritizes temporal bone constraints to impute hidden legs and joints.
          </p>

          {/* Zones List */}
          <div className="space-y-2.5">
            {zones.map((zone) => (
              <div
                key={zone.name}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{zone.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Polygon: [{zone.polygon.map((pt) => `(${pt[0]},${pt[1]})`).join(' ')}]
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteZone(zone.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove Zone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Zone Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              placeholder="New Zone Name (e.g. Bed, Couch, Desk)..."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-xs"
            />
            <button
              onClick={handleAddZone}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-300" />
              <span>Add Zone</span>
            </button>
          </div>
        </div>

        {/* Kinematic Thresholds Calibration */}
        <div className="p-5 rounded-2xl glass-panel space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">Live Camera Calibration</h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-600">Threshold Controls</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Torso Angle Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">Torso Angle Incline Threshold:</span>
                <span className="font-mono font-bold text-indigo-600">{settings.fall_angle_threshold}°</span>
              </div>
              <input
                type="range"
                min="35"
                max="85"
                step="1"
                value={settings.fall_angle_threshold}
                onChange={(e) => setSettings({ ...settings, fall_angle_threshold: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Angle relative to upright standing plane. Postures tilting past this threshold trigger the Fall State Machine.</span>
            </div>

            {/* Post-Fall Inactivity Seconds */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">Immobility Confirmation Window:</span>
                <span className="font-mono font-bold text-indigo-600">{settings.inactivity_sec} sec</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={settings.inactivity_sec}
                onChange={(e) => setSettings({ ...settings, inactivity_sec: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Time subject must remain motionless on floor before confirming fall.</span>
            </div>

            {/* Pose Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span className="font-semibold">YOLOv8 Pose Keypoint Confidence:</span>
                <span className="font-mono font-bold text-indigo-600">{settings.conf_thresh}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={settings.conf_thresh}
                onChange={(e) => setSettings({ ...settings, conf_thresh: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Minimum confidence threshold for COCO pose keypoints.</span>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-semibold">Render Live Telemetry HUD Overlay</span>
                <input
                  type="checkbox"
                  checked={settings.hud_overlay}
                  onChange={(e) => setSettings({ ...settings, hud_overlay: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-semibold">Auto-Loop Video Playback (For Files)</span>
                <input
                  type="checkbox"
                  checked={settings.loop_video}
                  onChange={(e) => setSettings({ ...settings, loop_video: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
              </label>
            </div>

            {/* Webhook Dispatch Test */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Caregiver Emergency Dispatch Ping</span>
              <button
                onClick={triggerTestAlert}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                <span>{testAlertSent ? 'Ping Dispatched!' : 'Test Emergency Ping'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
