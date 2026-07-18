import { API_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type ImageFile = { uri: string; name?: string; type?: string };

export interface OpenClawDevicePairingItem {
  requestId?: string;
  deviceId?: string;
  clientId?: string;
  clientMode?: string;
  role?: string;
  roles?: string[];
  scopes?: string[];
  requestedAtMs?: number;
  updatedAtMs?: number;
  ts?: number;
  status?: string;
  [key: string]: any;
}

export interface OpenClawDevicePairingsResponse {
  success: boolean;
  pending: OpenClawDevicePairingItem[];
  paired: OpenClawDevicePairingItem[];
  summary?: {
    pendingCount: number;
    pairedCount: number;
  };
  message?: string;
}

export interface OpenClawApprovePairingResponse {
  success: boolean;
  message?: string;
  result?: {
    request?: OpenClawDevicePairingItem;
    approved?: any;
  };
}

class AiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.AI_BASE_URL;
    this.timeout = API_CONFIG.AI_TIMEOUT ?? API_CONFIG.TIMEOUT;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) return { Authorization: `Bearer ${token}` };
    } catch {}
    return {};
  }

  private async requestJson<T>(endpoint: string, options: { method?: 'GET' | 'POST'; body?: any; headers?: Record<string, string> } = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const authHeader = await this.getAuthHeader();
      const res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...authHeader,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async postForm<T>(endpoint: string, form: FormData): Promise<T> {
    const authHeader = await this.getAuthHeader();

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...authHeader,
        },
        body: form as any,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private getFileName(image: ImageFile, fallback: string) {
    if (image.name) return image.name;
    const fromUri = image.uri?.split('/').pop();
    return fromUri || fallback;
  }

  private async appendImage(form: FormData, field: string, image: ImageFile, fallbackName: string) {
    const name = this.getFileName(image, fallbackName);
    const type = image.type || 'image/jpeg';

    if (Platform.OS === 'web') {
      const response = await fetch(image.uri);
      const rawBlob = await response.blob();
      const blob = rawBlob.type ? rawBlob : new Blob([rawBlob], { type });
      form.append(field, blob, name);
      return;
    }

    form.append(field, {
      uri: image.uri,
      name,
      type,
    } as any);
  }

  async ocr(image: ImageFile): Promise<any> {
    const form = new FormData();
    await this.appendImage(form, 'file', image, 'image.jpg');
    return this.postForm('/ocr', form);
  }

  async ocrCard(front: ImageFile, back?: ImageFile): Promise<any> {
    const form = new FormData();
    await this.appendImage(form, 'front', front, 'front.jpg');
    if (back) {
      await this.appendImage(form, 'back', back, 'back.jpg');
    }
    return this.postForm('/ocr-card', form);
  }

  async chat(
    tenantId: string,
    question: string,
    context?: string,
    userRole?: string | null,
    userId?: string | null,
    userToken?: string | null,
    options?: {
      hotelId?: string | null;
      businessId?: string | null;
      apiUrl?: string | null;
    }
  ): Promise<{ answer?: string }> {
    const token = userToken || (await AsyncStorage.getItem('auth_token'));
    return this.requestJson('/chat', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        hotel_id: options?.hotelId || null,
        business_id: options?.businessId || null,
        question,
        context,
        user_role: userRole || null,
        user_id: userId || null,
        user_token: token || null,
        api_url: options?.apiUrl || API_CONFIG.BASE_URL,
      },
    });
  }

  async uploadDataset(tenantId: string, products: any[], botContext?: any): Promise<{ status?: string; num_products?: number }> {
    return this.requestJson('/dataset', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        products,
        bot_context: botContext,
      },
    });
  }

  async getFacebookOAuthUrl(tenantId: string): Promise<{ url?: string }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return this.requestJson(`/facebook/oauth-url?${params.toString()}`);
  }

  async getZaloOAuthUrl(tenantId: string): Promise<{ url?: string }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return this.requestJson(`/zalo/oauth-url?${params.toString()}`);
  }

  async getZaloOAs(tenantId: string): Promise<{ oas?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return this.requestJson(`/zalo/oas?${params.toString()}`);
  }

  async getZaloMessages(tenantId: string, oaId?: string): Promise<{ messages?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (oaId) params.append('oa_id', oaId);
    return this.requestJson(`/zalo/messages?${params.toString()}`);
  }

  async sendZaloMessage(tenantId: string, oaId: string, recipientId: string, text: string): Promise<any> {
    return this.requestJson('/zalo/send', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        oa_id: oaId,
        recipient_id: recipientId,
        text,
      },
    });
  }

  async getFacebookPages(tenantId: string): Promise<{ pages?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return this.requestJson(`/facebook/pages?${params.toString()}`);
  }

  async getFacebookMessages(tenantId: string, pageId?: string): Promise<{ messages?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (pageId) params.append('page_id', pageId);
    return this.requestJson(`/facebook/messages?${params.toString()}`);
  }

  async sendFacebookMessage(tenantId: string, pageId: string, recipientId: string, text: string): Promise<any> {
    return this.requestJson('/facebook/send', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        page_id: pageId,
        recipient_id: recipientId,
        text,
      },
    });
  }

  async connectTelegramBot(tenantId: string, botToken?: string): Promise<any> {
    return this.requestJson('/telegram/connect', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        bot_token: botToken?.trim() || undefined,
      },
    });
  }

  async getTelegramBots(tenantId: string): Promise<{ bots?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    return this.requestJson(`/telegram/bots?${params.toString()}`);
  }

  async getTelegramMessages(tenantId: string, botId?: string): Promise<{ messages?: any[] }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (botId) params.append('bot_id', botId);
    return this.requestJson(`/telegram/messages?${params.toString()}`);
  }

  async sendTelegramMessage(tenantId: string, botId: string, chatId: string, text: string): Promise<any> {
    return this.requestJson('/telegram/send', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        bot_id: botId,
        chat_id: chatId,
        text,
      },
    });
  }

  async toggleBot(tenantId: string, pageId: string, active: boolean): Promise<any> {
    return this.requestJson('/bot/toggle', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        page_id: pageId,
        active,
      },
    });
  }

  async getBotStatus(tenantId: string, pageId?: string): Promise<{ active?: boolean }> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (pageId) params.append('page_id', pageId);
    return this.requestJson(`/bot/status?${params.toString()}`);
  }

  async getOpenClawDevicePairings(params?: {
    clientId?: string;
    clientMode?: string;
    role?: string;
  }): Promise<OpenClawDevicePairingsResponse> {
    const authHeader = await this.getAuthHeader();
    const query = new URLSearchParams({
      clientId: params?.clientId || 'openclaw-control-ui',
      clientMode: params?.clientMode || 'ui',
      role: params?.role || 'operator',
    });
    const endpoint = `${API_CONFIG.BASE_URL}/ai-assistant/openclaw/device-pairings?${query.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...authHeader,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async approveOpenClawDevicePairing(payload?: {
    requestId?: string;
    clientId?: string;
    clientMode?: string;
    role?: string;
    scopes?: string[];
  }): Promise<OpenClawApprovePairingResponse> {
    const authHeader = await this.getAuthHeader();
    const endpoint = `${API_CONFIG.BASE_URL}/ai-assistant/openclaw/device-pairings/approve`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          requestId: payload?.requestId || null,
          clientId: payload?.clientId || 'openclaw-control-ui',
          clientMode: payload?.clientMode || 'ui',
          role: payload?.role || 'operator',
          scopes: Array.isArray(payload?.scopes) ? payload?.scopes : null,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  getWebSocketUrl(tenantId: string): string {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/ws/messages/${tenantId}`;
  }
}

export const aiApi = new AiClient();
