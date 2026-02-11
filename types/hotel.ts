export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'dirty' | 'maintenance' | 'booked';
export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'presidential';

export interface RoomPricing {
  hourly?: number;
  daily?: number;
  nightly?: number;
  weekly?: number;
  monthly?: number;
  currency?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  roomType?: string;
  status: RoomStatus;
  guestStatus?: 'in' | 'out';
  price: number;
  checkInTime?: string;
  rateType?: 'hourly' | 'daily' | 'nightly' | 'weekly' | 'monthly';
  paymentMethod?: 'cash' | 'transfer' | 'card';
  guestPhone?: string;
  guestIdNumber?: string;
  advancePayment?: number;
  additionalCharges?: number;
  discount?: number;
  servicesTotal?: number;
  totalAmount?: number;
  selectedServices?: Array<{
    serviceId?: string;
    serviceName?: string;
    name?: string;
    price?: number;
    unitPrice?: number;
    quantity?: number;
    totalPrice?: number;
  }>;
  capacity: number;
  amenities: string[];
  pricing?: RoomPricing;
  firstHourRate?: number;
  additionalHourRate?: number;
  currentGuest?: string;
  checkoutDate?: string;
  lastCleaned?: string;
  lastMaintenance?: string;
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
  guestEmail?: string;
  guestPhone?: string;
  guestIdNumber?: string;
  guestAddress?: string;
  roomId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  bookingType?: 'hourly' | 'daily' | 'nightly';
  rateType?: 'hourly' | 'daily' | 'nightly';
  totalAmount: number;
  paidAmount: number;
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit_card' | 'bank_transfer';
  adults: number;
  children: number;
  numberOfGuests?: {
    adults: number;
    children: number;
  };
  deposit?: number;
  advancePayment?: number;
  basePrice?: number;
  additionalCharges?: Array<{ description?: string; amount: number }>;
  discounts?: Array<{ description?: string; amount: number }>;
  source?: string;
  otaSource?: string;
  otaBookingId?: string;
  notes?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
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
  image?: string;
  currency?: string;
  isCustom?: boolean;
  costPrice?: number;
  importQuantity?: number;
  salesQuantity?: number;
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

export interface StaffPersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  idType?: string;
  idNumber?: string;
  idExpiryDate?: string;
  idScanUrl?: string;
}

export interface StaffEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface StaffAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface StaffContactInfo {
  email?: string;
  phone?: string;
  emergencyContact?: StaffEmergencyContact;
  address?: StaffAddress;
}

