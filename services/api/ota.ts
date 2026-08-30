import { apiClient } from './client';
import { API_ENDPOINTS } from './config';

export type OtaIntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export interface OtaIntegration {
  _id: string;
  hotelId: string;
  provider: string;
  adapterType?: string;
  channelName?: string;
  channelCode?: string;
  status: OtaIntegrationStatus;
  lastSync?: string;
  settings?: {
    autoAcceptBookings?: boolean;
    updateInventory?: boolean;
    updatePrices?: boolean;
    updateAvailability?: boolean;
    currencyCode?: string;
    languageCode?: string;
  };
  mappings?: {
    roomTypes?: Array<{
      localRoomTypeId?: string;
      otaRoomTypeId?: string;
      otaRoomTypeName?: string;
      baseRate?: number;
    }>;
    ratePlans?: Array<{
      localRatePlanId?: string;
      otaRatePlanId?: string;
      otaRatePlanName?: string;
    }>;
  };
}

export interface OtaBooking {
  _id?: string;
  otaProvider: string;
  otaBookingId: string;
  otaConfirmationNumber?: string;
  guestDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    numberOfGuests?: { adults?: number; children?: number };
  };
  roomDetails?: {
    roomTypeName?: string;
    roomCount?: number;
  };
  checkInDate: string;
  checkOutDate: string;
  pricing?: {
    totalAmount?: number;
    currency?: string;
  };
  paymentStatus?: string;
  status: string;
  localRoomId?: string;
}

export interface OtaCalendarResponse {
  message: string;
  data: Array<{
    id: string;
    otaBookingId: string;
    provider: string;
    title: string;
    start: string;
    end: string;
    guestName?: string;
    roomType?: string;
    roomId?: string | { _id?: string };
    roomNumber?: string;
    currency?: string;
    status: string;
    color?: string;
  }>;
  summary?: {
    total: number;
    byProvider: Record<string, number>;
  };
}

export interface OtaSyncResult {
  message?: string;
  data?: {
    syncedRooms?: number;
    dateRange?: { start: string; end: string };
    result?: unknown;
  };
  results?: Array<{
    provider: string;
    adapterType?: string;
    success: boolean;
    syncedRooms?: number;
    error?: string;
  }>;
}

export interface OtaBookingsResponse {
  message: string;
  data: OtaBooking[];
  lastSync?: string;
}

export interface OtaTestConnectionResponse {
  message?: string;
  data?: { connected: boolean; message: string };
}

const OTA_PROVIDER_COLORS: Record<string, string> = {
  Channex: '#00b4a0',
  'Booking.com': '#003580',
  Agoda: '#5391ff',
  Traveloka: '#0194f3',
  'Trip.com': '#287dfa',
  Expedia: '#00355f',
  G2J: '#ff6b35',
  Airbnb: '#ff5a5f',
};

export const otaApi = {
  getProviderColor(provider: string): string {
    return OTA_PROVIDER_COLORS[provider] || '#64748b';
  },

  getIntegrations: async (hotelId: string): Promise<OtaIntegration[]> => {
    return apiClient.get<OtaIntegration[]>(`${API_ENDPOINTS.OTA.BASE}?hotelId=${hotelId}`);
  },

  getActiveChannexIntegration: async (hotelId: string): Promise<OtaIntegration | null> => {
    const integrations = await otaApi.getIntegrations(hotelId);
    return integrations.find(
      (i) => i.status === 'active' && (i.adapterType === 'channex' || i.provider === 'Channex')
    ) || null;
  },

  testConnection: async (integrationId: string): Promise<OtaTestConnectionResponse> => {
    return apiClient.post<OtaTestConnectionResponse>(`${API_ENDPOINTS.OTA.BASE}/${integrationId}/test`, {});
  },

  pullReservations: async (integrationId: string): Promise<OtaBookingsResponse> => {
    return apiClient.post<OtaBookingsResponse>(API_ENDPOINTS.OTA.PULL_RESERVATIONS(integrationId), {});
  },

  syncInventory: async (
    integrationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OtaSyncResult> => {
    const body: Record<string, string> = {};
    if (startDate) body.startDate = startDate.toISOString();
    if (endDate) body.endDate = endDate.toISOString();
    return apiClient.post<OtaSyncResult>(API_ENDPOINTS.OTA.SYNC_INVENTORY(integrationId), body);
  },

  syncAllInventoryForHotel: async (hotelId: string): Promise<OtaSyncResult> => {
    return apiClient.post<OtaSyncResult>(API_ENDPOINTS.OTA.SYNC_ALL_INVENTORY(hotelId), {});
  },

  getChannexBookings: async (hotelId: string, sync = false): Promise<OtaBookingsResponse> => {
    const syncParam = sync ? '&sync=true' : '';
    return apiClient.get<OtaBookingsResponse>(
      `${API_ENDPOINTS.OTA.CHANNEX_BOOKINGS(hotelId)}${syncParam}`
    );
  },

  getCalendarBookings: async (
    hotelId: string,
    params?: { startDate?: string; endDate?: string; status?: string }
  ): Promise<OtaCalendarResponse> => {
    const query = new URLSearchParams({ hotelId });
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.status) query.set('status', params.status);
    return apiClient.get<OtaCalendarResponse>(
      `${API_ENDPOINTS.OTA.BASE}/bookings/calendar?${query.toString()}`
    );
  },

  triggerInventorySync: (hotelId?: string | null): void => {
    if (!hotelId) return;

    const startDate = new Date();
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    otaApi.getActiveChannexIntegration(hotelId).then((integration) => {
      if (!integration) {
        return otaApi.syncAllInventoryForHotel(hotelId);
      }
      if (integration.settings?.updateInventory !== false) {
        return otaApi.syncInventory(integration._id, startDate, endDate);
      }
      return null;
    }).catch((error) => {
      console.warn('[otaApi.triggerInventorySync] Error:', error);
    });
  },

  triggerReservationPull: (hotelId?: string | null): void => {
    if (!hotelId) return;

    otaApi.getActiveChannexIntegration(hotelId).then((integration) => {
      if (integration) {
        return otaApi.pullReservations(integration._id);
      }
      return null;
    }).catch((error) => {
      console.warn('[otaApi.triggerReservationPull] Error:', error);
    });
  },
};
