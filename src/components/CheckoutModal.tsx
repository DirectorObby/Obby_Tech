import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  Copy,
  AlertCircle,
  Smartphone,
  Landmark,
} from 'lucide-react';
import {
  CustomerProfile,
  DeliverySettings,
  OrderItem,
  PaymentSettings,
} from '../types';
import {
  TANZANIA_REGIONS,
  getDistrictsForRegion,
  extractCleanStreet,
  formatOrderDestination,
} from '../data/tanzaniaLocations';

export interface PaymentOptionItem {
  id: string;
  label: string;
  sublabel: string;
  number: string;
  accountName: string;
  isBank: boolean;
  accentColor: string;
}

export function buildActivePaymentOptions(paymentSettings: PaymentSettings): PaymentOptionItem[] {
  const options: PaymentOptionItem[] = [];

  if (paymentSettings.mpesa?.enabled) {
    options.push({
      id: 'M-Pesa',
      label: 'Vodacom M-Pesa',
      sublabel: 'Lipa kwa M-Pesa',
      number: paymentSettings.mpesa.number || '0755123456',
      accountName: paymentSettings.mpesa.accountName || 'OBBY TECH',
      isBank: false,
      accentColor: '#E60000',
    });
  }
  if (paymentSettings.tigoPesa?.enabled) {
    options.push({
      id: 'Mixx by Yas',
      label: 'Mixx by Yas',
      sublabel: 'Yas Mobile Money',
      number: paymentSettings.tigoPesa.number || '0655123456',
      accountName: paymentSettings.tigoPesa.accountName || 'OBBY TECH',
      isBank: false,
      accentColor: '#0056A6',
    });
  }
  if (paymentSettings.airtelMoney?.enabled) {
    options.push({
      id: 'Airtel Money',
      label: 'Airtel Money',
      sublabel: 'Airtel Money Tanzania',
      number: paymentSettings.airtelMoney.number || '0788123456',
      accountName: paymentSettings.airtelMoney.accountName || 'OBBY TECH',
      isBank: false,
      accentColor: '#D92323',
    });
  }
  if (paymentSettings.haloPesa?.enabled) {
    options.push({
      id: 'HaloPesa',
      label: 'HaloPesa',
      sublabel: 'Halotel HaloPesa',
      number: paymentSettings.haloPesa.number || '0622123456',
      accountName: paymentSettings.haloPesa.accountName || 'OBBY TECH',
      isBank: false,
      accentColor: '#F36F21',
    });
  }
  if (paymentSettings.bank?.enabled) {
    options.push({
      id: 'Bank Transfer',
      label: paymentSettings.bank.bankName
        ? `Bank Transfer (${paymentSettings.bank.bankName})`
        : 'Bank Transfer',
      sublabel: paymentSettings.bank.bankName || 'CRDB Bank Tanzania',
      number: paymentSettings.bank.accountNumber || '0150123456700',
      accountName: paymentSettings.bank.accountName || 'OBBY TECH',
      isBank: true,
      accentColor: '#059669',
    });
  }

  if (Array.isArray(paymentSettings.customMethods)) {
    paymentSettings.customMethods.forEach((custom, idx) => {
      if (custom.enabled !== false && (custom.name || custom.number || custom.accountNumber)) {
        const label = custom.name || custom.provider || `Payment Method ${idx + 1}`;
        options.push({
          id: label,
          label,
          sublabel: custom.provider || 'Mobile / Merchant Payment',
          number: custom.number || custom.accountNumber || '',
          accountName: custom.accountName || 'OBBY TECH',
          isBank: Boolean(custom.bankName && !custom.number),
          accentColor: '#111827',
        });
      }
    });
  }

  // Fallback if admin disabled everything accidentally
  if (options.length === 0) {
    options.push({
      id: 'M-Pesa',
      label: 'Vodacom M-Pesa',
      sublabel: 'Lipa kwa M-Pesa',
      number: paymentSettings.mpesa?.number || '0755123456',
      accountName: 'OBBY TECH',
      isBank: false,
      accentColor: '#E60000',
    });
  }

  return options;
}