export interface StaffBankAccount {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface StaffEmploymentInfo {
  position: 'manager' | 'receptionist' | 'housekeeper' | 'maintenance' | 'other';
  department?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'on_leave' | 'terminated';
  salary?: number;
  allowance?: number;
  insurance?: number;
  penalty?: number;
  bonus?: number;
  advancePayment?: number;
  bankAccount?: StaffBankAccount;
  taxId?: string;
}

export interface StaffSchedule {
  date: string;
  shift: 'morning' | 'afternoon' | 'night' | 'full-day';
  startTime?: string;
  endTime?: string;
  status?: 'scheduled' | 'completed' | 'absent' | 'late';
}

export type StaffPermission = 'view' | 'create' | 'edit' | 'delete' | 'manage_rooms' | 'manage_bookings';

export interface Staff {
  id: string;
  userId?: string;
  hotelId: string;
  personalInfo: StaffPersonalInfo;
  contactInfo?: StaffContactInfo;
  employmentInfo: StaffEmploymentInfo;
  schedule?: StaffSchedule[];
  permissions?: StaffPermission[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  avatar?: string;
  salary?: number;
  startDate?: string;
  status?: 'active' | 'on_leave' | 'terminated';
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

export type ShiftHandoverStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export type PaymentMethodType = 'cash' | 'bank_transfer' | 'card';
export type RoomActionType = 'check_in' | 'check_out' | 'extend' | 'early_checkout' | 'room_change';
export type InvoiceType = 'room' | 'service' | 'other';

export interface ShiftRoomHistory {
  roomId: string;
  roomNumber: string;
  bookingId?: string;
  action: RoomActionType;
  guestName?: string;
  guestSource?: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  timestamp: Date;
  notes?: string;
  roomTotal?: number;
  additionalCharges?: number;
  discount?: number;
  serviceAmount?: number;
  advancePayment?: number;
  advancePaymentMethod?: PaymentMethodType;
}

export interface ShiftInvoice {
  invoiceId?: string;
  invoiceNumber?: string;
  bookingId?: string;
  roomId?: string;
  roomNumber?: string;
  guestName?: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  type: InvoiceType;
  timestamp: Date;
}

export interface ShiftExpense {
  expenseId?: string;
  description: string;
  amount: number;
  category?: string;
  recipient?: string;
  method?: 'cash' | 'bank_transfer' | 'card';
  approvedBy?: string;
  timestamp: Date;
}

export interface ShiftIncome {
  incomeId?: string;
  description: string;
  amount: number;
  category?: string;
  source?: string;
  method?: 'cash' | 'bank_transfer' | 'card';
  approvedBy?: string;
  timestamp: Date;
}

export interface ShiftServiceOrder {
  serviceOrderId?: string;
  roomId?: string;
  roomNumber?: string;
  serviceName: string;
  quantity: number;
  amount: number;
  paymentMethod: PaymentMethodType;
  timestamp: Date;
}

export interface ShiftPendingIssue {
  description: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface ShiftHandover {
  _id?: string;
  hotelId: string;
  fromStaffId: string;
  fromUserId: string;
  fromStaffName?: string;
  toStaffId: string;
  toUserId: string;
  toStaffName?: string;
  handoverTime: Date;
  shiftStartTime?: Date;
  shiftEndTime?: Date;
  previousShiftAmount: number;
  cashInShift: number;
  managerHandoverAmount: number;
  actualReceivedAmount: number;
  handoverAmount: number;
  cashAmount: number;
  bankTransferAmount: number;
  cardPaymentAmount: number;
  expenseAmount: number;
  incomeAmount: number;
  totalRevenue: number;
  totalRoomRevenue: number;
  roomHistory?: ShiftRoomHistory[];
  invoices?: ShiftInvoice[];
  expenses?: ShiftExpense[];
  incomes?: ShiftIncome[];
  serviceOrders?: ShiftServiceOrder[];
  confirmedByPassword: boolean;
  confirmed: boolean;
  confirmedAt?: Date;
  notes?: string;
  pendingIssues?: ShiftPendingIssue[];
  status: ShiftHandoverStatus;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
  summary?: {
    handoverAmount: number;
    totalRevenue: number;
    totalRooms: number;
    totalInvoices: number;
    totalExpenses: number;
    totalIncomes: number;
  };
}

export interface ShiftHandoverCreateRequest {
  hotelId: string;
  fromStaffId: string;
  toStaffId: string;
  toUserPassword: string;
  previousShiftAmount?: number;
  cashInShift?: number;
  managerHandoverAmount?: number;
  cashAmount?: number;
  bankTransferAmount?: number;
  cardPaymentAmount?: number;
  expenseAmount?: number;
  incomeAmount?: number;
  roomHistory?: ShiftRoomHistory[];
  invoices?: ShiftInvoice[];
  expenses?: ShiftExpense[];
  incomes?: ShiftIncome[];
  serviceOrders?: ShiftServiceOrder[];
  notes?: string;
  pendingIssues?: ShiftPendingIssue[];
  shiftStartTime?: Date;
}

export interface ManagerHandoverRequest {
  hotelId: string;
  fromStaffId: string;
  managerUsername: string;
  managerPassword: string;
  amount: number;
  notes?: string;
}

export interface ShiftHandoverHistoryResponse {
  data: ShiftHandover[];
  totalExpense: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}
