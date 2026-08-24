import type { CameraProviderId } from '@/services/api/camera';

export const CAMERA_AGENT_PORT = 8787;

export type LabelZone = 'general' | 'reception_desk' | 'housekeeping';
export type StaffLabelRole = 'receptionist' | 'housekeeper';

export function getDefaultRtspPath(provider: CameraProviderId | ''): string {
  if (provider === 'kbvision') {
    return '/cam/realmonitor?channel=1&subtype=0';
  }
  return '/Streaming/Channels/101';
}

export function normalizeRtspPath(path: string, provider?: CameraProviderId | null): string {
  let value = String(path || '').trim();
  if (!value) return getDefaultRtspPath(provider || 'hikvision');
  if (!value.startsWith('/')) value = `/${value}`;
  if (/\/cam\/realmonitor/i.test(value) && !/[?&]subtype=/i.test(value)) {
    value += (value.includes('?') ? '&' : '?') + 'subtype=0';
  }
  return value;
}

export function normalizeAgentBaseUrl(input: string): string {
  let value = String(input || '').trim();
  if (!value) return '';
  value = value.replace(/:+$/, '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value;
}

export function buildAgentBaseUrlFromHost(hostOrUrl: string, port = CAMERA_AGENT_PORT): string {
  const raw = String(hostOrUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  const host = raw.replace(/\/+$/, '');
  if (/:\d+$/.test(host)) return `http://${host}`;
  return `http://${host}:${port}`;
}

export function getAgentHealthUrl(baseUrlOrHealthUrl: string): string {
  const normalized = normalizeAgentBaseUrl(baseUrlOrHealthUrl);
  if (!normalized) return '';
  if (/\/health$/i.test(normalized)) return normalized;
  return `${normalized}/health`;
}

export function isBlockedAgentApiUrl(baseUrl: string): boolean {
  const normalized = normalizeAgentBaseUrl(baseUrl);
  return /api\.phgrouptechs\.com$/i.test(normalized) || /api\.phhotel\.vn$/i.test(normalized);
}

export function isPrivateCameraIp(ip: string): boolean {
  const parts = String(ip || '').trim().split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => Number.isNaN(num) || num < 0 || num > 255)) return false;
  const [a, b] = nums;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function defaultRoleFromZone(zone?: string | null): StaffLabelRole {
  return zone === 'housekeeping' ? 'housekeeper' : 'receptionist';
}
