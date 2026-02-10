import { apiClient, shouldUseMockData, CORS_SKIP_ERROR } from './client';
import { API_ENDPOINTS } from './config';
import { Service, ServiceOrder } from '@/types/hotel';

const mockServices: Service[] = [
  { id: '1', name: 'Giặt ủi', description: 'Dịch vụ giặt ủi quần áo', price: 50000, category: 'laundry', isActive: true, hotelId: '1', icon: 'shirt' },
  { id: '2', name: 'Spa & Massage', description: 'Dịch vụ spa và massage thư giãn', price: 500000, category: 'wellness', isActive: true, hotelId: '1', icon: 'heart' },
  { id: '3', name: 'Đưa đón sân bay', description: 'Dịch vụ đưa đón sân bay', price: 300000, category: 'transport', isActive: true, hotelId: '1', icon: 'car' },
  { id: '4', name: 'Ăn sáng buffet', description: 'Buffet sáng đa dạng món', price: 150000, category: 'food', isActive: true, hotelId: '1', icon: 'utensils' },
  { id: '5', name: 'Minibar', description: 'Đồ uống và snack trong phòng', price: 100000, category: 'food', isActive: true, hotelId: '1', icon: 'wine' },
  { id: '6', name: 'Hồ bơi', description: 'Sử dụng hồ bơi', price: 100000, category: 'wellness', isActive: true, hotelId: '1', icon: 'waves' },
];

const mockServiceOrders: ServiceOrder[] = [
  { id: '1', serviceId: '1', serviceName: 'Giặt ủi', roomId: '101', roomNumber: '101', guestId: '1', guestName: 'Nguyễn Văn A', quantity: 2, totalPrice: 100000, status: 'completed', createdAt: '2025-02-10T08:00:00Z', completedAt: '2025-02-10T14:00:00Z' },
  { id: '2', serviceId: '2', serviceName: 'Spa & Massage', roomId: '202', roomNumber: '202', guestId: '2', guestName: 'Trần Thị B', quantity: 1, totalPrice: 500000, status: 'processing', createdAt: '2025-02-10T10:00:00Z' },
  { id: '3', serviceId: '4', serviceName: 'Ăn sáng buffet', roomId: '301', roomNumber: '301', guestId: '3', guestName: 'Lê Văn C', quantity: 3, totalPrice: 450000, status: 'pending', createdAt: '2025-02-10T06:00:00Z' },
];

export const servicesApi = {
  getAll: async (hotelId?: string): Promise<Service[]> => {
    if (shouldUseMockData()) {
      console.log('[servicesApi.getAll] Using mock data');
      return hotelId ? mockServices.filter(s => s.hotelId === hotelId) : mockServices;
    }

    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.SERVICES.BASE}?hotelId=${hotelId}`
        : API_ENDPOINTS.SERVICES.BASE;
      const response = await apiClient.get<Service[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[servicesApi.getAll] Using mock data as fallback');
        return hotelId ? mockServices.filter(s => s.hotelId === hotelId) : mockServices;
      }
      console.error('[servicesApi.getAll] Error:', error);
      return hotelId ? mockServices.filter(s => s.hotelId === hotelId) : mockServices;
    }
  },

  getById: async (id: string): Promise<Service | null> => {
    if (shouldUseMockData()) {
      return mockServices.find(s => s.id === id) || null;
    }

    try {
      const response = await apiClient.get<Service>(API_ENDPOINTS.SERVICES.BY_ID(id));
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        return mockServices.find(s => s.id === id) || null;
      }
      console.error('[servicesApi.getById] Error:', error);
      return null;
    }
  },

  create: async (service: Omit<Service, 'id'>): Promise<Service> => {
    if (shouldUseMockData()) {
      const newService = { ...service, id: Date.now().toString() };
      mockServices.push(newService);
      return newService;
    }

    try {
      const response = await apiClient.post<Service>(API_ENDPOINTS.SERVICES.BASE, service);
      return response;
    } catch (error) {
      console.error('[servicesApi.create] Error:', error);
      throw error;
    }
  },

  update: async (id: string, service: Partial<Service>): Promise<Service> => {
    if (shouldUseMockData()) {
      const index = mockServices.findIndex(s => s.id === id);
      if (index !== -1) {
        mockServices[index] = { ...mockServices[index], ...service };
        return mockServices[index];
      }
      throw new Error('Service not found');
    }

    try {
      const response = await apiClient.put<Service>(API_ENDPOINTS.SERVICES.BY_ID(id), service);
      return response;
    } catch (error) {
      console.error('[servicesApi.update] Error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    if (shouldUseMockData()) {
      const index = mockServices.findIndex(s => s.id === id);
      if (index !== -1) {
        mockServices.splice(index, 1);
      }
      return;
    }

    try {
      await apiClient.delete(API_ENDPOINTS.SERVICES.BY_ID(id));
    } catch (error) {
      console.error('[servicesApi.delete] Error:', error);
      throw error;
    }
  },

  getOrders: async (hotelId?: string): Promise<ServiceOrder[]> => {
    if (shouldUseMockData()) {
      console.log('[servicesApi.getOrders] Using mock data');
      return mockServiceOrders;
    }

    try {
      const endpoint = hotelId 
        ? `${API_ENDPOINTS.SERVICES.ORDERS}?hotelId=${hotelId}`
        : API_ENDPOINTS.SERVICES.ORDERS;
      const response = await apiClient.get<ServiceOrder[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        return mockServiceOrders;
      }
      console.error('[servicesApi.getOrders] Error:', error);
      return mockServiceOrders;
    }
  },

  createOrder: async (order: Omit<ServiceOrder, 'id' | 'createdAt'>): Promise<ServiceOrder> => {
    if (shouldUseMockData()) {
      const newOrder: ServiceOrder = { 
        ...order, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      mockServiceOrders.push(newOrder);
      return newOrder;
    }

    try {
      const response = await apiClient.post<ServiceOrder>(API_ENDPOINTS.SERVICES.ORDERS, order);
      return response;
    } catch (error) {
      console.error('[servicesApi.createOrder] Error:', error);
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, status: ServiceOrder['status']): Promise<ServiceOrder> => {
    if (shouldUseMockData()) {
      const index = mockServiceOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        mockServiceOrders[index].status = status;
        if (status === 'completed') {
          mockServiceOrders[index].completedAt = new Date().toISOString();
        }
        return mockServiceOrders[index];
      }
      throw new Error('Order not found');
    }

    try {
      const response = await apiClient.patch<ServiceOrder>(
        API_ENDPOINTS.SERVICES.ORDER_BY_ID(orderId), 
        { status }
      );
      return response;
    } catch (error) {
      console.error('[servicesApi.updateOrderStatus] Error:', error);
      throw error;
    }
  },
};
