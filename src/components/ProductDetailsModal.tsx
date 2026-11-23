import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Cpu,
  Zap,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { Product } from '../types';

interface ProductDetailsModalProps {
  product: Product | null;
  allProducts?: Product[];
  onSelectProduct?: (product: Product) => void;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  allProducts = [],
  onSelectProduct,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeInfoTab, setActiveInfoTab] = useState<'description' | 'parameters'>('description');
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setActiveInfoTab('description');
    setSwipeStartX(null);
    setDragOffset(0);
  }, [product?.id]);

  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          product.primaryImage ||
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
        ];
  const isOutOfStock = product.stock <= 0 || product.availability === 'OUT_OF_STOCK';

  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      if (a.category === product.category && b.category !== product.category) return -1;
      if (b.category === product.category && a.category !== product.category) return 1;
      return 0;
    })
    .slice(0, 6);

  const handleSwipeStart = (clientX: number) => {
    if (images.length <= 1) return;
    setSwipeStartX(clientX);
    setDragOffset(0);
  };

  const handleSwipeMove = (clientX: number) => {
    if (swipeStartX === null || images.length <= 1) return;
    setDragOffset(clientX - swipeStartX);
  };

  const handleSwipeEnd = () => {
    if (swipeStartX === null || images.length <= 1) return;
    if (dragOffset <= -40) {
      setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else if (dragOffset >= 40) {
      setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
    setSwipeStartX(null);
    setDragOffset(0);
  };

  const getSpecIcon = (idx: number) => {
    switch (idx % 4) {
      case 0:
        return <Clock className="w-3.5 h-3.5" />;
      case 1:
        return <Cpu className="w-3.5 h-3.5" />;
      case 2:
        return <Zap className="w-3.5 h-3.5" />;
      default:
        return <HardDrive className="w-3.5 h-3.5" />;
    }
  };

  const shortTitle = product.name.split(' ').slice(0, 4).join(' ');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Minimal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              {product.category}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-700 truncate">
              {product.condition}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable One-Product Body */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* 1. Full-Bleed Light Gray Swipeable Image Showcase */}
          <div
            className="relative bg-[#F5F6F8] aspect-[4/3] sm:h-72 w-full overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
            onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX)}
            onTouchEnd={handleSwipeEnd}
            onMouseDown={(e) => handleSwipeStart(e.clientX)}
            onMouseMove={(e) => handleSwipeMove(e.clientX)}
            onMouseUp={handleSwipeEnd}
            onMouseLeave={handleSwipeEnd}
          >
            <div
              className={`flex h-full ${
                swipeStartX === null ? 'transition-transform duration-300 ease-out' : ''
              }`}
              style={{
                transform: `translateX(calc(-${activeImageIndex * 100}% + ${dragOffset}px))`,
              }}
            >
              {images.map((imgUrl, idx) => (
                <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center">
                  <img
                    src={imgUrl}
                    alt={`${product.name} ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-full h-full object-contain p-3 sm:p-4 pointer-events-none"
                  />
                </div>
              ))}
            </div>

            {isOutOfStock && (
              <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                Out of Stock
              </div>
            )}
          </div>

          {/* Pagination Dots Bar (matching reference image) */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-3 bg-white">
              {images.map((_, idx) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'w-6 bg-[#65C41C]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* Main Product Info Container */}
          <div className={`px-4 pb-6 space-y-4 ${images.length <= 1 ? 'pt-4' : 'pt-1'}`}>
            {/* 2. Product Title, Stars/Stock Row & Bold Price */}
            <div className="space-y-2">
              <h1 className="text-[19px] sm:text-[21px] font-semibold text-[#111827] leading-[1.3]">
                {product.name}
              </h1>

              {/* 5 Green Stars + Stock & Location info */}
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                <div className="flex items-center gap-0.5" aria-label="Verified quality">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-[#65C41C] text-[#65C41C]"
                    />
                  ))}
                </div>
                <span className="text-slate-500 tabular-nums">
                  ({isOutOfStock ? '0' : `${product.stock} left`})
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1565C0]" />
                  Verified Obby Tech Stock
                </span>
              </div>

              {/* Bold Price */}
              <div className="flex items-baseline justify-between pt-1">
                <div className="text-[22px] font-bold text-[#1565C0] tabular-nums tracking-tight">
                  TSh {product.price.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{product.location || 'Dodoma'}</span>
                </div>
              </div>
            </div>

            {/* 3. Key Features / Specifications List with Circular Monochrome Icons & Hairline Dividers */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                {product.specifications.slice(0, 4).map((spec, idx) => (
                  <div key={idx} className="py-3 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full border-[1.5px] border-slate-900 text-slate-900 flex items-center justify-center shrink-0">
                      {getSpecIcon(idx)}
                    </span>
                    <span className="text-[13px] font-normal text-[#111827] leading-snug">
                      {spec}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Quantity Stepper Row (matching Qty [ < 1 > ]) */}
            {!isOutOfStock && (
              <div className="flex items-center gap-4 py-1">
                <span className="text-[13px] font-medium text-slate-600">Qty</span>
                <div className="inline-flex items-center bg-[#F4F5F7] rounded-md h-8 px-1.5 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="p-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[13px] font-semibold text-slate-900 tabular-nums min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                    className="p-1 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[12px] text-emerald-700 font-medium inline-flex items-center gap-1 ml-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  In Stock
                </span>
              </div>
            )}

            {/* 5. "You May Also Like" Horizontal Recommendation Row */}
            {relatedProducts.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h2 className="text-[16px] font-semibold text-[#111827] tracking-tight">
                  You May Also Like
                </h2>
                <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {relatedProducts.map((item) => {
                    const itemOut = item.stock <= 0 || item.availability === 'OUT_OF_STOCK';
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectProduct?.(item)}
                        className="w-[144px] shrink-0 bg-white rounded-xl border border-[#EAECEF] overflow-hidden flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-colors"
                      >
                        <div className="relative aspect-square bg-[#F5F6F8] overflow-hidden">
                          <img
                            src={item.primaryImage || item.images?.[0]}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute top-1.5 left-1.5 bg-[#65C41C] text-white text-[9.5px] font-semibold px-2 py-0.5 rounded-full">
                            {item.condition}
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 bg-white/95 text-slate-800 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                            <Star className="w-2.5 h-2.5 fill-[#65C41C] text-[#65C41C]" />
                            <span className="tabular-nums">{item.stock}</span>
                          </span>
                        </div>

                        <div className="p-2 space-y-1.5">
                          <div className="text-[12px] font-medium text-[#111827] truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[12.5px] font-bold text-[#1565C0] tabular-nums truncate">
                              TSh {item.price.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              disabled={itemOut}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(item, 1);
                              }}
                              aria-label={`Add ${item.name} to cart`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                itemOut
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Product Parameters & Description Tabs Section (matching bottom of Screenshot 2) */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-3">
                <span className="text-[14px] font-semibold text-[#111827] truncate">
                  {shortTitle}
                </span>
                <div className="flex items-center gap-4 text-[12px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab('description')}
                    className={`cursor-pointer transition-colors ${
                      activeInfoTab === 'description'
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-400 hover:text-slate-700 font-medium'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab('parameters')}
                    className={`cursor-pointer transition-colors ${
                      activeInfoTab === 'parameters'
                        ? 'text-slate-900 font-semibold'
                        : 'text-slate-400 hover:text-slate-700 font-medium'
                    }`}
                  >
                    Specifications
                  </button>
                </div>
              </div>

              {activeInfoTab === 'description' ? (
                <div className="space-y-2.5 text-[13px] text-[#111827] leading-relaxed">
                  <div className="font-semibold">Product Parameters:</div>
                  <div className="space-y-1 text-[12.5px] text-slate-700">
                    <div>Category: {product.category}</div>
                    <div>Condition: {product.condition}</div>
                    <div>Location: {product.location || 'Dodoma'}</div>
                    <div>Availability: {isOutOfStock ? 'Out of Stock' : `${product.stock} units ready`}</div>
                    {product.specifications?.map((spec, idx) => (
                      <div key={idx}>{spec}</div>
                    ))}
                  </div>
                  <p className="text-[12.5px] text-slate-600 pt-1 whitespace-pre-line">
                    {product.description || 'Quality product directly supplied by Obby Tech with full guarantee.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-[12.5px] text-slate-700">
                  <div className="font-semibold text-[#111827] text-[13px]">Full Specifications:</div>
                  {product.specifications && product.specifications.length > 0 ? (
                    <ul className="space-y-1.5">
                      {product.specifications.map((spec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#1565C0] font-bold">•</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Standard Obby Tech manufacturer specifications apply.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Dual Pill Buttons (Outlined Add to Cart + BLUE Buy It Now) */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5 sticky bottom-0 z-20">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              onAddToCart(product, quantity);
              onClose();
            }}
            className={`py-3 px-4 rounded-full text-[13px] font-semibold border transition-all cursor-pointer ${
              isOutOfStock
                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 active:scale-98'
            }`}
          >
            Add to Cart
          </button>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              onBuyNow(product, quantity);
              onClose();
            }}
            className={`py-3 px-4 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#1565C0] hover:bg-[#0d47a1] text-white shadow-sm active:scale-98'
            }`}
          >
            Buy It Now
          </button>
        </div>
      </div>
    </div>
  );
};
