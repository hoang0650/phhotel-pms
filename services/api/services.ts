import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Service, ServiceOrder } from '@/types/hotel';

export interface ApiService {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isActive?: boolean;
  hotelId?: string;
  icon?: string;
  image?: string;
  currency?: string;
  isCustom?: boolean;
  costPrice?: number;
  importQuantity?: number;
  salesQuantity?: number;
}

export interface ApiServiceOrder {
  _id: string;
  service?: {
    _id: string;
    name: string;
  };
  serviceId?: string;
  serviceName?: string;
  room?: {
    _id: string;
    roomNumber: string;
  };
  roomId?: string;
  roomNumber?: string;
  guest?: {
    _id: string;
    name: string;
  };
  guestId?: string;
  guestName?: string;
  quantity: number;
  totalPrice: number;
  totalAmount?: number;
  status: string;
  createdAt: string;
  orderTime?: string;
  requestTime?: string;
  updatedAt?: string;
  completedAt?: string;
}

const mapApiServiceToService = (apiService: ApiService): Service => ({
  id: apiService._id,
  name: apiService.name,
  description: apiService.description || '',
  price: apiService.price || 0,
  category: apiService.category || 'custom',
  isActive: apiService.isActive ?? true,
  hotelId: apiService.hotelId || '',
  icon: apiService.icon,
  image: apiService.image,
  currency: apiService.currency,
  isCustom: apiService.isCustom,
  costPrice: apiService.costPrice,
  importQuantity: apiService.importQuantity,
  salesQuantity: apiService.salesQuantity,
});

const mapApiServiceOrderToServiceOrder = (apiOrder: ApiServiceOrder): ServiceOrder => ({
  id: apiOrder._id,
  serviceId: apiOrder.service?._id || apiOrder.serviceId || '',
  serviceName: apiOrder.service?.name || apiOrder.serviceName || '',
  roomId: apiOrder.room?._id || apiOrder.roomId || '',
  roomNumber: apiOrder.room?.roomNumber || apiOrder.roomNumber || '',
  guestId: apiOrder.guest?._id || apiOrder.guestId || '',
  guestName: apiOrder.guest?.name || apiOrder.guestName || '',
  quantity: apiOrder.quantity || 1,
  totalPrice: apiOrder.totalPrice || apiOrder.totalAmount || 0,
  status:
    (apiOrder.status === 'delivered' ? 'completed' : apiOrder.status) as ServiceOrder['status'] ||
    'pending',
  createdAt: apiOrder.createdAt || apiOrder.orderTime || apiOrder.requestTime || apiOrder.updatedAt || '',
  completedAt: apiOrder.completedAt,
});

export const servicesApi = {
  getAll: async (hotelId?: string): Promise<Service[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.SERVICES.BASE}?hotelId=${hotelId}`
        : API_ENDPOINTS.SERVICES.BASE;
      const response = await apiClient.get<ApiService[] | { data: ApiService[] }>(endpoint);
      const services = Array.isArray(response) ? response : (response?.data || []);
      return services.map(mapApiServiceToService);
    } catch (error) {
      console.error('[servicesApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Service | null> => {
    try {
      const response = await apiClient.get<ApiService>(API_ENDPOINTS.SERVICES.BY_ID(id));
      return mapApiServiceToService(response);
    } catch (error) {
      console.error('[servicesApi.getById] Error:', error);
      return null;
    }
  },

  create: async (service: Omit<Service, 'id'>): Promise<Service | null> => {
    try {
      const response = await apiClient.post<ApiService>(API_ENDPOINTS.SERVICES.BASE, service);
      return mapApiServiceToService(response);
    } catch (error) {
      console.error('[servicesApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, service: Partial<Service>): Promise<Service | null> => {
    try {
      const response = await apiClient.put<ApiService>(API_ENDPOINTS.SERVICES.BY_ID(id), service);
      return mapApiServiceToService(response);
    } catch (error) {
      console.error('[servicesApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.SERVICES.BY_ID(id));
      return true;
    } catch (error) {
      console.error('[servicesApi.delete] Error:', error);
      return false;
    }
  },

  getOrders: async (hotelId?: string): Promise<ServiceOrder[]> => {
    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.SERVICES.ORDERS}?hotelId=${hotelId}`
        : API_ENDPOINTS.SERVICES.ORDERS;
      const response = await apiClient.get<ApiServiceOrder[] | { data: ApiServiceOrder[] }>(endpoint);
      const orders = Array.isArray(response) ? response : (response?.data || []);
      return orders.map(mapApiServiceOrderToServiceOrder);
    } catch (error) {
      console.error('[servicesApi.getOrders] Error:', error);
      return [];
    }
  },

  getOrdersByRoom: async (roomId: string): Promise<ServiceOrder[]> => {
    try {
      const response = await apiClient.get<ApiServiceOrder[]>(API_ENDPOINTS.SERVICES.ORDERS_BY_ROOM(roomId));
      const orders = Array.isArray(response) ? response : [];
      return orders.map(mapApiServiceOrderToServiceOrder);
    } catch (error) {
      console.error('[servicesApi.getOrdersByRoom] Error:', error);
      return [];
    }
  },

  createOrder: async (order: Omit<ServiceOrder, 'id' | 'createdAt'>): Promise<ServiceOrder | null> => {
    try {
      const response = await apiClient.post<ApiServiceOrder>(API_ENDPOINTS.SERVICES.ORDERS, order);
      return mapApiServiceOrderToServiceOrder(response);
    } catch (error) {
      console.error('[servicesApi.createOrder] Error:', error);
      return null;
    }
  },

  updateOrderStatus: async (orderId: string, status: ServiceOrder['status']): Promise<ServiceOrder | null> => {
    try {
      const response = await apiClient.patch<ApiServiceOrder>(
        API_ENDPOINTS.SERVICES.ORDER_BY_ID(orderId), 
        { status }
      );
      return mapApiServiceOrderToServiceOrder(response);
    } catch (error) {
      console.error('[servicesApi.updateOrderStatus] Error:', error);
      return null;
    }
  },
};
