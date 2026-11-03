const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

export const riderApi = {
  createRequest: (pickupZone: number, dropoffZone: number, riderId: string) =>
    request('/api/rider/request', {
      method: 'POST',
      body: JSON.stringify({
        pickup_zone_id: pickupZone,
        dropoff_zone_id: dropoffZone,
        rider_id: riderId,
      }),
    }),

  getStatus: (requestId: string) =>
    request(`/api/rider/status/${requestId}`),

  cancel: (requestId: string) =>
    request(`/api/rider/cancel/${requestId}`, { method: 'POST' }),

  chat: (message: string, riderId: string) =>
    request('/api/rider/chat', {
      method: 'POST',
      body: JSON.stringify({ message, rider_id: riderId }),
    }),
};

export const driverApi = {
  getHint: (driverId: string) =>
    request(`/api/driver/hint/${driverId}`),

  acceptHint: (driverId: string, hintId?: string) =>
    request('/api/driver/hint/accept', {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId, accepted: true, hint_id: hintId }),
    }),

  rejectHint: (driverId: string, hintId?: string) =>
    request('/api/driver/hint/reject', {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId, accepted: false, hint_id: hintId }),
    }),

  getEarnings: (driverId: string) =>
    request(`/api/driver/earnings/${driverId}`),

  chat: (message: string, driverId: string) =>
    request('/api/driver/chat', {
      method: 'POST',
      body: JSON.stringify({ message, driver_id: driverId }),
    }),
};

export const adminApi = {
  getState: () => request('/api/admin/state'),
  triggerScenario: (name: string) =>
    request(`/api/admin/scenario/${name}`, { method: 'POST' }),
  getMetrics: () => request('/api/admin/metrics'),
  getLlmHealth: () => request('/api/admin/llm_health'),
  reset: () => request('/api/admin/reset', { method: 'POST' }),
};
