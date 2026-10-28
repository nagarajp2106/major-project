export interface Tracklet {
  track_id: number;
  bbox: [number, number, number, number];
  state: 'MONITORING' | 'RAPID_DESCENT' | 'FALL_DETECTED' | 'IMPACT' | 'INACTIVITY_CHECK' | 'PRE_ALERT' | 'CONFIRMED_FALL';
  torso_angle: number;
  vertical_velocity: number;
  vertical_acceleration: number;
  aspect_ratio: number;
  occlusion_rate: number;
  in_occlusion_zone: boolean;
  occlusion_zone_name?: string | null;
}

export interface TelemetryData {
  fps: number;
  status: string;
  source: string;
  frame_index: number;
  active_tracks_count: number;
  tracks: Tracklet[];
  alerts: any[];
}

export interface Incident {
  id: string;
  timestamp: string;
  track_id: number;
  state: string;
  confidence: number;
  torso_angle: number;
  vertical_velocity: number;
  vertical_acceleration: number;
  in_occlusion_zone: boolean;
  occlusion_zone_name?: string | null;
  snapshot_base64?: string | null;
  status: 'NEW' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';
  notes?: string;
}

export interface VideoSource {
  id: string;
  name: string;
  type: 'demo' | 'webcam' | 'file';
  size_mb: number;
}

export interface OcclusionZone {
  name: string;
  polygon: [number, number][];
  zone_type: string;
}

export interface PipelineSettings {
  conf_thresh: number;
  fall_angle_threshold: number;
  inactivity_sec: number;
  pre_alert_sec: number;
  hud_overlay: boolean;
  loop_video: boolean;
}

export interface AnalyticsData {
  total_incidents: number;
  confirmed_falls: number;
  dispatched_count: number;
  false_alarm_count: number;
  recovery_rate_percent: number;
  monitored_hours: number;
  posture_distribution: {
    name: string;
    percentage: number;
    color: string;
  }[];
}
