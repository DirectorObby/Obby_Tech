import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Smartphone,
  FileText,
  Check,
  MessageCircle,
  Loader2,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { CustomerProfile, ServiceBooking, ServiceItem, ServiceShowcaseItem } from '../types';
import { api } from '../services/api';
import { renderServiceIcon } from './ServicesSection';

interface ServiceBookingModalProps {
  services: ServiceItem[];
  initialService: ServiceItem;
  initialShowcaseItem?: ServiceShowcaseItem | null;
  customerProfile: CustomerProfile;
  whatsappNumber: string;
  onClose: () => void;
  onBookingCreated: (booking: ServiceBooking) => void;
  onViewBookings: (bookingId: string) => void;
}

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

const MONTHS = [
  { value: 1, short: 'Jan', label: '01 Jan' },
  { value: 2, short: 'Feb', label: '02 Feb' },
  { value: 3, short: 'Mar', label: '03 Mar' },
  { value: 4, short: 'Apr', label: '04 Apr' },
  { value: 5, short: 'May', label: '05 May' },
  { value: 6, short: 'Jun', label: '06 Jun' },
  { value: 7, short: 'Jul', label: '07 Jul' },
  { value: 8, short: 'Aug', label: '08 Aug' },
  { value: 9, short: 'Sep', label: '09 Sep' },
  { value: 10, short: 'Oct', label: '10 Oct' },
  { value: 11, short: 'Nov', label: '11 Nov' },
  { value: 12, short: 'Dec', label: '12 Dec' },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getTodayParts() {
  const now = new Date();
  const y = now.getFullYear();
  return {
    year: Math.min(2050, Math.max(2020, y)),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function toIsoDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatWhatsAppTarget(rawNumber?: string): string {
  const digits = (rawNumber || '+255713340900').replace(/[^\d]/g, '');
  if (digits.startsWith('0') && digits.length >= 10) {
    return `255${digits.slice(1)}`;
  }
  if (!digits) return '255713340900';
  return digits;
}

function serviceRequiresDeviceDetails(service: ServiceItem): boolean {
  if (!service.requiresDeviceDetails) return false;
  const slugLower = (service.slug || '').toLowerCase();
  const titleLower = (service.title || '').toLowerCase();
  if (
    slugLower.includes('graphic') ||
    slugLower.includes('advert') ||
    slugLower.includes('consultation') ||
    slugLower.includes('video') ||
    slugLower.includes('photo') ||
    titleLower.includes('graphic') ||
    titleLower.includes('advert') ||
    titleLower.includes('promotion') ||
    titleLower.includes('matangazo') ||
    titleLower.includes('consultation') ||
    titleLower.includes('video') ||
    titleLower.includes('photo')
  ) {
    return false;
  }
  return true;
}

const ITEM_HEIGHT = 36;

interface ScrollTableColumnProps<T extends string | number> {
  header: string;
  items: { value: T; display: string }[];
  selectedValue: T;
  onChange: (value: T) => void;
}

function ScrollTableColumn<T extends string | number>({
  header,
  items,
  selectedValue,
  onChange,
}: ScrollTableColumnProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isProgrammaticRef = useRef(false);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === selectedValue)
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 2) {
      isProgrammaticRef.current = true;
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 200);
    }
  }, [selectedIndex, items.length]);

  const handleScroll = () => {
    if (isProgrammaticRef.current || !scrollRef.current) return;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (!scrollRef.current) return;
      const idx = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(items.length - 1, idx));
      const item = items[clampedIdx];
      if (item && item.value !== selectedValue) {
        onChange(item.value);
      }
      scrollRef.current.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
    }, 85);
  };

  return (
    <div className="flex flex-col bg-white min-w-0">
      {/* Table Column Header */}
      <div className="text-center py-1.5 bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {header}
      </div>

      {/* Scrollable Table Rows (3 visible rows = 108px, centered row highlighted automatically) */}
      <div className="relative h-[108px] overflow-hidden">
        {/* Highlight Row Band */}
        <div className="pointer-events-none absolute inset-x-0 top-[36px] h-[36px] bg-[#0B3B8C]/10 border-y border-[#0B3B8C]/30 z-0" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative z-10 h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div style={{ height: ITEM_HEIGHT }} />
          {items.map((item) => {
            const isSelected = item.value === selectedValue;
            return (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => onChange(item.value)}
                style={{ height: ITEM_HEIGHT }}
                className={`w-full snap-center flex items-center justify-center tabular-nums px-1 transition-colors cursor-pointer truncate ${
                  isSelected
                    ? 'text-[12.5px] font-extrabold text-[#0B3B8C]'
                    : 'text-[11.5px] font-medium text-slate-400 hover:text-slate-700'
                }`}
              >
                {item.display}
              </button>
            );
          })}
          <div style={{ height: ITEM_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}

export const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  services,
  initialService,
  initialShowcaseItem,
  customerProfile,
  whatsappNumber,
  onClose,
  onBookingCreated,
  onViewBookings,
}) => {
  const today = useMemo(() => getTodayParts(), []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialService.id);
  const [selectedYear, setSelectedYear] = useState<number>(today.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);
  const [selectedDay, setSelectedDay] = useState<number>(today.day);
  const [bookingTime, setBookingTime] = useState<string>('09:00 AM');

  const [customerName, setCustomerName] = useState<string>(customerProfile.fullName || '');
  const [phone, setPhone] = useState<string>(customerProfile.phone || '');
  const [deviceDetails, setDeviceDetails] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>(() => {
    if (initialShowcaseItem) {
      const priceStr = initialShowcaseItem.priceLabel
        ? ` (${initialShowcaseItem.priceLabel})`
        : initialShowcaseItem.price
        ? ` (TSh ${initialShowcaseItem.price.toLocaleString()})`
        : '';
      return `Interested in: ${initialShowcaseItem.title}${priceStr} — `;
    }
    return '';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<ServiceBooking | null>(null);

  const selectedService =
    services.find((s) => s.id === selectedServiceId) || initialService;

  const showDeviceDetailsField = serviceRequiresDeviceDetails(selectedService);

  const maxDayInMonth = getDaysInMonth(selectedYear, selectedMonth);

  useEffect(() => {
    if (selectedDay > maxDayInMonth) {
      setSelectedDay(maxDayInMonth);
    }
  }, [maxDayInMonth, selectedDay]);

  // Clear deviceDetails if user switches to Graphic Design / Advertising / Consultation
  useEffect(() => {
    if (!showDeviceDetailsField && deviceDetails) {
      setDeviceDetails('');
    }
  }, [showDeviceDetailsField]);

  const effectiveDay = Math.min(selectedDay, maxDayInMonth);
  const bookingDate = toIsoDateString(selectedYear, selectedMonth, effectiveDay);

  const dayItems = useMemo(
    () =>
      Array.from({ length: maxDayInMonth }, (_, i) => {
        const d = i + 1;
        return { value: d, display: String(d).padStart(2, '0') };
      }),
    [maxDayInMonth]
  );

  const monthItems = useMemo(
    () => MONTHS.map((m) => ({ value: m.value, display: m.label })),
    []
  );

  // Full Year Scroll Table: 2020 - 2050
  const yearItems = useMemo(
    () =>
      Array.from({ length: 31 }, (_, i) => {
        const y = 2020 + i;
        return { value: y, display: String(y) };
      }),
    []
  );

  const hourItems = useMemo(
    () => TIME_SLOTS.map((slot) => ({ value: slot, display: slot })),
    []
  );

  const selectedMonthShort =
    MONTHS.find((m) => m.value === selectedMonth)?.short || String(selectedMonth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim() || !phone.trim() || !bookingDate || !bookingTime || !problemDescription.trim()) {
      setErrorMsg('Please fill in all required booking fields.');
      return;
    }

    if (showDeviceDetailsField && !deviceDetails.trim()) {
      setErrorMsg('Please enter your device brand and model details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedBooking = await api.submitBooking({
        serviceId: selectedService.id,
        serviceName: selectedService.title,
        bookingDate,
        bookingTime,
        customerName: customerName.trim(),
        phone: phone.trim(),
        deviceDetails: showDeviceDetailsField ? deviceDetails.trim() : '',
        problemDescription: problemDescription.trim(),
      });

      setConfirmedBooking(savedBooking);
      onBookingCreated(savedBooking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildWhatsAppUrl = (booking: ServiceBooking): string => {
    const cleanTarget = formatWhatsAppTarget(whatsappNumber);
    const lines = [
      'Hello *OBBY TECH*, I would like to confirm my service booking:',
      '',
      `*Booking Ref:* #${booking.id}`,
      `*Service:* ${booking.serviceName}`,
      `*Date:* ${booking.bookingDate}`,
      `*Preferred Time:* ${booking.bookingTime}`,
      `*Customer Name:* ${booking.customerName}`,
      `*Contact Phone:* ${booking.phone}`,
      `*Email:* ${booking.customerEmail}`,
    ];
    if (booking.deviceDetails) {
      lines.push(`*Device Details:* ${booking.deviceDetails}`);
    }
    lines.push(`*Service / Problem Details:* ${booking.problemDescription}`);
    lines.push(`*Booking Status:* ${booking.status}`);
    lines.push('', 'Thank you!');

    return `https://wa.me/${cleanTarget}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0B3B8C] text-white flex items-center justify-center shrink-0">
              {renderServiceIcon(selectedService.iconName, 'w-4 h-4')}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {confirmedBooking ? 'Booking Confirmed' : 'Book OBBY TECH Service'}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {confirmedBooking ? `Reference #${confirmedBooking.id}` : selectedService.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {confirmedBooking ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
            <div className="text-center space-y-2 pt-1">
              <div className="w-14 h-14 rounded-full bg-[#00B553] text-white flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Booking Saved Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your booking has been registered in our system and sent to the OBBY TECH team.
                Click the WhatsApp button below to send your booking details directly to our technician.
              </p>
            </div>

            {/* Reference Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  Booking Reference
                </div>
                <div className="text-base font-extrabold tracking-wide tabular-nums">
                  #{confirmedBooking.id}
                </div>
              </div>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase">
                {confirmedBooking.status}
              </span>
            </div>

            {/* Summary Card */}
            <div className="bg-[#F5F6F8] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Service:</span>
                <span className="font-bold text-slate-900 text-right">{confirmedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Date &amp; Time:</span>
                <span className="font-semibold text-slate-900 text-right tabular-nums">
                  {confirmedBooking.bookingDate} at {confirmedBooking.bookingTime}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900 text-right">
                  {confirmedBooking.customerName} ({confirmedBooking.phone})
                </span>
              </div>
              {confirmedBooking.deviceDetails && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Device:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {confirmedBooking.deviceDetails}
                  </span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-200/80">
                <span className="text-slate-500 block mb-0.5">Description:</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {confirmedBooking.problemDescription}
                </p>
              </div>
            </div>

            {/* WhatsApp Final Action + View Bookings */}
            <div className="space-y-2.5 pt-1">
              <a
                href={buildWhatsAppUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#1fb857] text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Booking via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => onViewBookings(confirmedBooking.id)}
                className="w-full bg-slate-900 hover:bg-black text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>View My Bookings &amp; Status</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Service Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">1. Selected Service *</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 2 & 3. Direct Always-Open Scroll Tables: Date (Day | Month | Year 2020-2050) + Hours (9AM-6PM) */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0B3B8C]" />
                  <span>2. Scroll Date &amp; Time *</span>
                </span>
                <span className="text-[11px] font-bold text-[#0B3B8C] tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {String(effectiveDay).padStart(2, '0')} {selectedMonthShort} {selectedYear} ·{' '}
                    {bookingTime}
                  </span>
                </span>
              </div>

              {/* Unified Scrollable Table: Day | Month | Year (2020-2050) | Hours (9AM-6PM) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Date Scroll Table (Day | Month | Year 2020-2050) */}
                <div className="sm:col-span-8 rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <div className="grid grid-cols-3 divide-x divide-slate-200">
                    <ScrollTableColumn
                      header="Day"
                      items={dayItems}
                      selectedValue={effectiveDay}
                      onChange={setSelectedDay}
                    />
                    <ScrollTableColumn
                      header="Month"
                      items={monthItems}
                      selectedValue={selectedMonth}
                      onChange={setSelectedMonth}
                    />
                    <ScrollTableColumn
                      header="Year"
                      items={yearItems}
                      selectedValue={selectedYear}
                      onChange={setSelectedYear}
                    />
                  </div>
                </div>

                {/* Hours Scroll Table (9:00 AM - 6:00 PM) */}
                <div className="sm:col-span-4 rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <ScrollTableColumn
                    header="Hours"
                    items={hourItems}
                    selectedValue={bookingTime}
                    onChange={setBookingTime}
                  />
                </div>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Scroll vertically on Day, Month, Year (2020–2050) and Hours (9:00 AM–6:00 PM) — selection stays automatically.
              </p>
            </div>

            {/* 3. Full Name & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>3. Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact Phone *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0713340900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]"
                />
              </div>
            </div>

            {/* 4. Device Details (ONLY shown for hardware/repair services; hidden for Graphics, Advertising, Consultation) */}
            {showDeviceDetailsField && (
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>4. Your Device Details *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 13 Pro / HP ProBook 450 G5"
                  value={deviceDetails}
                  onChange={(e) => setDeviceDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]"
                />
              </div>
            )}

            {/* 5. Problem or Service Needed */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {showDeviceDetailsField ? '5.' : '4.'} Describe Problem or Service Needed *
                </span>
              </label>
              <textarea
                rows={3}
                required
                placeholder={
                  showDeviceDetailsField
                    ? 'Describe the hardware or software issue...'
                    : 'Describe your design, campaign, poster text, or consultation details...'
                }
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]"
              />
            </div>

            {/* Account privacy note */}
            {customerProfile.email && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] text-slate-600">
                Linked securely to your account: <strong className="text-slate-900">{customerProfile.email}</strong>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1 pb-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0B3B8C] hover:bg-[#082E6E] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'Submitting Booking...' : 'Submit Booking'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
