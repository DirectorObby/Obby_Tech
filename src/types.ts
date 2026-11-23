export type CategoryName = 'Phones' | 'PC & Laptops' | 'CCTV' | 'Accessories' | 'Services';

export interface Product {
  id: string;
  name: string;
  category: CategoryName;
  price: number; // in TSh
  description: string;
  specifications: string[];
  stock: number;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  condition: 'Brand New' | 'Refurbished' | 'Used';
  images: string[]; // Multiple image URLs or base64 data
  primaryImage: string;
  location: string; // e.g., "Dodoma, Dodoma Mjini"
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: CategoryName;
  icon: string;
  iconType?: 'emoji' | 'lucide' | 'image';
  description: string;
  imageUrl: string;
}

export type ServiceSlug =
  | 'mobile-phone-repair'
  | 'computer-laptop-repair'
  | 'graphic-design'
  | 'business-advertising'
  | 'tech-consultation'
  | 'video-photo-shooting';

export type ServiceIconName =
  | 'Smartphone'
  | 'Laptop'
  | 'Palette'
  | 'Megaphone'
  | 'GraduationCap'
  | 'Camera'
  | 'Video'
  | 'Wrench'
  | 'Shield'
  | 'Monitor'
  | 'Sparkles';

export interface ServiceShowcaseItem {
  id: string;
  title: string;
  description: string;
  price?: number;
  priceLabel?: string;
  image: string;
}

export interface ServiceItem {
  id: string;
  slug: ServiceSlug | string;
  title: string;
  description: string;
  iconName: ServiceIconName;
  requiresDeviceDetails: boolean;
  coverImage?: string;
  showcaseItems?: ServiceShowcaseItem[];
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ServiceBooking {
  id: string; // e.g. "BK-482910"
  customerId: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string;
  deviceDetails?: string;
  problemDescription: string;
  status: BookingStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoBanner {
  id: string;
  image: string;
  kickerEn: string;
  kickerSw: string;
  titleEn: string;
  titleSw: string;
  subtitleEn: string;
  subtitleSw: string;
  ctaEn: string;
  ctaSw: string;
  targetCategory: CategoryName | 'All';
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIInstruction {
  id: string;
  title: string;
  instruction: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
}

export type PaymentMethodType = 'M-Pesa' | 'Mixx by Yas' | 'Tigo Pesa' | 'Airtel Money' | 'HaloPesa' | 'Bank Transfer';

export type PaymentStatus = 'PENDING' | 'PAID';
export type DeliveryStatus = 'PENDING' | 'NOT_SHIPPED' | 'SHIPPED' | 'UMESAFIRISHWA';

export interface Order {
  id: string; // e.g. "APX1025"
  customerId: string;
  customerEmail?: string;
  customerName: string;
  phone: string;
  region: string;
  street: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethodType | string;
  paymentNumber?: string;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNotification {
  id: string;
  userId: string; // customer id, email, or admin email
  userEmail?: string;
  title: string;
  message: string;
  type:
    | 'order_received'
    | 'payment_confirmed'
    | 'order_shipped'
    | 'new_order_admin'
    | 'booking_received'
    | 'booking_updated'
    | 'new_booking_admin';
  read: boolean;
  createdAt: string;
  orderId?: string;
  bookingId?: string;
}

export interface PaymentAccount {
  id?: string;
  name?: string;
  provider?: string;
  enabled: boolean;
  number?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}

export interface PaymentSettings {
  mpesa: PaymentAccount;
  tigoPesa: PaymentAccount;
  airtelMoney: PaymentAccount;
  haloPesa: PaymentAccount;
  bank: PaymentAccount;
  customMethods?: PaymentAccount[];
}

export interface ContactSettings {
  phone: string;
  whatsapp: string;
  email: string;
  socialMedia: string;
  aboutText: string;
}

export interface DeliverySettings {
  darFee: number; // usually 0 or nominal
  outsideDarFee: number; // default TSh 10,000
  instructions: string;
}

export interface ServicesBannerSettings {
  kicker: string;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl?: string;
}

export interface AdminSettings {
  websiteLogo: string;
  websiteName: string; // OBBY TECH
  paymentSettings: PaymentSettings;
  contactSettings: ContactSettings;
  deliverySettings: DeliverySettings;
  servicesBanner?: ServicesBannerSettings;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role?: 'admin' | 'customer';
  mustChangePassword?: boolean;
  photo?: string;
  phone?: string;
  region?: string;
  street?: string;
  address?: string;
  authProvider: 'google' | 'facebook' | 'email';
  createdAt: string;
}

export interface CustomerProfile {
  id?: string;
  fullName: string;
  email?: string;
  role?: 'admin' | 'customer';
  mustChangePassword?: boolean;
  photo?: string;
  phone: string;
  region: string;
  street: string;
  address: string;
  authProvider?: 'google' | 'facebook' | 'email';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
