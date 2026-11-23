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
    <section className="bg-white px-3 pt-3 pb-1">
      <div
        className="relative max-w-4xl mx-auto rounded-none overflow-hidden bg-slate-950 shadow-sm group aspect-video"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding Track — Exact 16:9 Widescreen Aspect Ratio */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="w-full h-full shrink-0 relative aspect-video"
            >
              <img
                src={slide.image}
                alt={language === 'en' ? slide.titleEn : slide.titleSw}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />

              {/* Measured Scrim for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent" />

              {/* Left-aligned Editorial Promotional Copy */}
              <div className="absolute inset-0 flex flex-col justify-center p-4 pb-8 sm:p-8 sm:pb-10 max-w-[82%] sm:max-w-[62%] space-y-1 sm:space-y-2.5">
                {(language === 'en' ? slide.kickerEn : slide.kickerSw) && (
                  <span className="text-[9.5px] sm:text-[11px] font-semibold tracking-wider text-blue-400 uppercase">
                    {language === 'en' ? slide.kickerEn : slide.kickerSw}
                  </span>
                )}

                <h2 className="text-[16px] sm:text-[26px] md:text-[32px] font-bold text-white leading-[1.15] tracking-tight text-balance">
                  {language === 'en' ? slide.titleEn : slide.titleSw}
                </h2>

                {(language === 'en' ? slide.subtitleEn : slide.subtitleSw) && (
                  <p className="text-[11px] sm:text-[13px] md:text-sm text-slate-200 leading-snug line-clamp-2 max-w-md">
                    {language === 'en' ? slide.subtitleEn : slide.subtitleSw}
                  </p>
                )}

                <div className="pt-1 sm:pt-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(slide.targetCategory)}
                    className="inline-flex items-center gap-1.5 bg-[#0B3B8C] hover:bg-[#082E6E] text-white text-[11px] sm:text-xs font-semibold px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>{language === 'en' ? slide.ctaEn : slide.ctaSw}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prev / Next Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous promotion slide"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={goToNext}
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
                    onClick={() => setCurrentIndex(idx)}
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
