import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryName, PromoBanner } from '../types';
import { INITIAL_BANNERS } from '../data/initialData';

interface PromoBannerCarouselProps {
  language: 'en' | 'sw';
  banners?: PromoBanner[];
  hasLoadedFromServer?: boolean;
  onSelectCategory: (category: CategoryName | 'All') => void;
}

export const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  language,
  banners,
  hasLoadedFromServer = false,
  onSelectCategory,
}) => {
  const slides = useMemo(() => {
    const source = hasLoadedFromServer
      ? banners || []
      : banners && banners.length > 0
      ? banners
      : INITIAL_BANNERS;
    const active = source
      .filter((b) => b.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (hasLoadedFromServer) return active;
    return active.length > 0 ? active : INITIAL_BANNERS;
  }, [banners, hasLoadedFromServer]);

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

  if (slides.length === 0) return null;

  return (
    <section className="bg-[#F2F6FC] w-full">
      <div
        className="relative w-full rounded-none overflow-hidden bg-white shadow-xs group aspect-video"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Track — Clean 16:9 Banner With Crisp Original Photo & Action Link */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide) => {
            const slideTitle = language === 'en' ? slide.titleEn : slide.titleSw || slide.titleEn;
            const slideCta =
              (language === 'en' ? slide.ctaEn : slide.ctaSw || slide.ctaEn) ||
              (language === 'en' ? 'Shop Now' : 'Tazama Sasa');

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

                {/* Minimalist Overlay: Short Title (if set) + Clean ">>" Link Only */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 pb-7 sm:p-7 sm:pb-9 max-w-[78%] sm:max-w-[58%] space-y-2 pointer-events-none">
                  {slideTitle && (
                    <h2 className="text-[17px] sm:text-[26px] md:text-[30px] font-black text-white leading-[1.12] tracking-tight line-clamp-2 [text-shadow:0_2px_8px_rgba(12,8,38,0.75)]">
                      {slideTitle}
                    </h2>
                  )}

                  <div>
                    <span className="inline-flex items-center gap-1 bg-white/95 text-[#0C0826] text-[11px] sm:text-xs font-extrabold px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm whitespace-nowrap">
                      <span>{slideCta}</span>
                      <span aria-hidden="true" className="tracking-tighter">
                        &gt;&gt;
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Prev / Next Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Previous promotion slide"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/65 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Clean Bottom-Left Circular Pagination Dots */}
            <div className="absolute bottom-2.5 left-4 flex items-center gap-1.5">
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
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer shadow-xs ${
                      isActive ? 'bg-[#FF6B00] scale-110' : 'bg-white/90 hover:bg-white'
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
