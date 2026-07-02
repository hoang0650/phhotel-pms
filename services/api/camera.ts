import { apiClient } from './client';

export type CameraProviderId = 'hikvision' | 'kbvision';
export type CameraAccessMode = 'cloud' | 'agent';

export interface CameraConfig {
  _id?: string;
  hotelId?: string;
  name?: string;
  provider?: CameraProviderId;
  accessMode?: CameraAccessMode;
  agentBaseUrl?: string;
  agentToken?: string;
  ipAddress?: string;
  port?: number;
  username?: string;
  password?: string;
  rtspPath?: string;
  status?: string;
  aiConfig?: {
    enableOcr?: boolean;
    enableFaceRecognition?: boolean;
    autoCheckin?: boolean;
  };
}

export interface CameraDashboardStats {
  totalGuestsToday?: number;
  checkedInToday?: number;
  matchedFaceToday?: number;
  occupancyRate?: number;
  recognizedToday?: number;
  totalRooms?: number;
  occupiedRooms?: number;
  vacantRooms?: number;
  [key: string]: any;
}

const isNetworkError = (error: unknown): boolean =>
  error instanceof Error && (error.message === 'NETWORK_ERROR' || error.message === 'Request timeout');

const buildQuery = (params: Record<string, string | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const cameraApi = {
  async getAll(hotelId: string): Promise<CameraConfig[]> {
    try {
      const response = await apiClient.get<{ data?: CameraConfig[] } | CameraConfig[]>(
        `/cameras${buildQuery({ hotelId })}`
      );
      if (Array.isArray(response)) return response;
      return Array.isArray(response?.data) ? response.data : [];
    } catch (error) {
      if (isNetworkError(error)) return [];
      console.warn('[cameraApi.getAll] Error:', error);
      return [];
    }
  },

  async save(payload: CameraConfig): Promise<CameraConfig | null> {
    try {
      const response = await apiClient.post<{ data?: CameraConfig } | CameraConfig>('/cameras', payload);
      if (response && !Array.isArray(response) && 'data' in response) {
        return response.data || null;
      }
      return (response as CameraConfig) || null;
    } catch (error) {
      console.warn('[cameraApi.save] Error:', error);
      return null;
    }
  },

  async update(id: string, payload: CameraConfig): Promise<CameraConfig | null> {
    try {
      const response = await apiClient.put<{ data?: CameraConfig } | CameraConfig>(`/cameras/${id}`, payload);
      if (response && !Array.isArray(response) && 'data' in response) {
        return response.data || null;
      }
      return (response as CameraConfig) || null;
    } catch (error) {
      console.warn('[cameraApi.update] Error:', error);
      return null;
    }
  },

  async testAgent(baseUrl: string, agentToken?: string): Promise<any> {
    try {
      return await apiClient.post('/cameras/agent-health', {
        baseUrl,
        agentToken,
      });
    } catch (error) {
      console.warn('[cameraApi.testAgent] Error:', error);
      throw error;
    }
  },

  async getDashboardStats(hotelId: string, period: 'day' | 'week' | 'month'): Promise<CameraDashboardStats | null> {
    try {
      const response = await apiClient.get<CameraDashboardStats>(
        `/guests/camera-dashboard${buildQuery({ hotelId, period })}`
      );
      return response || null;
    } catch (error) {
      if (isNetworkError(error)) return null;
      console.warn('[cameraApi.getDashboardStats] Error:', error);
      return null;
    }
  },
};
