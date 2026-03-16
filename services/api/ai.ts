import { API_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type ImageFile = { uri: string; name?: string; type?: string };

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
    userToken?: string | null
  ): Promise<{ answer?: string }> {
    const token = userToken || (await AsyncStorage.getItem('auth_token'));
    return this.requestJson('/chat', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        question,
        context,
        user_role: userRole || null,
        user_id: userId || null,
        user_token: token || null,
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

  getWebSocketUrl(tenantId: string): string {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/ws/messages/${tenantId}`;
  }
}

export const aiApi = new AiClient();
