export interface InvoiceProduct {
  _id?: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice?: number;
}

export interface Service {
  _id?: string;
  name: string;
  price: number;
  quantity?: number;
  totalPrice?: number;
}

export interface Duration {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  date: string;
  businessName?: string;
  business_address?: string;
  phoneNumber?: string;
  staffName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  roomNumber?: string;
  roomType?: string;
  roomRate?: number;
  checkInTime?: string;
  checkOutTime?: string;
  products: InvoiceProduct[];
  services?: Service[];
  additionalCharges?: number;
  discount?: number;
  advancePayment?: number;
  totalAmount: number;
  roomTotal?: number;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'pending' | 'partial' | 'cancelled';
  duration?: Duration;
  notes?: string;
  staffId?: string;
  rateType?: 'hourly' | 'daily' | 'nightly';
  remainingAmount?: number;
  guestInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    idNumber?: string;
    tax_code?: string;
    address?: string;
    guestSource?: string;
  };
  guestSource?: string;
  servicesTotal?: number;
  createdAt: string;
  updatedAt: string;
}
