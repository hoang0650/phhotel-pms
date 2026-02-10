import { apiClient, shouldUseMockData, CORS_SKIP_ERROR } from './client';
import { API_ENDPOINTS } from './config';
import { Staff, SalaryRecord } from '@/types/hotel';

const mockStaffs: Staff[] = [
  { id: '1', name: 'Nguyễn Văn An', email: 'an@hotel.com', phone: '0901234567', position: 'Quản lý', department: 'management', hotelId: '1', salary: 15000000, startDate: '2023-01-15', status: 'active' },
  { id: '2', name: 'Trần Thị Bình', email: 'binh@hotel.com', phone: '0902345678', position: 'Lễ tân', department: 'reception', hotelId: '1', salary: 8000000, startDate: '2023-06-01', status: 'active' },
  { id: '3', name: 'Lê Văn Cường', email: 'cuong@hotel.com', phone: '0903456789', position: 'Buồng phòng', department: 'housekeeping', hotelId: '1', salary: 6000000, startDate: '2024-01-10', status: 'active' },
  { id: '4', name: 'Phạm Thị Dung', email: 'dung@hotel.com', phone: '0904567890', position: 'Bếp trưởng', department: 'kitchen', hotelId: '1', salary: 12000000, startDate: '2022-08-20', status: 'active' },
  { id: '5', name: 'Hoàng Văn Em', email: 'em@hotel.com', phone: '0905678901', position: 'Bảo vệ', department: 'security', hotelId: '1', salary: 7000000, startDate: '2024-03-01', status: 'on_leave' },
];

const mockSalaryRecords: SalaryRecord[] = [
  { id: '1', staffId: '1', staffName: 'Nguyễn Văn An', baseSalary: 15000000, bonus: 2000000, deductions: 500000, netSalary: 16500000, month: '2025-01', paidAt: '2025-02-05', status: 'paid' },
  { id: '2', staffId: '2', staffName: 'Trần Thị Bình', baseSalary: 8000000, bonus: 500000, deductions: 0, netSalary: 8500000, month: '2025-01', paidAt: '2025-02-05', status: 'paid' },
  { id: '3', staffId: '1', staffName: 'Nguyễn Văn An', baseSalary: 15000000, bonus: 0, deductions: 0, netSalary: 15000000, month: '2025-02', status: 'pending' },
  { id: '4', staffId: '2', staffName: 'Trần Thị Bình', baseSalary: 8000000, bonus: 0, deductions: 0, netSalary: 8000000, month: '2025-02', status: 'pending' },
];

export const staffsApi = {
  getAll: async (hotelId?: string): Promise<Staff[]> => {
    if (shouldUseMockData()) {
      console.log('[staffsApi.getAll] Using mock data');
      return hotelId ? mockStaffs.filter(s => s.hotelId === hotelId) : mockStaffs;
    }

    try {
      const endpoint = hotelId 
        ? API_ENDPOINTS.STAFFS.BY_HOTEL(hotelId)
        : API_ENDPOINTS.STAFFS.BASE;
      const response = await apiClient.get<Staff[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        console.log('[staffsApi.getAll] Using mock data as fallback');
        return hotelId ? mockStaffs.filter(s => s.hotelId === hotelId) : mockStaffs;
      }
      console.error('[staffsApi.getAll] Error:', error);
      return hotelId ? mockStaffs.filter(s => s.hotelId === hotelId) : mockStaffs;
    }
  },

  getById: async (id: string): Promise<Staff | null> => {
    if (shouldUseMockData()) {
      return mockStaffs.find(s => s.id === id) || null;
    }

    try {
      const response = await apiClient.get<Staff>(API_ENDPOINTS.STAFFS.BY_ID(id));
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        return mockStaffs.find(s => s.id === id) || null;
      }
      console.error('[staffsApi.getById] Error:', error);
      return null;
    }
  },

  create: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
    if (shouldUseMockData()) {
      const newStaff = { ...staff, id: Date.now().toString() };
      mockStaffs.push(newStaff);
      return newStaff;
    }

    try {
      const response = await apiClient.post<Staff>(API_ENDPOINTS.STAFFS.BASE, staff);
      return response;
    } catch (error) {
      console.error('[staffsApi.create] Error:', error);
      throw error;
    }
  },

  update: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    if (shouldUseMockData()) {
      const index = mockStaffs.findIndex(s => s.id === id);
      if (index !== -1) {
        mockStaffs[index] = { ...mockStaffs[index], ...staff };
        return mockStaffs[index];
      }
      throw new Error('Staff not found');
    }

    try {
      const response = await apiClient.put<Staff>(API_ENDPOINTS.STAFFS.BY_ID(id), staff);
      return response;
    } catch (error) {
      console.error('[staffsApi.update] Error:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    if (shouldUseMockData()) {
      const index = mockStaffs.findIndex(s => s.id === id);
      if (index !== -1) {
        mockStaffs.splice(index, 1);
      }
      return;
    }

    try {
      await apiClient.delete(API_ENDPOINTS.STAFFS.BY_ID(id));
    } catch (error) {
      console.error('[staffsApi.delete] Error:', error);
      throw error;
    }
  },

  calculateSalary: async (staffId: string, month: string): Promise<SalaryRecord> => {
    if (shouldUseMockData()) {
      const staff = mockStaffs.find(s => s.id === staffId);
      if (staff) {
        return {
          id: Date.now().toString(),
          staffId,
          staffName: staff.name,
          baseSalary: staff.salary,
          bonus: 0,
          deductions: 0,
          netSalary: staff.salary,
          month,
          status: 'pending',
        };
      }
      throw new Error('Staff not found');
    }

    try {
      const response = await apiClient.post<SalaryRecord>(
        API_ENDPOINTS.STAFFS.CALCULATE_SALARY(staffId),
        { month }
      );
      return response;
    } catch (error) {
      console.error('[staffsApi.calculateSalary] Error:', error);
      throw error;
    }
  },

  paySalary: async (staffId: string, salaryRecordId: string): Promise<SalaryRecord> => {
    if (shouldUseMockData()) {
      const record = mockSalaryRecords.find(r => r.id === salaryRecordId);
      if (record) {
        record.status = 'paid';
        record.paidAt = new Date().toISOString();
        return record;
      }
      throw new Error('Salary record not found');
    }

    try {
      const response = await apiClient.post<SalaryRecord>(
        API_ENDPOINTS.STAFFS.PAY_SALARY(staffId),
        { salaryRecordId }
      );
      return response;
    } catch (error) {
      console.error('[staffsApi.paySalary] Error:', error);
      throw error;
    }
  },

  getSalaryRecords: async (staffId?: string, month?: string): Promise<SalaryRecord[]> => {
    if (shouldUseMockData()) {
      let records = mockSalaryRecords;
      if (staffId) records = records.filter(r => r.staffId === staffId);
      if (month) records = records.filter(r => r.month === month);
      return records;
    }

    try {
      let endpoint = `${API_ENDPOINTS.STAFFS.BASE}/salary-records`;
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      if (month) params.append('month', month);
      if (params.toString()) endpoint += `?${params.toString()}`;
      
      const response = await apiClient.get<SalaryRecord[]>(endpoint);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === CORS_SKIP_ERROR) {
        let records = mockSalaryRecords;
        if (staffId) records = records.filter(r => r.staffId === staffId);
        if (month) records = records.filter(r => r.month === month);
        return records;
      }
      console.error('[staffsApi.getSalaryRecords] Error:', error);
      return [];
    }
  },
};
