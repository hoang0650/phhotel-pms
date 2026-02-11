export interface ShiftHandover {
  _id: string;
  hotel: string;
  shift: 'morning' | 'afternoon' | 'night';
  manager: string;
  handoverTime: Date;
  startCash: number;
  endCash: number;
  actualCash: number;
  difference: number;
  totalRevenue: number;
  totalExpense: number;
  managerHandoverAmount: number;
  notes?: string;
  roomHistory?: RoomHistory[];
  serviceOrders?: ServiceOrder[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomHistory {
  room: string;
  roomNumber: string;
  checkInTime: Date;
  checkOutTime: Date;
  booking: string;
  customerName: string;
  roomTotal: number;
  serviceAmount: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  advancePayment?: number;
  advancePaymentMethod?: string;
}

export interface ServiceOrder {
  service: string;
  serviceName: string;
  quantity: number;
  price: number;
  amount: number;
  paymentMethod: string;
}
