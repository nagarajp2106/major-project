import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Clock,
  TrendingDown,
  HeartPulse
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import type { AnalyticsData } from '../types';
import { fetchAnalytics } from '../services/api';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    total_incidents: 0,
    confirmed_falls: 0,
    dispatched_count: 0,
    false_alarm_count: 0,
    recovery_rate_percent: 0.0,
    monitored_hours: 0.0,
    posture_distribution: [
      { name: 'Upright / Active Monitoring', percentage: 0, color: '#10B981' },
      { name: 'Dynamic Transitions', percentage: 0, color: '#F59E0B' },
      { name: 'Fall Incidents', percentage: 0, color: '#EF4444' },
    ],
  });

  const loadData = () => {
    fetchAnalytics().then(setData).catch(console.error);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalFrames = (data as any).total_frames_processed || 0;
  const monitoredSecs = (data as any).monitored_seconds || 0;

  // Real breakdown chart of monitored frames
  const sessionFrameData = [
    { name: 'Active Monitoring', count: Math.round(totalFrames * (data.posture_distribution[0]?.percentage || 0) / 100) },
    { name: 'Transitions', count: Math.round(totalFrames * (data.posture_distribution[1]?.percentage || 0) / 100) },
    { name: 'Falls', count: Math.round(totalFrames * (data.posture_distribution[2]?.percentage || 0) / 100) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-panel flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-heading">Real-Time Biometrics & Posture Tracking</h1>
            <p className="text-xs text-slate-500">Live statistics computed directly from current camera session frames (Zero mock data)</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Session Monitored Time</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {monitoredSecs >= 60 ? `${(monitoredSecs / 60).toFixed(1)} min` : `${monitoredSecs} sec`}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            {totalFrames} frames processed live
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Verified Fall Incidents</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600">{data.confirmed_falls}</p>
          <span className="text-[11px] text-slate-500 font-medium">{data.dispatched_count} Caregiver Dispatches</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Occlusion Recovery Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600">{data.recovery_rate_percent}%</p>
          <span className="text-[11px] text-slate-500 font-medium">Real Keypoints Imputed</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Logged Alerts</span>
            <HeartPulse className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-indigo-600">{data.total_incidents}</p>
          <span className="text-[11px] text-slate-500 font-medium">
            {data.false_alarm_count} False Alarm Rejections
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posture Distribution */}
        <div className="p-5 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">Live Posture Breakdown (% of tracked frames)</h3>
            <span className="text-xs text-slate-500 font-medium">Current Camera Session</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {totalFrames === 0 ? (
              <div className="text-xs text-slate-400">Awaiting camera frame tracking data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.posture_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="percentage"
                  >
                    {data.posture_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {data.posture_distribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 font-medium">{item.name}</span>
                <span className="font-mono font-bold text-slate-800 ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Real Posture Frame Counts Bar Chart */}
        <div className="p-5 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">Tracked Posture Frame Counts</h3>
            <span className="text-xs text-indigo-600 font-semibold">{totalFrames} Total Frames</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionFrameData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Frames" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 leading-relaxed font-medium">
            Real kinematic frame counters reflecting true human posture transitions processed by the edge YOLOv8 pose detector.
          </p>
        </div>
      </div>
    </div>
  );
};
