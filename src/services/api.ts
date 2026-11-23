import {
  AIInstruction,
  AdminSettings,
  BookingStatus,
  CategoryItem,
  CustomerNotification,
  CustomerProfile,
  DeliveryStatus,
  Order,
  PaymentStatus,
  Product,
  PromoBanner,
  ServiceBooking,
  ServiceItem,
} from '../types';

export const OFFICIAL_ADMIN_EMAIL = 'obbyitmasters@gmail.com';

export const isOfficialAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL.toLowerCase();
};

// Server-verified session token held strictly in JS memory
let inMemorySessionToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemorySessionToken = token;
};

export const getAuthToken = (): string | null => inMemorySessionToken;

export const clearAuthToken = () => {
  inMemorySessionToken = null;
  try {
    localStorage.removeItem('appex_auth_user');
    localStorage.removeItem('appex_session_token');
    localStorage.removeItem('appex_admin_token');
    sessionStorage.removeItem('appex_admin_session_token');
  } catch {
    // ignore storage errors
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (inMemorySessionToken) {
    headers['Authorization'] = `Bearer ${inMemorySessionToken}`;
  }
  return headers;
};

export interface AuthResponse {
  success: boolean;
  user: CustomerProfile;
  token: string;
  isAdmin?: boolean;
  adminUnlocked?: boolean;
  mustChangePassword?: boolean;
}

export const api = {
  // Auth API
  googleAuth: async (tokenPayload: { idToken?: string; accessToken?: string; credential?: string }): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google authentication failed');
    if (data.token) setAuthToken(data.token);
    return data;
  },

  emailRegister: async (registerData: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    region?: string;
    street?: string;
    address?: string;
  }): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/email/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email registration failed');
    if (data.token) setAuthToken(data.token);
    return data;
  },

  emailLogin: async (loginData: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/email/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email login failed');
    if (data.token) setAuthToken(data.token);
    return data;
  },

  updateProfile: async (
    profileData: Partial<CustomerProfile>
  ): Promise<{ success: boolean; user: CustomerProfile; isAdmin?: boolean }> => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Profile update failed');
    return data;
  },

  getCurrentUser: async (): Promise<{
    success: boolean;
    user: CustomerProfile;
    isAdmin?: boolean;
    adminUnlocked?: boolean;
    mustChangePassword?: boolean;
  }> => {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session expired');
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      clearAuthToken();
    }
  },

  // Products
  getProducts: async (category?: string, search?: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  getProductById: async (id: string): Promise<Product> => {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Failed to fetch product details');
    return res.json();
  },

  createProduct: async (productData: Partial<Product>): Promise<Product> => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create product');
    return data;
  },

  updateProduct: async (id: string, productData: Partial<Product>): Promise<Product> => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update product');
    return data;
  },

  deleteProduct: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete product');
    return data;
  },

  // Categories
  getCategories: async (): Promise<CategoryItem[]> => {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  updateCategory: async (id: string, categoryData: Partial<CategoryItem>): Promise<CategoryItem> => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update category');
    return data;
  },

  // Services & Bookings
  getServices: async (): Promise<ServiceItem[]> => {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Failed to fetch services');
    return res.json();
  },

  createService: async (serviceData: Partial<ServiceItem>): Promise<ServiceItem> => {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(serviceData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create service');
    return data;
  },

  updateService: async (id: string, serviceData: Partial<ServiceItem>): Promise<ServiceItem> => {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(serviceData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update service');
    return data;
  },

  deleteService: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete service');
    return data;
  },

  getBookings: async (adminView?: boolean): Promise<ServiceBooking[]> => {
    const params = new URLSearchParams();
    if (adminView) params.append('admin', 'true');
    const res = await fetch(`/api/bookings?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return res.json();
  },

  submitBooking: async (bookingData: {
    serviceId: string;
    serviceName: string;
    bookingDate: string;
    bookingTime: string;
    customerName: string;
    phone: string;
    deviceDetails?: string;
    problemDescription: string;
  }): Promise<ServiceBooking> => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit booking');
    return data;
  },

  updateBookingStatus: async (
    bookingId: string,
    updates: { status?: BookingStatus; adminNotes?: string }
  ): Promise<ServiceBooking> => {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update booking');
    return data;
  },

  deleteBooking: async (bookingId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete booking');
    return data;
  },

  // Promotional Banners
  getBanners: async (includeAll?: boolean): Promise<PromoBanner[]> => {
    const url = includeAll ? '/api/banners?all=true' : '/api/banners';
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch banners');
    return res.json();
  },

  createBanner: async (bannerData: Partial<PromoBanner>): Promise<PromoBanner> => {
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bannerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create banner');
    return data;
  },

  updateBanner: async (id: string, bannerData: Partial<PromoBanner>): Promise<PromoBanner> => {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bannerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update banner');
    return data;
  },

  deleteBanner: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete banner');
    return data;
  },

  // AI Instructions
  getAiInstructions: async (): Promise<AIInstruction[]> => {
    const res = await fetch('/api/ai/instructions', {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch AI instructions');
    return data;
  },

  createAiInstruction: async (payload: {
    title: string;
    instruction: string;
    enabled?: boolean;
  }): Promise<AIInstruction> => {
    const res = await fetch('/api/ai/instructions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create AI instruction');
    return data;
  },

  updateAiInstruction: async (id: string, payload: Partial<AIInstruction>): Promise<AIInstruction> => {
    const res = await fetch(`/api/ai/instructions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update AI instruction');
    return data;
  },

  deleteAiInstruction: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/ai/instructions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete AI instruction');
    return data;
  },

  // Orders
  getOrders: async (adminView?: boolean): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (adminView) params.append('admin', 'true');

    const res = await fetch(`/api/orders?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  submitOrder: async (orderData: Partial<Order>): Promise<Order> => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit order');
    return data;
  },

  updateOrderStatus: async (
    orderId: string,
    statusUpdates: { paymentStatus?: PaymentStatus; deliveryStatus?: DeliveryStatus }
  ): Promise<Order> => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(statusUpdates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update order status');
    return data;
  },

  updateOrderPaymentMethod: async (
    orderId: string,
    paymentMethod: string,
    paymentNumber?: string
  ): Promise<Order> => {
    const res = await fetch(`/api/orders/${orderId}/payment-method`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paymentMethod, paymentNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update order payment method');
    return data;
  },

  deleteOrder: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete order');
    return data;
  },

  // Notifications
  getNotifications: async (adminView?: boolean): Promise<CustomerNotification[]> => {
    const params = new URLSearchParams();
    if (adminView) params.append('admin', 'true');

    const res = await fetch(`/api/notifications?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete notification');
    }
    return res.json();
  },

  // Admin Settings
  getSettings: async (): Promise<AdminSettings> => {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  // Admin Auth
  adminLogin: async (password: string): Promise<{ success: boolean; token?: string; mustChangePassword?: boolean }> => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Admin login failed');
    return data;
  },

  changeAdminPassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; mustChangePassword?: boolean }> => {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
  },

  // Obby Ai Chat Assistant
  sendAppexAiMessage: async (message: string): Promise<{ reply: string }> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to query Obby Ai assistant');
    return res.json();
  },
};
