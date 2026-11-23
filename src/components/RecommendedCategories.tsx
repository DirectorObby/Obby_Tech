import React from 'react';
import {
  Smartphone,
  Laptop,
  Camera,
  Video,
  Zap,
  Wrench,
  Headphones,
  Monitor,
  Shield,
  Sparkles,
  Palette,
  Megaphone,
  GraduationCap,
} from 'lucide-react';
import { CategoryItem, CategoryName } from '../types';

interface RecommendedCategoriesProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onSelectCategory: (categoryName: CategoryName | 'All') => void;
  language: 'en' | 'sw';
}

export const renderCategoryLucideIcon = (iconName: string, className = 'w-5 h-5 text-white') => {
  switch (iconName) {
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Headphones':
      return <Headphones className={className} />;
    case 'Monitor':
      return <Monitor className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

export const RecommendedCategories: React.FC<RecommendedCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  language,
}) => {
  return (
    <div className="bg-white py-4 px-3 border-b border-slate-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          {language === 'en' ? 'Recommended for you' : 'Inayopendekezwa kwako'}
        </h2>

        {/* Horizontally scrollable row matching clean minimalism layout */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {/* All option */}
          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-1 rounded-2xl transition-all cursor-pointer ${
              selectedCategory === 'All' ? 'scale-105' : 'opacity-85 hover:opacity-100'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-xs transition-all ${
                selectedCategory === 'All'
                  ? 'bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2'
                  : 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🔥
            </div>
            <span
              className={`text-[11px] font-bold text-center truncate max-w-[70px] ${
                selectedCategory === 'All' ? 'text-slate-900' : 'text-slate-600'
              }`}
            >
              {language === 'en' ? 'All Items' : 'Vyote'}
            </span>
          </button>

          {/* Categories (Phones, Laptops, CCTV, Accessories, Services) */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const displayName =
              cat.name === 'PC & Laptops'
                ? 'Laptops'
                : cat.name === 'Services'
                ? language === 'en'
                  ? 'Services'
                  : 'Huduma'
                : cat.name;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-1 rounded-2xl transition-all cursor-pointer ${
                  isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl overflow-hidden relative shadow-xs transition-all ${
                    isSelected ? 'ring-2 ring-slate-900 ring-offset-2 border-slate-900' : 'border border-slate-100'
                  }`}
                >
                  <img
                    src={cat.imageUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/25 flex items-center justify-center text-lg">
                    {cat.iconType === 'image' && cat.icon ? (
                      <img
                        src={cat.icon}
                        alt=""
                        className="w-8 h-8 object-contain rounded-md bg-white/85 p-0.5 shadow-2xs"
                      />
                    ) : cat.iconType === 'lucide' ? (
                      renderCategoryLucideIcon(cat.icon, 'w-5 h-5 text-white drop-shadow')
                    ) : (
                      <span>{cat.icon}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold text-center truncate max-w-[72px] ${
                    isSelected ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {displayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
