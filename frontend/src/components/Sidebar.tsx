import React from 'react';
import { Video, AlertOctagon, BarChart3, Sliders, Cpu } from 'lucide-react';

export type NavTab = 'live' | 'incidents' | 'analytics' | 'zones';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unacknowledgedIncidents: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unacknowledgedIncidents,
}) => {
  const navItems = [
    {
      id: 'live' as NavTab,
      label: 'Live Surveillance',
      icon: Video,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'incidents' as NavTab,
      label: 'Fall Incidents',
      icon: AlertOctagon,
      badge: unacknowledgedIncidents > 0 ? `${unacknowledgedIncidents} NEW` : undefined,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Health Biometrics',
      icon: BarChart3,
    },
    {
      id: 'zones' as NavTab,
      label: 'Zones & Detection AI',
      icon: Sliders,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0 shadow-xs">
      <div className="space-y-6">
        <div className="px-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Surveillance Hub
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Edge System Health Footer Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-800">YOLOv8 Edge AI</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            ACTIVE
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Real camera tracking with kinematic bone imputation.
        </p>
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Camera: <span className="text-slate-800 font-semibold">Webcam #0</span></span>
          <span className="font-semibold text-slate-700">17 Keypoints</span>
        </div>
      </div>
    </aside>
  );
};
