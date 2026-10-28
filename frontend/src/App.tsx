import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { LiveMonitorView } from './components/LiveMonitorView';
import { IncidentsView } from './components/IncidentsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ZonesSettingsView } from './components/ZonesSettingsView';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { useTelemetry } from './hooks/useTelemetry';
import { fetchSources, selectSource, fetchIncidents, acknowledgeIncident } from './services/api';
import type { VideoSource, Incident } from './types';
import { siren } from './utils/siren';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [activeSource, setActiveSource] = useState<string>('0');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [emergencyIncident, setEmergencyIncident] = useState<Incident | null>(null);
  const [isSirenMuted, setIsSirenMuted] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);

  // Set of dismissed/handled incident IDs to prevent WebSocket re-open spam
  const dismissedAlertsRef = useRef<Set<string>>(new Set());

  // Load available sources & incidents on launch
  const loadSources = useCallback(async () => {
    try {
      const data = await fetchSources();
      setSources(data.sources);
      if (data.active_source) {
        setActiveSource(data.active_source);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }
  }, []);

  useEffect(() => {
    loadSources();
    loadIncidents();
    const interval = setInterval(loadIncidents, 4000);
    return () => clearInterval(interval);
  }, [loadSources, loadIncidents]);

  // Cooldown map to prevent re-opening modal for the same track after dismissal
  const dismissedTracksRef = useRef<Map<number, number>>(new Map());

  // Handle incoming emergency alerts from WebSocket with snapshot and deduplication
  const handleEmergencyAlert = useCallback(
    (alert: any) => {
      const trackId = alert.track_id;
      const now = Date.now();

      // Check track-level suppression cooldown (suppress for 60 seconds once dismissed)
      const lastDismissedTime = dismissedTracksRef.current.get(trackId);
      if (lastDismissedTime && now - lastDismissedTime < 60000) {
        return;
      }

      const alertId = alert.incident_id || `INC-${trackId}-${alert.state}`;

      // If user previously dismissed or handled this incident ID, do not re-open modal
      if (dismissedAlertsRef.current.has(alertId)) {
        return;
      }

      // If already displaying an emergency modal, don't interrupt or override
      if (emergencyIncident !== null) {
        return;
      }

      // Check if this incident is already recorded in incidents list with a snapshot
      const existingRecorded = incidents.find(
        (inc) => inc.id === alert.incident_id || (inc.track_id === trackId && inc.snapshot_base64)
      );

      const incident: Incident = {
        id: alert.incident_id || `INC-LIVE-${now.toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        track_id: trackId,
        state: alert.state,
        confidence: alert.confidence || 0.95,
        torso_angle: alert.features?.torso_angle ?? 90.0,
        vertical_velocity: alert.features?.vertical_velocity ?? 0.0,
        vertical_acceleration: alert.features?.vertical_accel ?? 0.0,
        in_occlusion_zone: alert.info?.in_occlusion_zone || false,
        occlusion_zone_name: alert.info?.occlusion_zone || 'Floor Area',
        snapshot_base64: alert.snapshot_base64 || existingRecorded?.snapshot_base64 || null,
        status: 'NEW',
      };

      setEmergencyIncident(incident);

      if (!isSirenMuted) {
        siren.start();
        setIsSirenPlaying(true);
      }
      loadIncidents();
    },
    [emergencyIncident, isSirenMuted, incidents, loadIncidents]
  );

  const { telemetry, history, isConnected } = useTelemetry(handleEmergencyAlert);

  const handleSourceChange = async (sourceId: string) => {
    try {
      await selectSource(sourceId);
      setActiveSource(sourceId);
    } catch (err) {
      console.error('Failed to change source:', err);
    }
  };

  const handleStopSiren = () => {
    siren.stop();
    setIsSirenPlaying(false);
  };

  const handleToggleSirenMute = () => {
    if (!isSirenMuted) {
      handleStopSiren();
    }
    setIsSirenMuted(!isSirenMuted);
  };

  const handleDismissAlert = () => {
    if (emergencyIncident) {
      dismissedAlertsRef.current.add(emergencyIncident.id);
      dismissedAlertsRef.current.add(`INC-${emergencyIncident.track_id}-${emergencyIncident.state}`);
      dismissedTracksRef.current.set(emergencyIncident.track_id, Date.now());
    }
    handleStopSiren();
    setEmergencyIncident(null);
  };

  const handleDispatchEMS = async (id: string) => {
    dismissedAlertsRef.current.add(id);
    if (emergencyIncident) {
      dismissedAlertsRef.current.add(`INC-${emergencyIncident.track_id}-${emergencyIncident.state}`);
      dismissedTracksRef.current.set(emergencyIncident.track_id, Date.now());
    }
    handleStopSiren();
    setEmergencyIncident(null);
    await acknowledgeIncident(id, 'DISPATCHED', 'EMS unit dispatched.');
    loadIncidents();
  };

  const handleMarkFalseAlarm = async (id: string) => {
    dismissedAlertsRef.current.add(id);
    if (emergencyIncident) {
      dismissedAlertsRef.current.add(`INC-${emergencyIncident.track_id}-${emergencyIncident.state}`);
      dismissedTracksRef.current.set(emergencyIncident.track_id, Date.now());
    }
    handleStopSiren();
    setEmergencyIncident(null);
    await acknowledgeIncident(id, 'FALSE_ALARM', 'Operator verified false alarm.');
    loadIncidents();
  };

  const unacknowledgedCount = incidents.filter((i) => i.status === 'NEW').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Top Navigation Bar */}
      <Navbar
        fps={telemetry.fps}
        isConnected={isConnected}
        activeSource={activeSource}
        isSirenMuted={isSirenMuted}
        onToggleSirenMute={handleToggleSirenMute}
        unacknowledgedCount={unacknowledgedCount}
        onOpenIncidents={() => setActiveTab('incidents')}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unacknowledgedIncidents={unacknowledgedCount}
        />

        {/* Content View Container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'live' && (
            <LiveMonitorView
              telemetry={telemetry}
              history={history}
              sources={sources}
              activeSource={activeSource}
              onSourceChange={handleSourceChange}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsView incidents={incidents} onRefresh={loadIncidents} />
          )}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'zones' && <ZonesSettingsView />}
        </main>
      </div>

      {/* Emergency Audio-Visual Takeover Modal */}
      <EmergencyAlertModal
        incident={emergencyIncident}
        onDismiss={handleDismissAlert}
        onDispatchEMS={handleDispatchEMS}
        onMarkFalseAlarm={handleMarkFalseAlarm}
        onStopSiren={handleStopSiren}
        isSirenPlaying={isSirenPlaying}
      />
    </div>
  );
}

export default App;
