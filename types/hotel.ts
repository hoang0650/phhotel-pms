export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'presidential';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  price: number;
  capacity: number;
  amenities: string[];
  currentGuest?: string;
  checkoutDate?: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  nationality: string;
  avatar?: string;
  totalStays: number;
  totalSpent: number;
  vipStatus: boolean;
}

export interface Booking {
  id: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  totalAmount: number;
  paidAmount: number;
  adults: number;
  children: number;
  specialRequests?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  occupancyRate: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  hotelId: string;
  icon?: string;
}

export interface ServiceOrder {
  id: string;
  serviceId: string;
  serviceName: string;
  roomId: string;
  roomNumber: string;
  guestId: string;
  guestName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hotelId: string;
  avatar?: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive' | 'on_leave';
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  month: string;
  paidAt?: string;
  status: 'pending' | 'paid';
}