interface CheckoutModalProps {
  items: OrderItem[];
  deliverySettings: DeliverySettings;
  paymentSettings: PaymentSettings;
  customerProfile: CustomerProfile;
  onClose: () => void;
  onSubmitOrder: (customerData: {
    fullName: string;
    phone: string;
    region: string;
    street: string;
    email?: string;
    paymentMethod: string;
    paymentNumber: string;
  }) => Promise<void> | void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  deliverySettings,
  paymentSettings,
  customerProfile,
  onClose,
  onSubmitOrder,
}) => {
  const splitName = (customerProfile.fullName || '').trim().split(/\s+/);
  const initialFirstName = splitName[0] || '';
  const initialLastName = splitName.slice(1).join(' ') || '';

  const cleanInitialPhone = (customerProfile.phone || '').replace(/^\+255/, '').trim();
  const initialRegion =
    customerProfile.region && TANZANIA_REGIONS.includes(customerProfile.region)
      ? customerProfile.region
      : 'Dodoma';
  const initialDistricts = getDistrictsForRegion(initialRegion);
  const initialCleanStreet = extractCleanStreet(
    customerProfile.street,
    initialRegion,
    initialDistricts
  );

  // Always start on the Shipping Address form so the customer reviews/edits & clicks Save before placing every order
  const [step, setStep] = useState<'shipping' | 'review'>('shipping');

  // Shipping Form States
  const [email, setEmail] = useState(customerProfile.email || '');
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [region, setRegion] = useState(initialRegion);
  const [district, setDistrict] = useState(initialDistricts[0] || '');
  const [street, setStreet] = useState(initialCleanStreet);
  const [areaCode, setAreaCode] = useState('+255');
  const [phoneInput, setPhoneInput] = useState(cleanInitialPhone);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment Selection States (Admin-configured methods)
  const paymentOptions = useMemo(
    () => buildActivePaymentOptions(paymentSettings),
    [paymentSettings]
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(
    paymentOptions[0]?.id || 'M-Pesa'
  );
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPayment =
    paymentOptions.find((p) => p.id === selectedPaymentId) || paymentOptions[0];

  const activeDistricts = useMemo(() => getDistrictsForRegion(region), [region]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isOutsideDodoma = !region.toLowerCase().includes('dodoma');
  const deliveryFee = isOutsideDodoma
    ? deliverySettings.outsideDarFee ?? 10000
    : deliverySettings.darFee ?? 0;
  const total = subtotal + deliveryFee;

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const formattedPhone = phoneInput.trim().startsWith('0')
    ? phoneInput.trim()
    : phoneInput.trim().startsWith('+')
    ? phoneInput.trim()
    : `0${phoneInput.trim()}`;

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion);
    const nextDistricts = getDistrictsForRegion(nextRegion);
    setDistrict(nextDistricts[0] || '');
  };

  const handleSaveShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setErrorMsg('Please enter your First Name.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg('Please enter your Last Name.');
      return;
    }
    if (!region.trim()) {
      setErrorMsg('Please select your Region (Mkoa).');
      return;
    }
    if (!district.trim()) {
      setErrorMsg('Please select your District (Wilaya).');
      return;
    }
    if (!street.trim()) {
      setErrorMsg('Please enter your Street / Ward Address.');
      return;
    }
    if (!phoneInput.trim() || phoneInput.trim().length < 9) {
      setErrorMsg('Please enter a valid Phone Number.');
      return;
    }
    setErrorMsg('');
    setStep('review');
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedNumber(text);
    setTimeout(() => setCopiedNumber(null), 1800);
  };

  const handlePlaceOrder = async () => {
    if (!selectedPayment || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const cleanWardStreet = extractCleanStreet(street, region, activeDistricts);
      const formattedStreet = [cleanWardStreet, district.trim()].filter(Boolean).join(', ');
      await onSubmitOrder({
        fullName: fullName || firstName.trim(),
        phone: formattedPhone,
        region: region.trim(),
        street: formattedStreet || street.trim(),
        email: email.trim() || undefined,
        paymentMethod: selectedPayment.id,
        paymentNumber: selectedPayment.number,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewShipTo = formatOrderDestination(
    region,
    [extractCleanStreet(street, region, activeDistricts), district].filter(Boolean).join(', ')
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[95vh] h-[95vh] sm:h-auto flex flex-col overflow-hidden shadow-2xl relative">
        {step === 'shipping' ? (
          <>
            {/* STEP 1: Add Shipping Address Header */}
            <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
              <h2 className="text-[16px] font-bold text-gray-900">Add Shipping Address</h2>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close checkout"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shipping Address Form */}
            <form
              onSubmit={handleSaveShipping}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-white"
            >
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[12px] font-medium text-gray-800 mb-1">
                  Email Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                />
              </div>

              {/* Set as default checkbox */}
              <button
                type="button"
                onClick={() => setSetAsDefault(!setAsDefault)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    setAsDefault
                      ? 'bg-gray-800 text-white'
                      : 'border border-gray-400 bg-white'
                  }`}
                >
                  {setAsDefault && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="text-[12px] text-gray-500">Set as default</span>
              </button>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    First Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    Last Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                  />
                </div>
              </div>

              {/* Region (Mkoa) & District (Wilaya) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    Region (Mkoa)<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900"
                  >
                    {TANZANIA_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    District (Wilaya)<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900"
                  >
                    {activeDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Street / Ward Address */}
              <div>
                <label className="block text-[12px] font-medium text-gray-800 mb-1">
                  Street / Ward Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ward, street name, house no. or landmark"
                  className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900 transition-colors"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Detailed street address helps our rider or regional courier reach you quickly.
                </p>
              </div>

              {/* Area Code & Phone Number */}
              <div className="flex gap-3">
                <div className="w-24 flex-shrink-0">
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    Area Code<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-medium text-gray-800 mb-1">
                    Phone Number<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0755123456"
                    className="w-full bg-white border border-gray-300 text-[13px] text-gray-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-gray-900 tabular-nums"
                  />
                </div>
              </div>

              {/* Bottom Save Button */}
              <div className="pt-3 pb-1">
                <button
                  type="submit"
                  className="w-full bg-[#111827] text-white py-3.5 px-4 rounded-xl font-semibold text-[14px] hover:bg-black transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* STEP 2: Review & Payments Header */}
            <div className="relative flex items-center justify-between px-3 py-3.5 border-b border-gray-200 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setStep('shipping')}
                className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Edit shipping address"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[16px] font-bold text-gray-900">Review &amp; Payments</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close checkout"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Review Body */}
            <div className="flex-1 overflow-y-auto bg-[#F5F6F8] p-3 space-y-3">
              {/* Card 1: Shipping Address */}
              <div
                onClick={() => setStep('shipping')}
                className="bg-white rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer hover:bg-gray-50/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 pr-3">
                    <h3 className="text-[14px] font-bold text-gray-900 mb-2">Shipping Address</h3>
                    {email && (
                      <div className="text-[12px] text-gray-700">
                        <span className="font-semibold text-gray-900">Contact:</span> {email}
                      </div>
                    )}
                    <div className="text-[12px] text-gray-700">
                      <span className="font-semibold text-gray-900">Name:</span> {fullName}
                    </div>
                    <div className="text-[12px] text-gray-700 tabular-nums">
                      <span className="font-semibold text-gray-900">Phone:</span> {formattedPhone}
                    </div>
                    <div className="text-[12px] text-gray-700 leading-snug">
                      <span className="font-semibold text-gray-900">Ship to:</span> {reviewShipTo}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </div>
              </div>

              {/* Card 2: Order Items */}
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-[#F5F6F8] flex-shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[13px] font-medium text-gray-900 line-clamp-1">
                        {item.productName}
                      </div>
                      <div className="text-[12px] text-gray-400 tabular-nums">
                        Qty: {item.quantity}
                      </div>
                      <div className="text-[14px] font-bold text-[#1565C0] tabular-nums">
                        TSh {(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card 3: Shipping Method */}
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2.5">
                <h3 className="text-[14px] font-bold text-gray-900">Shipping Method</h3>
                <div className="border-[1.5px] border-[#8CD43D] bg-[#F9FDF4] rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">
                      Standard Shipping
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {isOutsideDodoma
                        ? 'Regional Bus / Courier Transport from Dodoma'
                        : 'Dodoma Express Delivery'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-bold text-[#1565C0] tabular-nums">
                      TSh {deliveryFee.toLocaleString()}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[#65C41C] text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Payment Method (Admin-Configured Payment Numbers) */}
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-gray-900">Payment Method</h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Official Obby Tech Numbers
                  </span>
                </div>

                <div className="space-y-2.5">
                  {paymentOptions.map((option) => {
                    const isSelected = selectedPayment?.id === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setSelectedPaymentId(option.id)}
                        className={`rounded-xl border-[1.5px] p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#8CD43D] bg-[#F9FDF4]'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                              style={{ backgroundColor: option.accentColor }}
                            >
                              {option.isBank ? (
                                <Landmark className="w-4 h-4" />
                              ) : (
                                <Smartphone className="w-4 h-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[13px] font-bold text-gray-900 truncate">
                                {option.label}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate">
                                {option.accountName}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#65C41C] text-white'
                                : 'border-2 border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                        </div>

                        {/* Admin-configured Payment Number Row */}
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200/70 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                              {option.isBank ? 'Account Number' : 'Payment Number'}
                            </div>
                            <div className="text-[14px] font-bold text-gray-900 tabular-nums tracking-wide">
                              {option.number}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, option.number)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer"
                          >
                            {copiedNumber === option.number ? (
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
                    );
                  })}
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
                  Send <strong className="text-[#1565C0]">TSh {total.toLocaleString()}</strong> to{' '}
                  <strong className="text-gray-900">{selectedPayment?.number}</strong> (
                  {selectedPayment?.label}). Your payment number will also be saved in your order
                  and notification.
                </p>
              </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0 relative">
              {showBreakdown && (
                <div className="mb-3 pb-3 border-b border-gray-100 space-y-1.5 text-[12px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-[#1565C0] tabular-nums">
                      TSh {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping ({isOutsideDodoma ? 'Outside Dodoma' : 'Dodoma'})</span>
                    <span className="font-semibold text-[#1565C0] tabular-nums">
                      TSh {deliveryFee.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[17px] font-bold text-[#1565C0] tabular-nums">
                      TSh {total.toLocaleString()}
                    </span>
                    {showBreakdown ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {isOutsideDodoma ? 'Includes regional transport' : 'Dodoma delivery included'}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePlaceOrder}
                  className="bg-[#111827] text-white px-7 py-3 rounded-xl font-semibold text-[14px] hover:bg-black transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Placing order...' : 'Place order'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
