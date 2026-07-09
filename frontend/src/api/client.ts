const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export interface CameraInfo {
  id: number;
  name: string;
  backend: string;
}

export interface CalibrationSummary {
  id: number;
  name: string;
  field_type: string;
  field_width: number;
  field_length: number;
  created_at: string;
}

export interface RunSummary {
  id: number;
  name: string;
  driver: string;
  robot_config: string;
  practice_type: string;
  session_id: number | null;
  created_at: string;
  duration_s: number;
  max_speed_ft_per_s: number;
  avg_moving_speed_ft_per_s: number;
  peak_estimated_g: number;
  total_distance_ft: number;
  time_moving_s: number;
  time_stopped_s: number;
  sample_count: number;
}

export interface SessionSummary {
  id: number;
  name: string;
  practice_type: string;
  driver: string;
  robot_config: string;
  team: string;
  notes: string;
  session_date: string;
  created_at: string;
  run_count: number;
}

export interface SessionDetail extends SessionSummary {
  runs: { id: number; name: string; driver: string; created_at: string }[];
}

export interface SessionCreateRequest {
  name: string;
  practice_type?: string;
  driver?: string;
  robot_config?: string;
  team?: string;
  notes?: string;
  session_date?: string;
}

export interface RunDetail {
  id: number;
  name: string;
  driver: string;
  robot_config: string;
  practice_type: string;
  session_id: number | null;
  created_at: string;
  notes: string;
  summary_metrics: Record<string, number>;
}

export interface TrackingSample {
  timestamp: number;
  frame_number: number;
  field_x: number;
  field_y: number;
  speed: number;
  acceleration: number;
  estimated_g: number;
  confidence: number;
  state: string;
}

export const api = {
  getStatus: () => request<{ status: string; version: string; name: string }>('/status'),

  listCameras: () => request<CameraInfo[]>('/cameras'),

  getCalibrations: () => request<CalibrationSummary[]>('/calibrations'),
  getCalibration: (id: number) => request<any>(`/calibrations/${id}`),
  saveCalibration: (data: any) =>
    request<{ status: string; calibration_id: number }>('/calibration/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startRun: (data: any) =>
    request<{ status: string; run_id: number }>('/runs/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  stopRun: (summary: any) =>
    request<{ status: string; run_id: number }>('/runs/stop', {
      method: 'POST',
      body: JSON.stringify({ summary_metrics: summary }),
    }),

  getRuns: () => request<RunSummary[]>('/runs'),
  deleteRun: (id: number) =>
    request<{ status: string; run_id: number }>(`/runs/${id}`, {
      method: 'DELETE',
    }),
  getRun: (id: number) => request<RunDetail>(`/runs/${id}`),
  getSamples: (id: number) => request<TrackingSample[]>(`/runs/${id}/samples`),
  getRunSummary: (id: number) => request<Record<string, number>>(`/runs/${id}/summary`),

  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<{ status: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startTracking: () =>
    request<{ status: string }>('/tracking/start', { method: 'POST' }),
  stopTracking: () =>
    request<{ status: string }>('/tracking/stop', { method: 'POST' }),
  getTrackingFrame: () => request<any>('/tracking/frame'),
  getTrackingSummary: () => request<any>('/tracking/summary'),
  calibrateFrame: (imagePoints: number[][], fieldPoints: number[][]) =>
    request<any>(`/tracking/calibrate?image_points=${JSON.stringify(imagePoints)}&field_points=${JSON.stringify(fieldPoints)}`, {
      method: 'POST',
    }),
  resetTracking: () =>
    request<{ status: string }>('/tracking/reset', { method: 'POST' }),

  // Multi-robot
  getRobots: () => request<{ robots: any[] }>('/tracking/robots'),
  getRobotSummaries: () => request<{ summaries: any[] }>('/tracking/robot-summaries'),
  setTargetMarkers: (markerIds: number[]) =>
    request<{ status: string }>('/tracking/set-target-markers', {
      method: 'POST',
      body: JSON.stringify({ marker_ids: markerIds }),
    }),

  // Video recording
  startRecording: () => request<{ status: string; path: string }>('/recording/start', { method: 'POST' }),
  stopRecording: () => request<{ status: string; path: string }>('/recording/stop', { method: 'POST' }),

  // Camera calibration (lens distortion)
  detectChessboard: () => request<{ success: boolean; count: number }>('/camera-calibration/detect-chessboard', { method: 'POST' }),
  runCameraCalibration: () => request<{ success: boolean; reprojection_error?: number; error?: string }>('/camera-calibration/calibrate', { method: 'POST' }),
  getCameraCalibrationStatus: () => request<{ calibrated: boolean; calibration: any }>('/camera-calibration/status'),

  // Heatmap
  getHeatmap: (runIds?: string) => request<any>(`/heatmap${runIds ? `?run_ids=${runIds}` : ''}`),

  // NetworkTables
  getNTStatus: () => request<any>('/networktables/status'),
  connectNT: (server: string) =>
    request<{ status: string }>('/networktables/connect', {
      method: 'POST',
      body: JSON.stringify({ server }),
    }),
  disconnectNT: () => request<{ status: string }>('/networktables/disconnect', { method: 'POST' }),

  // Sessions
  getSessions: () => request<SessionSummary[]>('/sessions'),
  getSession: (id: number) => request<SessionDetail>(`/sessions/${id}`),
  createSession: (data: SessionCreateRequest) =>
    request<{ status: string; session_id: number }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSession: (id: number, data: Partial<SessionCreateRequest>) =>
    request<{ status: string }>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteSession: (id: number) =>
    request<{ status: string; session_id: number }>(`/sessions/${id}`, {
      method: 'DELETE',
    }),
};
