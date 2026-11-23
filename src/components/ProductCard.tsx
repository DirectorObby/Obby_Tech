import React, { useState } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  Star,
  Cpu,
  Smartphone,
  Video,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onBuyNow: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetails,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock <= 0 || product.availability === 'OUT_OF_STOCK';

  const cardImage =
    product.primaryImage ||
    (product.images && product.images[0]) ||
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800';

  const highlightText =
    (Array.isArray(product.specifications) && product.specifications[0]) ||
    product.location ||
    product.category;

  const renderHighlightIcon = () => {
    switch (product.category) {
      case 'Phones':
        return <Smartphone className="w-2.5 h-2.5" />;
      case 'PC & Laptops':
        return <Cpu className="w-2.5 h-2.5" />;
      case 'CCTV':
        return <Video className="w-2.5 h-2.5" />;
      case 'Accessories':
        return <Zap className="w-2.5 h-2.5" />;
      default:
        return <ShieldCheck className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="bg-white rounded-xl border border-[#EAECEF] overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
    >
      {/* Top Image Frame */}
      <div className="relative aspect-square bg-[#F5F6F8] overflow-hidden">
        <img
          src={cardImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />

        {/* Bottom-left white pill badge */}
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-800 shadow-2xs flex items-center gap-1">
          <Star className="w-3 h-3 fill-[#65C41C] text-[#65C41C] shrink-0" />
          <span className="truncate max-w-[90px]">{product.condition}</span>
          {!isOutOfStock && (
            <span className="text-slate-400 tabular-nums">({product.stock})</span>
          )}
        </div>

        {/* Out of Stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Bottom Product Details Section */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-2">
        <div className="space-y-1.5">
          {/* 1. Product Title (2 lines, clean medium weight) */}
          <h3 className="text-[13px] sm:text-[14px] font-medium text-[#111827] leading-[1.35] line-clamp-2 min-h-[2.7em]">
            {product.name}
          </h3>

          {/* 2. Single-line feature/spec highlight with small circular monochrome icon */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] text-[#4B5563]">
            <span className="w-4 h-4 rounded-full bg-[#111827] text-white flex items-center justify-center shrink-0">
              {renderHighlightIcon()}
            </span>
            <span className="truncate font-normal">{highlightText}</span>
          </div>
        </div>

        {/* 3. Price row + subtle quick-add cart button */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <div className="min-w-0">
            <div className="text-[14px] sm:text-[15px] font-bold text-[#1565C0] tracking-tight tabular-nums leading-tight">
              TSh {product.price.toLocaleString()}
            </div>
            <div className="text-[10.5px] text-slate-400 truncate">
              {product.location || 'Dodoma'}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => onAddToCart(product, e)}
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-[#F4F5F7] hover:bg-[#111827] text-slate-700 hover:text-white active:scale-95'
            }`}
            title="Add to Cart"
            aria-label={`Add ${product.name} to Cart`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
