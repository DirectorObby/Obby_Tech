import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { CategoryName, PromoBanner } from '../types';
import { INITIAL_BANNERS } from '../data/initialData';

interface PromoBannerCarouselProps {
  language: 'en' | 'sw';
  banners?: PromoBanner[];
  onSelectCategory: (category: CategoryName | 'All') => void;
}

export const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  language,
  banners,
  onSelectCategory,
}) => {
  const slides = useMemo(() => {
    const source = banners && banners.length > 0 ? banners : INITIAL_BANNERS;
    const active = source
      .filter((b) => b.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return active.length > 0 ? active : INITIAL_BANNERS;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  return (
    <section className="bg-[#F2F6FC] px-3 pt-3 pb-1">
      <div
        className="relative max-w-4xl mx-auto rounded-xl overflow-hidden bg-white shadow-sm border border-[#DCE7F7] group aspect-video"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Track — Crisp 16:9 Banner Without Dark Shadow Scrim */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide) => {
            const slideTitle = language === 'en' ? slide.titleEn : slide.titleSw || slide.titleEn;
            const slideSubtitle =
              language === 'en' ? slide.subtitleEn : slide.subtitleSw || slide.subtitleEn;
            const slideKicker =
              language === 'en' ? slide.kickerEn : slide.kickerSw || slide.kickerEn;
            const slideCta = language === 'en' ? slide.ctaEn : slide.ctaSw || slide.ctaEn;
            const hasOverlayContent = Boolean(slideTitle || slideSubtitle || slideCta);

            return (
              <div
                key={slide.id}
                onClick={() => onSelectCategory(slide.targetCategory)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCategory(slide.targetCategory);
                  }
                }}
                className="w-full h-full shrink-0 relative aspect-video cursor-pointer bg-white"
              >
                <img
                  src={slide.image}
                  alt={slideTitle || 'OBBY TECH Banner'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />

                {/* Text, Short Description & CTA Button Directly Over Crisp Bright Image (No Dark Shadow Scrim) */}
                {hasOverlayContent && (
                  <div className="absolute inset-0 flex flex-col justify-center p-4 pb-8 sm:p-8 sm:pb-10 max-w-[82%] sm:max-w-[62%] space-y-1 sm:space-y-2.5 pointer-events-none">
                    {slideKicker && (
                      <span className="text-[9.5px] sm:text-[11px] font-extrabold tracking-wider text-[#29C5F6] uppercase [text-shadow:0_1px_4px_rgba(12,8,38,0.85)]">
                        {slideKicker}
                      </span>
                    )}

                    {slideTitle && (
                      <h2 className="text-[16px] sm:text-[26px] md:text-[32px] font-extrabold text-white leading-[1.15] tracking-tight text-balance [text-shadow:0_2px_8px_rgba(12,8,38,0.8)]">
                        {slideTitle}
                      </h2>
                    )}

                    {slideSubtitle && (
                      <p className="text-[11px] sm:text-[13px] md:text-sm font-medium text-white leading-snug line-clamp-2 max-w-md [text-shadow:0_1px_6px_rgba(12,8,38,0.85)]">
                        {slideSubtitle}
                      </p>
                    )}

                    {slideCta && (
                      <div className="pt-1 sm:pt-1.5">
                        <span className="inline-flex items-center gap-1.5 bg-[#0B3B8C] hover:bg-[#1565C0] text-white text-[11px] sm:text-xs font-bold px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-lg shadow-md border border-white/20 whitespace-nowrap">
                          <span>{slideCta}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Prev / Next Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Previous promotion slide"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Next promotion slide"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Bottom Pagination Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-full">
              {slides.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                    }}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
