import React from 'react';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';

export type TabType = 'home' | 'cart' | 'messenger' | 'orders' | 'myappex';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  cartCount: number;
  isVisible?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  isVisible = true,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'cart', label: 'Cart', icon: <ShoppingBag className="w-5 h-5" />, badge: cartCount },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'myappex', label: 'My Obby', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[#E8F1FF] text-[#1E3A5F] border-t-2 border-[#C2DAFA] shadow-[0_-6px_22px_rgba(11,59,140,0.12)] pb-[env(safe-area-inset-bottom)] transition-all duration-150 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-14">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                isActive ? 'text-[#0B3B8C] font-extrabold' : 'text-[#314E73] hover:text-[#0C0826]'
              }`}
            >
              <div className="relative">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#1565C0] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px]">{item.label}</span>
              {isActive && (
                <div
                  className="absolute top-0 w-9 h-0.5 rounded-full"
                  style={{ backgroundImage: 'linear-gradient(90deg, #29C5F6 0%, #24D164 100%)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
