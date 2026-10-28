import React, { useState } from 'react';
import {
  AlertOctagon,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  PhoneCall,
  Clock,
  MapPin
} from 'lucide-react';
import type { Incident } from '../types';
import { acknowledgeIncident } from '../services/api';

interface IncidentsViewProps {
  incidents: Incident[];
  onRefresh: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ incidents, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(inc.track_id).includes(searchTerm) ||
      (inc.occlusion_zone_name && inc.occlusion_zone_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await acknowledgeIncident(id, newStatus);
      onRefresh();
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err) {
      console.error('Failed to acknowledge incident:', err);
    }
  };

  const exportCSV = () => {
    const headers = ['Incident ID', 'Timestamp', 'Track ID', 'State', 'Torso Angle', 'Velocity', 'Zone', 'Status'];
    const rows = filteredIncidents.map((inc) => [
      inc.id,
      inc.timestamp,
      inc.track_id,
      inc.state,
      inc.torso_angle,
      inc.vertical_velocity,
      inc.occlusion_zone_name || 'N/A',
      inc.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fall_incidents_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse font-bold';
      case 'DISPATCHED':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold';
      case 'ACKNOWLEDGED':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
      case 'FALSE_ALARM':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 font-heading">Incident Logs & Audit Records</h1>
            <p className="text-xs text-slate-500">Live emergency events recorded from camera surveillance</p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-600" />
          <span>Export CSV Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search by ID, Track #, or Zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Alerts</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_ALARM">False Alarm</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-2xl glass-panel overflow-hidden border border-slate-200">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No incident events recorded yet. The system is actively monitoring camera feed for falls.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Torso Angle</th>
                  <th className="py-3 px-4">Zone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {inc.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-bold">
                      Person #{inc.track_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-rose-600">{inc.state}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {inc.torso_angle}°
                    </td>
                    <td className="py-3 px-4 text-slate-600 flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      {inc.occlusion_zone_name || 'Floor'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="View Snapshot & Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(inc.id, 'DISPATCHED')}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                        title="Dispatch Caregiver"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(inc.id, 'RESOLVED')}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                        title="Resolve"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-heading">
                Incident Snapshot — {selectedIncident.id}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video flex items-center justify-center">
              {selectedIncident.snapshot_base64 ? (
                <img
                  src={`data:image/jpeg;base64,${selectedIncident.snapshot_base64}`}
                  alt="Incident snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">No snapshot recorded for this entry</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Torso Angle at Fall:</span>
                <p className="font-bold text-rose-600 font-mono text-sm mt-0.5">{selectedIncident.torso_angle}°</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-medium">Vertical Impact Velocity:</span>
                <p className="font-bold text-amber-700 font-mono text-sm mt-0.5">{selectedIncident.vertical_velocity} px/s</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleStatusChange(selectedIncident.id, 'DISPATCHED')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                Dispatch Response
              </button>
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
