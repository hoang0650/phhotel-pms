import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Staff, SalaryRecord } from '@/types/hotel';

export interface ApiStaff {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hotelId?: string;
  avatar?: string;
  salary?: number;
  startDate?: string;
  status?: string;
}

const mapApiStaffToStaff = (apiStaff: ApiStaff): Staff => ({
  id: apiStaff._id,
  name: apiStaff.name || '',
  email: apiStaff.email || '',
  phone: apiStaff.phone || '',
  position: apiStaff.position || '',
  department: apiStaff.department || '',
  hotelId: apiStaff.hotelId || '',
  avatar: apiStaff.avatar,
  salary: apiStaff.salary || 0,
  startDate: apiStaff.startDate || '',
  status: (apiStaff.status as Staff['status']) || 'active',
});

export const staffsApi = {
  getAll: async (hotelId?: string): Promise<Staff[]> => {
    try {
      const endpoint = hotelId 
        ? API_ENDPOINTS.STAFFS.BY_HOTEL(hotelId)
        : API_ENDPOINTS.STAFFS.BASE;
      const response = await apiClient.get<ApiStaff[] | { data: ApiStaff[] }>(endpoint);
      const staffs = Array.isArray(response) ? response : (response?.data || []);
      return staffs.map(mapApiStaffToStaff);
    } catch (error) {
      console.error('[staffsApi.getAll] Error:', error);
      return [];
    }
  },

  getById: async (id: string): Promise<Staff | null> => {
    try {
      const response = await apiClient.get<ApiStaff>(API_ENDPOINTS.STAFFS.BY_ID(id));
      return mapApiStaffToStaff(response);
    } catch (error) {
      console.error('[staffsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (staff: Omit<Staff, 'id'>): Promise<Staff | null> => {
    try {
      const response = await apiClient.post<ApiStaff>(API_ENDPOINTS.STAFFS.BASE, staff);
      return mapApiStaffToStaff(response);
    } catch (error) {
      console.error('[staffsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, staff: Partial<Staff>): Promise<Staff | null> => {
    try {
      const response = await apiClient.put<ApiStaff>(API_ENDPOINTS.STAFFS.BY_ID(id), staff);
      return mapApiStaffToStaff(response);
    } catch (error) {
      console.error('[staffsApi.update] Error:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(API_ENDPOINTS.STAFFS.BY_ID(id));
      return true;
    } catch (error) {
      console.error('[staffsApi.delete] Error:', error);
      return false;
    }
  },

  calculateSalary: async (staffId: string, month: string): Promise<SalaryRecord | null> => {
    try {
      const response = await apiClient.post<SalaryRecord>(
        API_ENDPOINTS.STAFFS.CALCULATE_SALARY(staffId),
        { month }
      );
      return response;
    } catch (error) {
      console.error('[staffsApi.calculateSalary] Error:', error);
      return null;
    }
  },

  paySalary: async (staffId: string, salaryRecordId: string): Promise<SalaryRecord | null> => {
    try {
      const response = await apiClient.post<SalaryRecord>(
        API_ENDPOINTS.STAFFS.PAY_SALARY(staffId),
        { salaryRecordId }
      );
      return response;
    } catch (error) {
      console.error('[staffsApi.paySalary] Error:', error);
      return null;
    }
  },

  getSalaryRecords: async (staffId?: string, month?: string): Promise<SalaryRecord[]> => {
    try {
      let endpoint = `${API_ENDPOINTS.STAFFS.BASE}/salary-records`;
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      if (month) params.append('month', month);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      const response = await apiClient.get<SalaryRecord[]>(endpoint);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('[staffsApi.getSalaryRecords] Error:', error);
      return [];
    }
  },
};
