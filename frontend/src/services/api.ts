import { Incident, VideoSource, OcclusionZone, PipelineSettings, AnalyticsData } from '../types';

const BASE_URL = '';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.json();
}

export async function fetchSources(): Promise<{ active_source: string; sources: VideoSource[] }> {
  const res = await fetch(`${BASE_URL}/api/sources`);
  return res.json();
}

export async function selectSource(sourceId: string) {
  const res = await fetch(`${BASE_URL}/api/sources/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: sourceId }),
  });
  return res.json();
}

export async function uploadVideo(file: File, autoPlay = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('auto_play', String(autoPlay));

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function fetchIncidents(status?: string): Promise<Incident[]> {
  const url = status ? `${BASE_URL}/api/incidents?status=${status}` : `${BASE_URL}/api/incidents`;
  const res = await fetch(url);
  return res.json();
}

export async function acknowledgeIncident(id: string, status: string, notes?: string) {
  const res = await fetch(`${BASE_URL}/api/incidents/${id}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  return res.json();
}

export async function fetchZones(): Promise<OcclusionZone[]> {
  const res = await fetch(`${BASE_URL}/api/zones`);
  return res.json();
}

export async function saveZone(zone: OcclusionZone) {
  const res = await fetch(`${BASE_URL}/api/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zone),
  });
  return res.json();
}

export async function deleteZone(name: string) {
  const res = await fetch(`${BASE_URL}/api/zones/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchSettings(): Promise<PipelineSettings> {
  const res = await fetch(`${BASE_URL}/api/settings`);
  return res.json();
}

export async function updateSettings(settings: PipelineSettings) {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${BASE_URL}/api/analytics`);
  return res.json();
}
