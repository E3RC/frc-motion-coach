import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('API Client', () => {
  it('getStatus returns status data', async () => {
    mockFetch.mockResolvedValue(mockResponse({ status: 'ok', version: '1.0.0', name: 'FRC Motion Coach' }));
    const result = await api.getStatus();
    expect(result.status).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith('/api/status', expect.any(Object));
  });

  it('listCameras returns camera list', async () => {
    mockFetch.mockResolvedValue(mockResponse([{ id: 0, name: 'Camera 0', backend: 'USB' }]));
    const result = await api.listCameras();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('Camera 0');
  });

  it('getRuns returns run list', async () => {
    mockFetch.mockResolvedValue(mockResponse([{ id: 1, name: 'Test Run', duration_s: 10 }]));
    const result = await api.getRuns();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Test Run');
  });

  it('deleteRun sends DELETE request', async () => {
    mockFetch.mockResolvedValue(mockResponse({ status: 'ok', run_id: 1 }));
    const result = await api.deleteRun(1);
    expect(result.status).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith('/api/runs/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('getSettings returns settings', async () => {
    mockFetch.mockResolvedValue(mockResponse({ tracking_mode: 'aruco', camera_id: 0 }));
    const result = await api.getSettings();
    expect(result.tracking_mode).toBe('aruco');
  });

  it('updateSettings sends POST with data', async () => {
    mockFetch.mockResolvedValue(mockResponse({ status: 'ok' }));
    const result = await api.updateSettings({ tracking_mode: 'yolo' });
    expect(result.status).toBe('ok');
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.tracking_mode).toBe('yolo');
  });

  it('handles API error', async () => {
    mockFetch.mockResolvedValue(mockResponse({ detail: 'Not found' }, false, 404));
    await expect(api.getRun(999)).rejects.toThrow('API error 404');
  });
});
