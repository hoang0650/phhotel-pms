import { apiClient } from './client';
import { API_CONFIG } from './config';
import { normalizeAgentBaseUrl, normalizeRtspPath } from '@/utils/camera-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CameraProviderId = 'hikvision' | 'kbvision';
export type CameraAccessMode = 'cloud' | 'agent';
export type LabelZone = 'general' | 'reception_desk' | 'housekeeping';
export type StaffLabelRole = 'receptionist' | 'housekeeper';

export interface StaffAssignment {
  staffId: string;
  name: string;
  role: StaffLabelRole;
}

export interface CameraAiConfig {
  enableOcr?: boolean;
  enableFaceRecognition?: boolean;
  enableGuestLabels?: boolean;
  enableStayEstimate?: boolean;
  autoCheckin?: boolean;
  labelZone?: LabelZone;
  staffAssignments?: StaffAssignment[];
}

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
  aiConfig?: CameraAiConfig;
}

export interface CameraDashboardPoint {
  totalStays?: number;
  roomsUsed?: number;
  uniqueGuests?: number;
  returningStays?: number;
  uniqueReturningGuests?: number;
}

export interface CameraDashboardStats {
  points?: CameraDashboardPoint[];
  lastPipeline?: {
    label?: Record<string, unknown>;
    at?: string;
    stages?: Record<string, unknown>;
  };
  totalGuestsToday?: number;
  checkedInToday?: number;
  matchedFaceToday?: number;
  occupancyRate?: number;
  recognizedToday?: number;
  totalRooms?: number;
  occupiedRooms?: number;
  vacantRooms?: number;
  [key: string]: unknown;
}

export interface AgentHealthResult {
  ok?: boolean;
  online?: boolean;
  message?: string;
  url?: string;
  data?: Record<string, unknown> | null;
}

const isNetworkError = (error: unknown): boolean =>
  error instanceof Error && (error.message === 'NETWORK_ERROR' || error.message === 'Request timeout');

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read snapshot'));
    reader.readAsDataURL(blob);
  });

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

export function buildCameraPayload(
  form: CameraConfig & { aiConfig?: CameraAiConfig },
  options?: { includePassword?: boolean }
): CameraConfig {
  const includePassword = options?.includePassword !== false;
  const payload: CameraConfig = {
    hotelId: form.hotelId,
    name: String(form.name || '').trim(),
    provider: form.provider,
    accessMode: form.accessMode || 'cloud',
    agentBaseUrl:
      form.accessMode === 'agent'
        ? normalizeAgentBaseUrl(String(form.agentBaseUrl || ''))
        : '',
    agentToken: form.accessMode === 'agent' ? String(form.agentToken || '').trim() : '',
    ipAddress: String(form.ipAddress || '').trim(),
    port: Number(form.port || 554),
    username: String(form.username || '').trim(),
    rtspPath: normalizeRtspPath(String(form.rtspPath || ''), form.provider),
    status: form.status || 'active',
    aiConfig: {
      enableOcr: form.aiConfig?.enableOcr !== false,
      enableFaceRecognition: !!form.aiConfig?.enableFaceRecognition,
      enableGuestLabels: form.aiConfig?.enableGuestLabels !== false,
      enableStayEstimate: form.aiConfig?.enableStayEstimate !== false,
      autoCheckin: !!form.aiConfig?.autoCheckin,
      labelZone: form.aiConfig?.labelZone || 'general',
      staffAssignments: form.aiConfig?.staffAssignments || [],
    },
  };

  if (includePassword && String(form.password || '').trim()) {
    payload.password = String(form.password);
  }

  return payload;
}

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
      throw error;
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
      throw error;
    }
  },

  async testAgent(agentBaseUrl: string, agentToken?: string): Promise<AgentHealthResult> {
    return apiClient.post<AgentHealthResult>('/cameras/agent-health', {
      agentBaseUrl: normalizeAgentBaseUrl(agentBaseUrl),
      agentToken: agentToken?.trim() || undefined,
    });
  },

  async assignStaffLabel(
    cameraId: string,
    payload: { staffId: string; role: StaffLabelRole; remove?: boolean; encoding?: number[] }
  ): Promise<CameraConfig | null> {
    try {
      const response = await apiClient.post<{ data?: CameraConfig }>(`/cameras/${cameraId}/assign-staff-label`, payload);
      return response?.data || null;
    } catch (error) {
      console.warn('[cameraApi.assignStaffLabel] Error:', error);
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

  async getSnapshotDataUrl(cameraId: string): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.BASE_URL}/cameras/${cameraId}/snapshot`, {
        headers: {
          Accept: 'image/jpeg',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`Snapshot HTTP ${response.status}`);
      }
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch (error) {
      console.warn('[cameraApi.getSnapshotDataUrl] Error:', error);
      throw error;
    }
  },

  async processFrameLive(cameraId: string, imageFrontBase64: string): Promise<Record<string, any> | null> {
    try {
      return await apiClient.post<Record<string, any>>('/cameras/process-frame', {
        cameraId,
        imageFrontBase64,
        liveMode: true,
      });
    } catch (error) {
      console.warn('[cameraApi.processFrameLive] Error:', error);
      return null;
    }
  },
};
