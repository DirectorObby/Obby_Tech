import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  RefreshCw,
  Search,
  Trash2,
  Copy,
  Check,
  Calendar,
  Clock,
  Wrench,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { BookingStatus, Order, PaymentSettings, ServiceBooking } from '../types';
import { api } from '../services/api';
import { formatOrderDestination } from '../data/tanzaniaLocations';

interface OrdersViewProps {
  orders: Order[];
  bookings?: ServiceBooking[];
  paymentSettings?: PaymentSettings;
  whatsappNumber?: string;
  onRefreshOrders: () => void;
  onContinueShopping: () => void;
  onBrowseServices?: () => void;
  highlightedOrderId?: string | null;
  onClearHighlight?: () => void;
  highlightedBookingId?: string | null;
  onClearBookingHighlight?: () => void;
  initialSubTab?: 'orders' | 'bookings';
}

function formatWhatsAppTarget(rawNumber?: string): string {
  const digits = (rawNumber || '+255713340900').replace(/[^\d]/g, '');
  if (digits.startsWith('0') && digits.length >= 10) {
    return `255${digits.slice(1)}`;
  }
  return digits || '255713340900';
}

function getBookingStatusStyle(status: BookingStatus): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700';
    case 'IN_PROGRESS':
      return 'bg-indigo-50 text-indigo-700';
    case 'COMPLETED':
      return 'bg-[#65C41C]/15 text-[#3F830D]';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700';
    case 'PENDING':
    default:
      return 'bg-amber-50 text-amber-700';
  }
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  bookings = [],
  paymentSettings,
  whatsappNumber,
  onRefreshOrders,
  onContinueShopping,
  onBrowseServices,
  highlightedOrderId,
  onClearHighlight,
  highlightedBookingId,
  onClearBookingHighlight,
  initialSubTab = 'orders',
}) => {
  const [subTab, setSubTab] = useState<'orders' | 'bookings'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<ServiceBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (highlightedBookingId) {
      setSubTab('bookings');
    } else if (highlightedOrderId) {
      setSubTab('orders');
    }
  }, [highlightedOrderId, highlightedBookingId]);

  const sortedOrders = useMemo(() => {
    const base = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const term = searchTerm.toLowerCase().trim();
    if (!term) return base;
    return base.filter(
      (o) =>
        o.id.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        o.phone.toLowerCase().includes(term) ||
        o.items.some((i) => i.productName.toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  const sortedBookings = useMemo(() => {
    const base = [...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const term = searchTerm.toLowerCase().trim();
    if (!term) return base;
    return base.filter(
      (b) =>
        b.id.toLowerCase().includes(term) ||
        b.serviceName.toLowerCase().includes(term) ||
        (b.deviceDetails || '').toLowerCase().includes(term) ||
        b.problemDescription.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  useEffect(() => {
    if (!highlightedOrderId) return;
    const timer = setTimeout(() => {
      const targetEl = document.getElementById(`order-card-${highlightedOrderId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);

    const clearTimer = setTimeout(() => {
      onClearHighlight?.();
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [highlightedOrderId, sortedOrders.length]);

  useEffect(() => {
    if (!highlightedBookingId) return;
    const timer = setTimeout(() => {
      const targetEl = document.getElementById(`booking-card-${highlightedBookingId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);

    const clearTimer = setTimeout(() => {
      onClearBookingHighlight?.();
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, [highlightedBookingId, sortedBookings.length]);

  const getOrderPaymentNumber = (order: Order): string => {
    if (order.paymentNumber) return order.paymentNumber;
    const method = (order.paymentMethod || '').toLowerCase();
    if (paymentSettings) {
      if (paymentSettings.customMethods && Array.isArray(paymentSettings.customMethods)) {
        const custom = paymentSettings.customMethods.find(
          (m) => m.name && method.includes(m.name.toLowerCase())
        );
        if (custom) return custom.number || custom.accountNumber || '';
      }
      if (method.includes('m-pesa') || method.includes('mpesa') || method.includes('vodacom')) {
        return paymentSettings.mpesa?.number || '0755123456';
      }
      if (method.includes('mixx') || method.includes('yas') || method.includes('tigo')) {
        return paymentSettings.tigoPesa?.number || '0655123456';
      }
      if (method.includes('airtel')) {
        return paymentSettings.airtelMoney?.number || '0788123456';
      }
      if (method.includes('halo')) {
        return paymentSettings.haloPesa?.number || '0622123456';
      }
      if (method.includes('bank') || method.includes('crdb') || method.includes('nmb')) {
        return paymentSettings.bank?.accountNumber || '0150123456700';
      }
    }
    if (method.includes('mixx') || method.includes('yas') || method.includes('tigo')) return '0655123456';
    if (method.includes('airtel')) return '0788123456';
    if (method.includes('halo')) return '0622123456';
    if (method.includes('bank') || method.includes('crdb') || method.includes('nmb')) return '0150123456700';
    return '0755123456';
  };

  const formatMethodDisplay = (methodName?: string): string => {
    if (!methodName) return 'Vodacom M-Pesa';
    if (methodName.trim().toLowerCase() === 'tigo pesa') return 'Mixx by Yas';
    return methodName;
  };

  const handleCopyPaymentNo = (orderId: string, paymentNo: string) => {
    navigator.clipboard.writeText(paymentNo);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 1800);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteOrder(orderToDelete.id);
      onRefreshOrders();
      setOrderToDelete(null);
    } catch (e) {
      console.error('Failed to delete order:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteBooking(bookingToDelete.id);
      onRefreshOrders();
      setBookingToDelete(null);
    } catch (e) {
      console.error('Failed to delete booking:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const buildBookingWhatsAppUrl = (booking: ServiceBooking): string => {
    const cleanTarget = formatWhatsAppTarget(whatsappNumber);
    const lines = [
      'Hello *OBBY TECH*, following up on my service booking:',
      '',
      `*Booking Ref:* #${booking.id}`,
      `*Service:* ${booking.serviceName}`,
      `*Date:* ${booking.bookingDate} at ${booking.bookingTime}`,
      `*Customer:* ${booking.customerName} (${booking.phone})`,
    ];
    if (booking.deviceDetails) lines.push(`*Device:* ${booking.deviceDetails}`);
    lines.push(`*Details:* ${booking.problemDescription}`);
    lines.push(`*Current Status:* ${booking.status}`);
    return `https://wa.me/${cleanTarget}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  return (
    <div className="bg-[#F2F6FC] min-h-[82vh] max-w-2xl mx-auto pb-28">
      {/* Header matching CartView */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#DCE7F7] sticky top-0 bg-white z-10">
        <div>
          <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">
            {subTab === 'orders' ? 'My Orders' : 'My Service Bookings'}
          </h1>
          <p className="text-[11px] text-gray-500">
            {subTab === 'orders'
              ? 'Track your private payment & delivery status'
              : 'Track your service appointments & repair status'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshOrders}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-[#EAF2FF] rounded-full transition-colors cursor-pointer"
          title="Refresh"
          aria-label="Refresh Orders and Bookings"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Product Orders | Service Bookings Switch */}
      <div className="px-3 pt-3">
        <div className="grid grid-cols-2 bg-white border border-[#DCE7F7] p-1 rounded-full gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setSubTab('orders')}
            className={`py-2 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'orders'
                ? 'bg-[#0B3B8C] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Product Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('bookings')}
            className={`py-2 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'bookings'
                ? 'bg-[#111827] text-white shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Service Bookings ({bookings.length})
          </button>
        </div>
      </div>

      {/* Private Local Filter Bar */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              subTab === 'orders'
                ? 'Filter your orders by #ID or product name...'
                : 'Filter your bookings by #BK ref or service...'
            }
            className="w-full bg-white border border-[#DCE7F7] text-[13px] font-medium text-gray-900 pl-10 pr-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0B3B8C] placeholder-gray-400 shadow-2xs"
          />
        </div>
      </div>

      {/* PRODUCT ORDERS LIST */}
      {subTab === 'orders' && (
        <>
          {sortedOrders.length === 0 ? (
            <div className="min-h-[45vh] flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-white border border-[#DCE7F7] rounded-2xl p-7 max-w-sm w-full shadow-xs flex flex-col items-center">
                <div className="w-16 h-16 bg-[#EAF2FF] rounded-full flex items-center justify-center mb-3.5">
                  <Package className="w-7 h-7 text-[#1565C0]" />
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">No Orders Found</h2>
                <p className="text-xs text-gray-500 mb-5 max-w-xs leading-relaxed">
                  {searchTerm
                    ? `No orders in your account match "${searchTerm}".`
                    : 'You have not placed any product orders yet. Browse Obby Tech products to get started.'}
                </p>
                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="bg-[#0B3B8C] text-white font-semibold text-sm px-7 py-3 rounded-full hover:bg-[#082E6E] transition-colors cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-3 pt-1">
              {sortedOrders.map((order) => {
                const isPaid = order.paymentStatus === 'PAID';
                const isShipped =
                  order.deliveryStatus === 'SHIPPED' || order.deliveryStatus === 'UMESAFIRISHWA';
                const paymentNo = getOrderPaymentNumber(order);
                const cleanDestination = formatOrderDestination(order.region, order.street);
                const isCopied = copiedOrderId === order.id;
                const isHighlighted = highlightedOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    id={`order-card-${order.id}`}
                    className={`bg-white border rounded-2xl p-4 space-y-3.5 scroll-mt-24 shadow-2xs transition-colors ${
                      isHighlighted
                        ? 'bg-[#F9FDF4] border-[#65C41C]/50 ring-1 ring-[#65C41C]/40'
                        : 'border-[#DCE7F7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-gray-900 tracking-tight">
                            Order #{order.id}
                          </span>
                          {isHighlighted && (
                            <span className="text-[10px] font-bold bg-[#65C41C] text-white px-2 py-0.5 rounded-full">
                              Latest Order
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                          {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-[#65C41C]/15 text-[#3F830D]'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'PENDING'}
                        </span>
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                            isShipped
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-[#F5F6F8] text-gray-500'
                          }`}
                        >
                          {isShipped ? 'SHIPPED' : 'NOT SHIPPED'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-20 h-20 rounded-lg bg-[#F5F6F8] flex-shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                            <img
                              src={
                                item.productImage ||
                                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'
                              }
                              alt={item.productName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[76px]">
                            <div>
                              <h3 className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">
                                {item.productName}
                              </h3>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Obby Tech Official · Qty: {item.quantity}
                              </p>
                            </div>

                            <div className="text-[14px] font-bold text-[#1565C0] tabular-nums mt-1">
                              TSh {(item.price * item.quantity).toLocaleString()}
                              {item.quantity > 1 && (
                                <span className="text-[11px] font-normal text-gray-400 ml-1.5">
                                  (TSh {item.price.toLocaleString()} each)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#F5F6F8] rounded-xl p-3.5 space-y-1.5 text-[12px] text-gray-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500 flex-shrink-0">Customer</span>
                        <span className="font-semibold text-gray-900 text-right truncate">
                          {order.customerName}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500 flex-shrink-0">Destination</span>
                        <span className="font-medium text-gray-800 text-right leading-snug">
                          {cleanDestination}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500 flex-shrink-0">Payment Method</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {formatMethodDisplay(order.paymentMethod)}
                        </span>
                      </div>

                      <div className="pt-1.5 mt-1 border-t border-gray-200/70 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Payment</span>
                          <span
                            className={`font-semibold text-right ${
                              isPaid ? 'text-[#3F830D]' : 'text-amber-700'
                            }`}
                          >
                            {isPaid
                              ? 'PAID (Confirmed by Admin)'
                              : 'PENDING (Waiting for payment confirmation)'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Payment No:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 tabular-nums">{paymentNo}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyPaymentNo(order.id, paymentNo)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-[10.5px] font-semibold text-gray-700 cursor-pointer transition-colors"
                              aria-label={`Copy payment number ${paymentNo}`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-[#65C41C]" />
                                  <span className="text-[#65C41C]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-gray-500" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-500">Delivery</span>
                          <span
                            className={`font-medium text-right ${
                              isShipped ? 'text-blue-700 font-semibold' : 'text-gray-600'
                            }`}
                          >
                            {isShipped
                              ? 'SHIPPED (Sent to transport / bus station)'
                              : 'NOT SHIPPED (Processing in warehouse)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div>
                        <div className="text-[11px] text-gray-400 font-medium leading-none mb-1">
                          Total Amount
                        </div>
                        <div className="text-[16px] font-bold text-[#1565C0] tabular-nums leading-none">
                          TSh {order.total.toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
                        title="Delete Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Order</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SERVICE BOOKINGS LIST */}
      {subTab === 'bookings' && (
        <>
          {sortedBookings.length === 0 ? (
            <div className="min-h-[45vh] flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-white border border-[#DCE7F7] rounded-2xl p-7 max-w-sm w-full shadow-xs flex flex-col items-center">
                <div className="w-16 h-16 bg-[#EAF2FF] rounded-full flex items-center justify-center mb-3.5">
                  <Wrench className="w-7 h-7 text-[#1565C0]" />
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">No Service Bookings Yet</h2>
                <p className="text-xs text-gray-500 mb-5 max-w-xs leading-relaxed">
                  {searchTerm
                    ? `No bookings in your account match "${searchTerm}".`
                    : 'Book phone/laptop repairs, graphic design, business ads, or technology consultation anytime.'}
                </p>
                <button
                  type="button"
                  onClick={() => (onBrowseServices ? onBrowseServices() : onContinueShopping())}
                  className="bg-[#0B3B8C] text-white font-semibold text-sm px-7 py-3 rounded-full hover:bg-[#082E6E] transition-colors cursor-pointer"
                >
                  Browse Services
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-3 pt-1">
              {sortedBookings.map((booking) => {
                const isHighlighted = highlightedBookingId === booking.id;
                return (
                  <div
                    key={booking.id}
                    id={`booking-card-${booking.id}`}
                    className={`bg-white border rounded-2xl p-4 space-y-3.5 scroll-mt-24 shadow-2xs transition-colors ${
                      isHighlighted
                        ? 'bg-[#F0F7FF] border-[#1565C0]/40 ring-1 ring-[#1565C0]/30'
                        : 'border-[#DCE7F7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-gray-900 tracking-tight">
                            Booking #{booking.id}
                          </span>
                          {isHighlighted && (
                            <span className="text-[10px] font-bold bg-[#1565C0] text-white px-2 py-0.5 rounded-full">
                              New Booking
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                          Submitted {new Date(booking.createdAt).toLocaleDateString()} ·{' '}
                          {new Date(booking.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <span
                        className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase ${getBookingStatusStyle(
                          booking.status
                        )}`}
                      >
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-[#F5F6F8] rounded-xl p-3.5 space-y-2 text-[12px] text-gray-700">
                      <div className="font-bold text-gray-900 text-[13.5px]">
                        {booking.serviceName}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-gray-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#1565C0]" />
                          {booking.bookingDate}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#1565C0]" />
                          {booking.bookingTime}
                        </span>
                        {booking.deviceDetails && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                            {booking.deviceDetails}
                          </span>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-gray-200/70">
                        <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">
                          Service / Problem Details:
                        </span>
                        <p className="text-gray-800 leading-relaxed">{booking.problemDescription}</p>
                      </div>

                      {booking.adminNotes && (
                        <div className="pt-1.5 border-t border-gray-200/70 bg-white/80 rounded-lg p-2.5">
                          <span className="text-[10.5px] font-bold text-[#1565C0] uppercase block mb-0.5">
                            OBBY TECH Technician Note:
                          </span>
                          <p className="text-gray-800">{booking.adminNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <a
                        href={buildBookingWhatsAppUrl(booking)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#25D366] hover:bg-[#1fb857] text-white transition-colors shadow-2xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat on WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setBookingToDelete(booking)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Order Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Delete this order?</h3>
                <p className="text-[11px] text-gray-500 tabular-nums">Order #{orderToDelete.id}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F5F6F8] rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Items:</span>
                <span className="font-semibold text-gray-900 truncate max-w-[180px]">
                  {orderToDelete.items.map((i) => i.productName).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Total:</span>
                <span className="font-bold text-[#1565C0] tabular-nums">
                  TSh {orderToDelete.total.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[12px] text-gray-600 leading-relaxed">
              Are you sure you want to delete order <strong>#{orderToDelete.id}</strong>? This
              action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 bg-[#F5F6F8] hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Confirmation Dialog */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Delete this booking?</h3>
                <p className="text-[11px] text-gray-500 tabular-nums">Booking #{bookingToDelete.id}</p>
              </div>
            </div>

            <div className="p-3 bg-[#F5F6F8] rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-900">{bookingToDelete.serviceName}</div>
              <div className="text-gray-500">
                {bookingToDelete.bookingDate} at {bookingToDelete.bookingTime}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBookingToDelete(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-gray-700 bg-[#F5F6F8] hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteBooking}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
