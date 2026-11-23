import React from 'react';
import {
  Smartphone,
  Laptop,
  Palette,
  Megaphone,
  GraduationCap,
  Camera,
  Video,
  Wrench,
  Shield,
  Monitor,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Clock,
  CalendarCheck,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ServiceIconName,
  ServiceItem,
  ServiceShowcaseItem,
  ServicesBannerSettings,
} from '../types';

export const renderServiceIcon = (iconName: ServiceIconName | string, className = 'w-6 h-6') => {
  switch (iconName) {
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

function formatPriceTag(item: ServiceShowcaseItem): string {
  if (item.priceLabel && item.priceLabel.trim()) {
    return item.priceLabel.trim();
  }
  if (typeof item.price === 'number' && item.price > 0) {
    return `TSh ${item.price.toLocaleString()}`;
  }
  return '';
}

interface ServicesHomeBannerProps {
  language: 'en' | 'sw';
  servicesCount: number;
  bannerConfig?: ServicesBannerSettings;
  onOpenServices: () => void;
}

export const ServicesHomeBanner: React.FC<ServicesHomeBannerProps> = ({
  language,
  servicesCount,
  bannerConfig,
  onOpenServices,
}) => {
  const kicker =
    bannerConfig?.kicker ||
    (language === 'en'
      ? 'OBBY TECH · TECHNICAL & CREATIVE STUDIO'
      : 'OBBY TECH · HUDUMA ZA KITAALAMU');
  const headline =
    bannerConfig?.title ||
    (language === 'en'
      ? 'Professional Repairs, Graphic Design, Video & IT Solutions'
      : 'Matengenezo ya Simu & Laptop, Ubunifu wa Picha, Video & Matangazo');
  const subtitle =
    bannerConfig?.subtitle ||
    (language === 'en'
      ? `Explore ${servicesCount} specialized service categories with real work samples, transparent prices, and instant appointment booking.`
      : `Chunguza aina ${servicesCount} za huduma zetu ukiwa na picha za kazi zilizofanyika, maelezo kamili, bei, na booking ya moja kwa moja.`);
  const ctaText =
    bannerConfig?.ctaText ||
    (language === 'en' ? 'View Our Services' : 'Tazama Huduma Zetu');
  const bgImage = bannerConfig?.imageUrl?.trim();

  return (
    <section className="pt-2">
      <div
        onClick={onOpenServices}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenServices();
          }
        }}
        className="relative overflow-hidden bg-[#0C0826] text-white border border-slate-800 shadow-sm cursor-pointer group"
      >
        {bgImage ? (
          <>
            <img
              src={bgImage}
              alt={headline}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-45 group-hover:scale-[1.02] transition-transform duration-500"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#0C0826]/92 via-[#0C0826]/75 to-[#0C0826]/45 pointer-events-none"
            />
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 bg-[radial-gradient(#29C5F6_1px,transparent_1px)] [background-size:18px_18px] pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#24D164]/20 via-[#29C5F6]/15 to-transparent pointer-events-none"
            />
          </>
        )}

        <div className="relative z-10 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#29C5F6]">
              {kicker}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {headline}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="p-2 bg-white/10 border border-white/10 rounded-lg">
                <Smartphone className="w-4 h-4" />
              </span>
              <span className="p-2 bg-white/10 border border-white/10 rounded-lg">
                <Laptop className="w-4 h-4" />
              </span>
              <span className="p-2 bg-white/10 border border-white/10 rounded-lg">
                <Palette className="w-4 h-4" />
              </span>
              <span className="p-2 bg-white/10 border border-white/10 rounded-lg">
                <Camera className="w-4 h-4" />
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenServices();
              }}
              className="inline-flex items-center gap-2 bg-[#0B3B8C] hover:bg-[#1565C0] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-md group-hover:translate-x-0.5 whitespace-nowrap cursor-pointer"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

interface ServicesSectionProps {
  services: ServiceItem[];
  language: 'en' | 'sw';
  selectedServiceId: string | null;
  onSelectServiceCategory: (serviceId: string | null) => void;
  onBookService: (service: ServiceItem, showcaseItem?: ServiceShowcaseItem) => void;
  title?: string;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  language,
  selectedServiceId,
  onSelectServiceCategory,
  onBookService,
  title,
}) => {
  const activeService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId) || null
    : null;

  // LEVEL 2: Selected Service Category Details, Uploaded Photos, Descriptions, Prices & Booking Now
  if (activeService) {
    const items = activeService.showcaseItems || [];

    return (
      <section className="space-y-4 pt-1 animate-fade-in">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => onSelectServiceCategory(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B3B8C] hover:text-[#082E6E] py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {language === 'en' ? 'All Service Categories' : 'Rudi Kwenye Aina za Huduma'}
            </span>
          </button>

          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
            09:00 AM – 06:00 PM
          </span>
        </div>

        {/* Category Intro Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0B3B8C] text-white flex items-center justify-center shrink-0">
              {renderServiceIcon(activeService.iconName, 'w-6 h-6')}
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {activeService.title}
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-2xl">
                {activeService.description}
              </p>
            </div>
          </div>
        </div>

        {/* Service Showcase Images, Captions, Descriptions & Prices */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {language === 'en'
                ? 'Service Showcase, Details & Pricing'
                : 'Picha za Huduma, Maelezo & Bei'}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium tabular-nums">
              {items.length} {language === 'en' ? 'options' : 'huduma'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                {language === 'en'
                  ? 'No sample photos uploaded for this category yet. You can still book directly below.'
                  : 'Hakuna picha zilizopakiwa bado kwenye kipengele hiki. Bonyeza Booking Now kuweka miadi.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {items.map((item) => {
                const priceText = formatPriceTag(item);
                return (
                  <article
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#0B3B8C]/40 hover:shadow-sm transition-all"
                  >
                    <div>
                      {item.image ? (
                        <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/10] w-full bg-slate-100 flex items-center justify-center border-b border-slate-100 text-slate-300">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}

                      <div className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[14.5px] font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h4>
                          {priceText && (
                            <span className="text-[13px] font-extrabold text-[#1565C0] tabular-nums whitespace-nowrap shrink-0">
                              {priceText}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[12px] text-slate-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[12px] font-extrabold text-[#1565C0] tabular-nums">
                        {priceText || (language === 'en' ? 'Custom Quote' : 'Bei ya Maelewano')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onBookService(activeService, item)}
                        className="inline-flex items-center gap-1.5 bg-[#0B3B8C] hover:bg-[#082E6E] text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Booking Now' : 'Weka Miadi'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Primary "Booking Now" Bar for This Category */}
        <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              {activeService.title}
            </div>
            <p className="text-xs text-slate-300">
              {language === 'en'
                ? 'Choose your preferred date and time between 9:00 AM and 6:00 PM.'
                : 'Chagua tarehe na muda kuanzia saa 3:00 asubuhi hadi saa 12:00 jioni.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onBookService(activeService)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0B3B8C] hover:bg-[#1565C0] border border-white/15 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{language === 'en' ? 'Booking Now' : 'Booking Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  // LEVEL 1: Clean Hairline Boxed Grid of Service Categories (Matching Attached Reference)
  return (
    <section className="space-y-4 pt-1 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#0B3B8C]">
            {language === 'en' ? 'OBBY TECH Services' : 'Huduma za OBBY TECH'}
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {title || (language === 'en' ? 'Choose a Service Category' : 'Chagua Aina ya Huduma')}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'en'
              ? 'Tap any service category to view photos, full details, prices & book now.'
              : 'Bonyeza huduma yoyote kuona picha zake, maelezo zaidi, bei na kuweka miadi.'}
          </p>
        </div>

        <div className="text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#0B3B8C]" />
          <span>09:00 AM – 06:00 PM</span>
        </div>
      </div>

      {/* Hairline Divided Category Grid — Styled Directly From Reference Screenshot */}
      <div className="bg-white border-t border-l border-slate-200 grid grid-cols-2 sm:grid-cols-3">
        {services.map((service) => {
          const sampleCount = service.showcaseItems?.length || 0;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectServiceCategory(service.id)}
              className="group border-r border-b border-slate-200 bg-white hover:bg-slate-50/90 p-5 sm:p-7 flex flex-col items-center justify-center text-center gap-3 transition-colors cursor-pointer min-h-[140px]"
            >
              <div className="text-slate-900 group-hover:text-[#0B3B8C] group-hover:scale-105 transition-all duration-150">
                {renderServiceIcon(service.iconName, 'w-8 h-8 stroke-[1.75]')}
              </div>

              <div className="space-y-1">
                <div className="text-[13px] sm:text-[14px] font-semibold text-slate-800 group-hover:text-[#0B3B8C] leading-snug">
                  {service.title}
                </div>
                <div className="text-[10.5px] font-medium text-slate-400 group-hover:text-slate-600 tabular-nums">
                  {sampleCount > 0
                    ? `${sampleCount} ${language === 'en' ? 'packages · View' : 'picha · Tazama'}`
                    : language === 'en'
                    ? 'View & Book →'
                    : 'Tazama & Weka Miadi →'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
