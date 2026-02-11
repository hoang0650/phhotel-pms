import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import { Staff, SalaryRecord } from '@/types/hotel';
import { extractId } from './utils';

export interface ApiStaff {
  _id: string;
  name?: string;
  userId?: any;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hotelId?: any;
  avatar?: string;
  salary?: number;
  startDate?: string;
  status?: string;
  personalInfo?: Staff['personalInfo'];
  contactInfo?: Staff['contactInfo'];
  employmentInfo?: Staff['employmentInfo'];
  schedule?: Staff['schedule'];
  permissions?: Staff['permissions'];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const buildStaffName = (apiStaff: ApiStaff) => {
  const firstName = apiStaff.personalInfo?.firstName || '';
  const lastName = apiStaff.personalInfo?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (apiStaff.name) return apiStaff.name;
  if (apiStaff.email) return apiStaff.email;
  if (apiStaff.phone) return apiStaff.phone;
  return '';
};

const mapApiStaffToStaff = (apiStaff: ApiStaff): Staff => ({
  id: apiStaff._id,
  userId: extractId(apiStaff.userId),
  hotelId: extractId(apiStaff.hotelId) || '',
  personalInfo: {
    firstName: apiStaff.personalInfo?.firstName || '',
    lastName: apiStaff.personalInfo?.lastName || '',
    dateOfBirth: apiStaff.personalInfo?.dateOfBirth,
    gender: apiStaff.personalInfo?.gender,
    nationality: apiStaff.personalInfo?.nationality,
    idType: apiStaff.personalInfo?.idType,
    idNumber: apiStaff.personalInfo?.idNumber,
    idExpiryDate: apiStaff.personalInfo?.idExpiryDate,
    idScanUrl: apiStaff.personalInfo?.idScanUrl,
  },
  contactInfo: apiStaff.contactInfo,
  employmentInfo: {
    position: (apiStaff.employmentInfo?.position as Staff['employmentInfo']['position']) || 'receptionist',
    department: apiStaff.employmentInfo?.department,
    startDate: apiStaff.employmentInfo?.startDate,
    endDate: apiStaff.employmentInfo?.endDate,
    status:
      (apiStaff.employmentInfo?.status as Staff['employmentInfo']['status']) ||
      (apiStaff.status === 'inactive' ? 'terminated' : apiStaff.status) ||
      'active',
    salary: apiStaff.employmentInfo?.salary ?? apiStaff.salary ?? 0,
    allowance: apiStaff.employmentInfo?.allowance,
    insurance: apiStaff.employmentInfo?.insurance,
    penalty: apiStaff.employmentInfo?.penalty,
    bonus: apiStaff.employmentInfo?.bonus,
    advancePayment: apiStaff.employmentInfo?.advancePayment,
    bankAccount: apiStaff.employmentInfo?.bankAccount,
    taxId: apiStaff.employmentInfo?.taxId,
  },
  schedule: apiStaff.schedule,
  permissions: apiStaff.permissions,
  notes: apiStaff.notes,
  createdAt: apiStaff.createdAt,
  updatedAt: apiStaff.updatedAt,
  name: buildStaffName(apiStaff),
  email: apiStaff.contactInfo?.email || apiStaff.email || '',
  phone: apiStaff.contactInfo?.phone || apiStaff.phone || '',
  position: apiStaff.employmentInfo?.position || apiStaff.position || '',
  department: apiStaff.employmentInfo?.department || apiStaff.department || '',
  avatar: apiStaff.avatar,
  salary: apiStaff.employmentInfo?.salary ?? apiStaff.salary ?? 0,
  startDate: apiStaff.employmentInfo?.startDate || apiStaff.startDate || '',
  status:
    (apiStaff.employmentInfo?.status as Staff['status']) ||
    (apiStaff.status === 'inactive' ? 'terminated' : (apiStaff.status as Staff['status'])) ||
    'active',
});

const normalizeStaffPayload = (staff: Partial<Staff>) => ({
  userId: staff.userId,
  hotelId: staff.hotelId,
  personalInfo: staff.personalInfo,
  contactInfo: staff.contactInfo,
  employmentInfo: staff.employmentInfo,
  schedule: staff.schedule,
  permissions: staff.permissions,
  notes: staff.notes,
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
      const response = await apiClient.post<ApiStaff>(API_ENDPOINTS.STAFFS.BASE, normalizeStaffPayload(staff));
      return mapApiStaffToStaff(response);
    } catch (error) {
      console.error('[staffsApi.create] Error:', error);
      return null;
    }
  },

  update: async (id: string, staff: Partial<Staff>): Promise<Staff | null> => {
    try {
      const response = await apiClient.put<ApiStaff>(API_ENDPOINTS.STAFFS.BY_ID(id), normalizeStaffPayload(staff));
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
