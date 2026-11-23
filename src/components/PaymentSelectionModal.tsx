import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Copy,
  ShoppingCart,
  Package,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Landmark,
} from 'lucide-react';
import { Order, PaymentSettings } from '../types';
import { api } from '../services/api';
import { buildActivePaymentOptions, PaymentOptionItem } from './CheckoutModal';
import { formatOrderDestination } from '../data/tanzaniaLocations';

interface PaymentSelectionModalProps {
  order: Order;
  paymentSettings: PaymentSettings;
  onClose: () => void;
  onViewOrders: () => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export const PaymentSelectionModal: React.FC<PaymentSelectionModalProps> = ({
  order,
  paymentSettings,
  onClose,
  onViewOrders,
  onOrderUpdated,
}) => {
  const paymentOptions = useMemo(
    () => buildActivePaymentOptions(paymentSettings),
    [paymentSettings]
  );

  const [selectedMethod, setSelectedMethod] = useState<string>(
    order.paymentMethod || paymentOptions[0]?.id || 'M-Pesa'
  );
  const [showMethodSwitcher, setShowMethodSwitcher] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);

  const activeOption: PaymentOptionItem =
    paymentOptions.find((opt) => {
      const s = selectedMethod.toLowerCase();
      if (opt.id.toLowerCase() === s || opt.label.toLowerCase() === s) return true;
      if ((s.includes('tigo') || s.includes('mixx') || s.includes('yas')) && opt.id === 'Mixx by Yas') {
        return true;
      }
      return false;
    }) || paymentOptions[0];

  const displayedNumber = order.paymentNumber && selectedMethod === order.paymentMethod
    ? order.paymentNumber
    : activeOption?.number || '0755123456';

  const handleSelectMethod = async (option: PaymentOptionItem) => {
    setSelectedMethod(option.id);
    setIsUpdatingMethod(true);
    try {
      const updated = await api.updateOrderPaymentMethod(order.id, option.id, option.number);
      if (onOrderUpdated) {
        onOrderUpdated(updated);
      }
      setShowMethodSwitcher(false);
    } catch (e) {
      console.error('Failed to update payment method for order:', e);
    } finally {
      setIsUpdatingMethod(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[95vh] h-[95vh] sm:h-auto flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Minimal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <span className="text-[13px] font-semibold text-gray-500">Order Confirmation</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close confirmation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Confirmation Content matching Screenshots */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-white">
          {/* Green Checkmark & Thank You Hero */}
          <div className="text-center space-y-2.5 pt-1">
            <div className="w-14 h-14 rounded-full bg-[#65C41C] text-white flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">
              Thank you!
            </h2>
            <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-sm mx-auto">
              Your order is confirmed. Thanks for ordering from Obby Tech. Please complete your
              payment using the official payment details below.
            </p>
          </div>

          {/* Bright Green Payment Instruction Banner (Replacing Promo Banner in Screenshot) */}
          <div className="bg-[#65C41C] text-white rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                  {activeOption?.label || selectedMethod} • {activeOption?.accountName || 'OBBY TECH'}
                </div>
                <div className="text-[20px] font-bold tabular-nums tracking-wide leading-tight">
                  {displayedNumber}
                </div>
                <div className="text-[12px] text-white/95 font-medium tabular-nums">
                  Amount to Pay: <strong>TSh {order.total.toLocaleString()}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(displayedNumber)}
                className="inline-flex items-center gap-1.5 bg-white text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg text-[12px] font-bold shadow-xs transition-colors flex-shrink-0 cursor-pointer"
              >
                {copiedText === displayedNumber ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#65C41C]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy No</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-white/25 flex items-center justify-between text-[11px]">
              <span className="text-white/95 font-medium">
                Status: PENDING PAYMENT CONFIRMATION
              </span>
              <button
                type="button"
                onClick={() => setShowMethodSwitcher(!showMethodSwitcher)}
                className="inline-flex items-center gap-1 font-bold underline underline-offset-2 text-white cursor-pointer"
              >
                <span>Change method</span>
                {showMethodSwitcher ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable Admin Payment Method Switcher */}
          {showMethodSwitcher && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="text-[12px] font-bold text-gray-900">
                Select Another Payment Method
              </div>
              {paymentOptions.map((option) => {
                const isSelected = activeOption?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isUpdatingMethod}
                    onClick={() => handleSelectMethod(option)}
                    className={`w-full text-left rounded-xl border-[1.5px] p-3 flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#8CD43D] bg-[#F9FDF4]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                        style={{ backgroundColor: option.accentColor }}
                      >
                        {option.isBank ? (
                          <Landmark className="w-3.5 h-3.5" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-gray-900 truncate">
                          {option.label}
                        </div>
                        <div className="text-[11.5px] text-gray-600 font-semibold tabular-nums">
                          {option.number} ({option.accountName})
                        </div>
                      </div>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#65C41C] text-white'
                          : 'border-2 border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Info Card 1: Your order is confirmed */}
          <div className="bg-[#F5F6F8] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-900">Your order is confirmed</h3>
            </div>
            <div className="text-[12.5px] text-gray-600 leading-relaxed space-y-1">
              <p>
                Your Order Number:{' '}
                <span className="font-bold text-gray-900 underline underline-offset-2">
                  #{order.id}
                </span>
                .
              </p>
              <p>Thanks for ordering from Obby Tech.</p>
              <p>
                Please complete your payment to <strong>{displayedNumber}</strong>. We are waiting
                for confirmation of your payment.
              </p>
              <p>Your order will be delivered in 1-3 business days once confirmed.</p>
            </div>
          </div>

          {/* Info Card 2: Order updates */}
          <div className="bg-[#F5F6F8] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-900">Order updates</h3>
            </div>
            <p className="text-[12.5px] text-gray-600 leading-relaxed">
              You&apos;ll get payment confirmation and shipping updates inside Notifications and My
              Orders.
            </p>
          </div>

          {/* Info Card 3: Customer information */}
          <div className="bg-[#F5F6F8] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-900">Customer information</h3>
            </div>
            <div className="text-[12.5px] text-gray-600 leading-relaxed space-y-1">
              <div>
                <span className="text-gray-500">Customer information:</span>{' '}
                <span className="text-gray-900 font-medium">{order.customerName}</span>
              </div>
              <div>
                <span className="text-gray-500">Phone number:</span>{' '}
                <span className="text-gray-900 font-medium tabular-nums">{order.phone}</span>
              </div>
              <div>
                <span className="text-gray-500">Shipping address:</span>{' '}
                <span className="text-gray-900 font-medium">
                  {formatOrderDestination(order.region, order.street)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Shipping method:</span>{' '}
                <span className="text-gray-900 font-medium">
                  {order.region.toLowerCase().includes('dodoma')
                    ? 'Standard Dodoma Shipping'
                    : 'Outside Dodoma Transport'}{' '}
                  (TSh {order.deliveryFee.toLocaleString()})
                </span>
              </div>
              <div>
                <span className="text-gray-500">Payment method:</span>{' '}
                <span className="text-gray-900 font-medium">
                  {activeOption?.label || selectedMethod} ({displayedNumber})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Dual Pill Buttons */}
        <div className="p-3.5 border-t border-gray-100 bg-white space-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewOrders();
            }}
            className="w-full bg-[#111827] text-white py-3 px-4 rounded-full font-semibold text-[13.5px] hover:bg-black transition-all text-center cursor-pointer"
          >
            View My Orders
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-white text-gray-900 border border-gray-900 py-2.5 px-4 rounded-full font-semibold text-[13.5px] hover:bg-gray-50 transition-all text-center cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
