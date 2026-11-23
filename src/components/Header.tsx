import React, { useRef } from 'react';
import { Search, Globe, Bell, Shield, MapPin } from 'lucide-react';
import { AdminSettings } from '../types';
import { ObbyTechLogoEmblem, ObbyTechWordmark } from './ObbyTechBrand';

interface HeaderProps {
  settings: AdminSettings;
  language: 'en' | 'sw';
  setLanguage: (lang: 'en' | 'sw') => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  searchInput: string;
  setSearchInput: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onClearSearch?: () => void;
  onSearchFocusChange?: (focused: boolean) => void;
  onOpenNotifications: () => void;
  unreadNotifCount: number;
  onOpenAdmin: () => void;
  isAdminUser?: boolean;
  isHomePage?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  language,
  setLanguage,
  selectedRegion,
  setSelectedRegion,
  searchInput,
  setSearchInput,
  onSearchSubmit,
  onClearSearch,
  onSearchFocusChange,
  onOpenNotifications,
  unreadNotifCount,
  onOpenAdmin,
  isAdminUser = false,
  isHomePage = true,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const triggerSearchAndDismissKeyboard = () => {
    onSearchSubmit(searchInput);
    onSearchFocusChange?.(false);
    searchInputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerSearchAndDismissKeyboard();
  };

  return (
    <header className="bg-white text-slate-900 pt-3 pb-3 px-3 sticky top-0 z-30 border-b border-slate-100 shadow-xs">
      <div className={`max-w-4xl mx-auto ${isHomePage ? 'space-y-3' : ''}`}>
        {/* Top Header Bar: Logo, Language Toggle, Notification & (on Home) Security Icon */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand Name: Exact Obby Tech emblem + rounded cyan/green wordmark */}
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <ObbyTechLogoEmblem customLogoUrl={settings.websiteLogo} size="sm" />
            <div className="flex items-center min-w-0">
              <ObbyTechWordmark variant="light" size="sm" showSolutions />
            </div>
          </div>

          {/* Controls: Language, Notifications (ALL PAGES), Admin (HOME ONLY) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selector */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              title="Switch Language / Badili Lugha"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{language === 'en' ? 'English' : 'Kiswahili'}</span>
            </button>

            {/* Notification Bell (VISIBLE ON ALL PAGES) */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full border border-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Authorized Admin Access - Visible ONLY to the official administrator */}
            {isAdminUser && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
                title="Open Admin Dashboard"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold">Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Location + Search Bar (HOME PAGE ONLY) */}
        {isHomePage && (
          <div className="flex items-center gap-2">
            {/* Static Non-Clickable Dodoma Location Label */}
            <div
              className="bg-slate-100 text-slate-800 text-xs font-semibold py-2.5 px-3.5 rounded-full flex items-center gap-1.5 select-none shrink-0 pointer-events-none"
              aria-label="Store location: Dodoma"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Dodoma</span>
            </div>

            {/* Search Input Box Form */}
            <form onSubmit={handleFormSubmit} className="relative flex-1 flex items-center">
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={searchInput}
                onFocus={() => onSearchFocusChange?.(true)}
                onBlur={() => onSearchFocusChange?.(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    triggerSearchAndDismissKeyboard();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  if (val === '') {
                    onClearSearch?.();
                  }
                }}
                placeholder={language === 'en' ? 'I am looking for...' : 'Natafuta...'}
                className="w-full bg-slate-100 text-slate-900 text-xs font-medium py-2.5 pl-4 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-900 border-none transition-all placeholder-slate-400 appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Search / Tafuta"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

