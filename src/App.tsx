import React, { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { Header } from './components/Header';
import { RecommendedCategories } from './components/RecommendedCategories';
import { ProductCard } from './components/ProductCard';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { CartView } from './components/CartView';
import { CheckoutModal } from './components/CheckoutModal';
import { PaymentSelectionModal } from './components/PaymentSelectionModal';
import { OrdersView } from './components/OrdersView';
import { AppexAiChat } from './components/AppexAiChat';
import { MyAppexView } from './components/MyAppexView';
import { AdminDashboard } from './components/AdminDashboard';
import { NotificationDrawer } from './components/NotificationDrawer';
import { BottomNav, TabType } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { PromoBannerCarousel } from './components/PromoBannerCarousel';
import { ServicesSection, ServicesHomeBanner } from './components/ServicesSection';
import { ServiceBookingModal } from './components/ServiceBookingModal';
import { AdminPasswordForceModal } from './components/AdminPasswordForceModal';
import {
  api,
  clearAuthToken,
  getAuthToken,
  isOfficialAdminEmail,
  setAuthToken,
} from './services/api';
import {
  auth,
  firebaseSignOut,
  getRedirectResult,
  onAuthStateChanged,
} from './lib/firebase';
import {
  AdminSettings,
  CategoryItem,
  CustomerNotification,
  CustomerProfile,
  Order,
  OrderItem,
  Product,
  PromoBanner,
  ServiceBooking,
  ServiceItem,
  ServiceShowcaseItem,
} from './types';
import {
  INITIAL_ADMIN_SETTINGS,
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_SERVICES,
} from './data/initialData';

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [selectedRegion, setSelectedRegion] = useState('Dodoma');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Application Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [banners, setBanners] = useState<PromoBanner[]>(INITIAL_BANNERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [settings, setSettings] = useState<AdminSettings>(INITIAL_ADMIN_SETTINGS);

  // Cart & Active Modals
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [activeProductDetails, setActiveProductDetails] = useState<Product | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<OrderItem[] | null>(null);
  const [latestSubmittedOrder, setLatestSubmittedOrder] = useState<Order | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
  const [ordersInitialSubTab, setOrdersInitialSubTab] = useState<'orders' | 'bookings'>('orders');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [activeBookingService, setActiveBookingService] = useState<ServiceItem | null>(null);
  const [activeBookingShowcaseItem, setActiveBookingShowcaseItem] = useState<ServiceShowcaseItem | null>(null);
  const [pendingBookingShowcaseItem, setPendingBookingShowcaseItem] = useState<ServiceShowcaseItem | null>(null);
  const [orderErrorBanner, setOrderErrorBanner] = useState<string | null>(null);

  // Authenticated User State (strictly in React memory; never read/write auth tokens in localStorage)
  const [authUser, setAuthUser] = useState<CustomerProfile | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);

  // Route Guards & Auth Modal State
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    subtitle?: string;
  }>({ isOpen: false });

  const [pendingTab, setPendingTab] = useState<TabType | null>(null);
  const [pendingBuyProduct, setPendingBuyProduct] = useState<Product | null>(null);
  const [pendingBuyQuantity, setPendingBuyQuantity] = useState<number>(1);
  const [pendingBookingService, setPendingBookingService] = useState<ServiceItem | null>(null);

  // UI Overlays
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isChatFullMode, setIsChatFullMode] = useState(false);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setIsBottomNavVisible(true);
    setIsSearchFocused(false);
    lastScrollYRef.current = window.scrollY;
  }, [activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY <= 12) {
        setIsBottomNavVisible(true);
      } else if (currentY > lastScrollYRef.current + 2 && currentY > 12) {
        setIsBottomNavVisible(false);
      } else if (currentY < lastScrollYRef.current - 2) {
        setIsBottomNavVisible(true);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const customerProfile: CustomerProfile = authUser || {
    id: '',
    fullName: '',
    phone: '',
    region: 'Dodoma',
    street: '',
    address: '',
    email: '',
    authProvider: 'email',
  };

  // Clear any legacy localStorage token remnants & verify Firebase Google Auth redirect / session
  useEffect(() => {
    clearAuthToken();

    const checkRedirect = async () => {
      try {
        const redirectRes = await getRedirectResult(auth);
        if (redirectRes && redirectRes.user && redirectRes.user.email) {
          const idToken = await redirectRes.user.getIdToken();
          const authRes = await api.googleAuth({ idToken });
          setAuthUser(authRes.user);
          setAdminUnlocked(Boolean(authRes.adminUnlocked));
          setActiveTab('myappex');
        }
      } catch (e) {
        console.warn('Google redirect result check failed:', e);
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email && !getAuthToken()) {
        try {
          const idToken = await fbUser.getIdToken();
          const authRes = await api.googleAuth({ idToken });
          setAuthUser(authRes.user);
          setAdminUnlocked(Boolean(authRes.adminUnlocked));
        } catch (err) {
          console.warn('Firebase auth sync skipped:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load Storefront & User-Private Data
  const loadData = async () => {
    try {
      const [prodsData, settingsData, catsData, srvsData, bannersData] = await Promise.all([
        api.getProducts(),
        api.getSettings().catch(() => INITIAL_ADMIN_SETTINGS),
        api.getCategories().catch(() => INITIAL_CATEGORIES),
        api.getServices().catch(() => INITIAL_SERVICES),
        api.getBanners().catch(() => INITIAL_BANNERS),
      ]);

      setProducts(prodsData);
      setSettings(settingsData);
      setCategories(catsData);
      setServices(srvsData);
      setBanners(bannersData);

      if (authUser?.id && getAuthToken()) {
        const isAdmin =
          (authUser.role === 'admin' || isOfficialAdminEmail(authUser.email)) && adminUnlocked;
        const [ordersData, bookingsData, notifsData] = await Promise.all([
          api.getOrders(isAdmin).catch(() => []),
          api.getBookings(isAdmin).catch(() => []),
          api.getNotifications(isAdmin).catch(() => []),
        ]);
        setOrders(ordersData);
        setBookings(bookingsData);
        setNotifications(notifsData);
      } else {
        setOrders([]);
        setBookings([]);
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [authUser?.id, adminUnlocked]);

  // Tab Selection Guard
  const handleTabChange = (tab: TabType) => {
    setIsChatFullMode(false);
    if (tab === 'home' || tab === 'myappex') {
      setActiveTab(tab);
      return;
    }

    if (!authUser) {
      setPendingTab(tab);
      setAuthModalState({
        isOpen: true,
        subtitle:
          tab === 'cart'
            ? 'Please sign in or create an Obby Tech account to access your cart'
            : tab === 'messenger'
            ? 'Please sign in to chat with Obby Ai assistant'
            : 'Please sign in to view your orders & service bookings',
      });
      return;
    }

    if (tab === 'orders') {
      setOrdersInitialSubTab('orders');
    }
    setActiveTab(tab);
  };

  // Auth Success Handler
  const handleAuthSuccess = (user: CustomerProfile, token: string) => {
    setAuthToken(token);
    setAuthUser(user);
    const isAdmin = user.role === 'admin' || isOfficialAdminEmail(user.email);
    setAdminUnlocked(isAdmin && user.authProvider === 'email');
    setAuthModalState({ isOpen: false });

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }

    if (pendingBuyProduct) {
      const prod = pendingBuyProduct;
      const qty = pendingBuyQuantity;
      setPendingBuyProduct(null);
      handleAddToCart(prod, qty);
      setCheckoutItems([
        {
          productId: prod.id,
          productName: prod.name,
          productImage: prod.primaryImage,
          price: prod.price,
          quantity: qty,
        },
      ]);
    }

    if (pendingBookingService) {
      const srv = pendingBookingService;
      const shItem = pendingBookingShowcaseItem;
      setPendingBookingService(null);
      setPendingBookingShowcaseItem(null);
      setActiveBookingShowcaseItem(shItem);
      setActiveBookingService(srv);
    }
  };

  // Handle Logout
  const handleSignOut = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    clearAuthToken();
    setAuthUser(null);
    setAdminUnlocked(false);
    setIsAdminDashboardOpen(false);
    setActiveBookingService(null);
    setCheckoutItems(null);
    setLatestSubmittedOrder(null);
    setActiveTab('home');
    setOrders([]);
    setBookings([]);
    setNotifications([]);
  };

  // Cart Helpers
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productImage: product.primaryImage,
          price: product.price,
          quantity,
        },
      ];
    });
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    if (!authUser) {
      setPendingBuyProduct(product);
      setPendingBuyQuantity(quantity);
      setAuthModalState({
        isOpen: true,
        subtitle: `Please sign in to complete your purchase of ${product.name}`,
      });
      return;
    }

    handleAddToCart(product, quantity);
    setCheckoutItems([
      {
        productId: product.id,
        productName: product.name,
        productImage: product.primaryImage,
        price: product.price,
        quantity,
      },
    ]);
  };

  const handleBookServiceClick = (service: ServiceItem, showcaseItem?: ServiceShowcaseItem) => {
    if (!authUser) {
      setPendingBookingService(service);
      setPendingBookingShowcaseItem(showcaseItem || null);
      setAuthModalState({
        isOpen: true,
        subtitle: `Please sign in or create an account to book ${service.title}`,
      });
      return;
    }
    setActiveBookingShowcaseItem(showcaseItem || null);
    setActiveBookingService(service);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Order Submission Flow
  const handleSubmitOrder = async (customerData: {
    fullName: string;
    phone: string;
    region: string;
    street: string;
    email?: string;
    paymentMethod: string;
    paymentNumber: string;
  }) => {
    const itemsToSubmit = checkoutItems || cartItems;
    if (!itemsToSubmit || itemsToSubmit.length === 0) return;

    setOrderErrorBanner(null);
    try {
      const newOrder = await api.submitOrder({
        customerName: customerData.fullName,
        phone: customerData.phone,
        region: customerData.region,
        street: customerData.street,
        items: itemsToSubmit,
        paymentMethod: customerData.paymentMethod,
        paymentNumber: customerData.paymentNumber,
      });

      const submittedIds = new Set(itemsToSubmit.map((i) => i.productId));
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      setLatestSubmittedOrder(newOrder);
      setCheckoutItems(null);
      setCartItems((prev) => prev.filter((item) => !submittedIds.has(item.productId)));

      if (authUser) {
        setAuthUser({
          ...authUser,
          fullName: customerData.fullName,
          phone: customerData.phone,
          region: customerData.region,
          street: customerData.street,
          email: customerData.email || authUser.email,
        });
      }

      loadData();
    } catch (err: any) {
      console.error('Order submission failed:', err);
      setOrderErrorBanner(err.message || 'Order submission failed. Please try again.');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const term = activeSearchQuery.toLowerCase().trim();
    if (term) {
      const nameMatch = p.name.toLowerCase().includes(term);
      const catMatch = p.category.toLowerCase().includes(term);
      const descMatch = p.description ? p.description.toLowerCase().includes(term) : false;
      const specsMatch =
        Array.isArray(p.specifications) && p.specifications.some((s) => s.toLowerCase().includes(term));
      const condMatch = p.condition ? p.condition.toLowerCase().includes(term) : false;
      const locMatch = p.location ? p.location.toLowerCase().includes(term) : false;

      return nameMatch || catMatch || descMatch || specsMatch || condMatch || locMatch;
    }

    if (selectedCategory === 'Services') return false;
    return selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Matching Services during Search
  const filteredServices = services.filter((srv) => {
    const term = activeSearchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      srv.title.toLowerCase().includes(term) ||
      srv.description.toLowerCase().includes(term) ||
      'services'.includes(term)
    );
  });

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleDeleteNotification = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await api.deleteNotification(id);
    } catch (e) {
      console.error('Failed to delete notification:', e);
      loadData();
    }
  };

  const showFullChat = isChatFullMode && activeTab === 'messenger';
  const showForcedAdminPasswordModal = Boolean(
    authUser &&
      (authUser.role === 'admin' || isOfficialAdminEmail(authUser.email)) &&
      authUser.mustChangePassword &&
      adminUnlocked
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-[#00B553] selection:text-white">
      {/* Top Header - Hidden in Full Chat Mode */}
      {!showFullChat && (
        <Header
          settings={settings}
          language={language}
          setLanguage={setLanguage}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearchSubmit={(query) => {
            setActiveSearchQuery(query.trim());
            setIsSearchFocused(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onClearSearch={() => setActiveSearchQuery('')}
          onSearchFocusChange={setIsSearchFocused}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotifCount={unreadNotifCount}
          onOpenAdmin={() => setIsAdminDashboardOpen(true)}
          isAdminUser={Boolean(
            authUser && (authUser.role === 'admin' || isOfficialAdminEmail(authUser.email))
          )}
          isHomePage={activeTab === 'home'}
        />
      )}

      {/* Inline Order Error Toast */}
      {orderErrorBanner && (
        <div className="max-w-4xl mx-auto px-3 pt-2">
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between">
            <span>{orderErrorBanner}</span>
            <button
              type="button"
              onClick={() => setOrderErrorBanner(null)}
              className="text-red-500 font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Tab Render Area */}
      <main className={showFullChat ? 'w-full bg-white' : 'max-w-4xl mx-auto bg-white'}>
        {activeTab === 'home' && (
          <div className="bg-white min-h-[85vh] pb-20">
            {/* Promotional Slides Banner at Top of Home Page */}
            {!activeSearchQuery && (
              <PromoBannerCarousel
                language={language}
                banners={banners}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setSelectedServiceId(null);
                  const el = document.getElementById('home-products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            )}

            {/* Recommended Categories Horizontal Scroll */}
            {!activeSearchQuery && (
              <RecommendedCategories
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setSelectedServiceId(null);
                }}
                language={language}
              />
            )}

            {/* Home Content Area */}
            <div id="home-products-section" className="p-3 bg-white space-y-5">
              {selectedCategory === 'Services' && !activeSearchQuery ? (
                <ServicesSection
                  services={services}
                  language={language}
                  selectedServiceId={selectedServiceId}
                  onSelectServiceCategory={setSelectedServiceId}
                  onBookService={handleBookServiceClick}
                />
              ) : (
                <>
                  {activeSearchQuery ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                      <div className="min-w-0 pr-2">
                        <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          {language === 'en' ? 'Search Results for' : 'Matokeo ya Utafutaji wa'}
                        </div>
                        <h2 className="text-sm font-black text-slate-900 truncate">
                          "{activeSearchQuery}"
                        </h2>
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {filteredProducts.length}{' '}
                          {filteredProducts.length === 1
                            ? language === 'en'
                              ? 'product'
                              : 'bidhaa'
                            : language === 'en'
                            ? 'products'
                            : 'bidhaa'}
                          {filteredServices.length > 0 &&
                            ` · ${filteredServices.length} ${
                              language === 'en' ? 'services' : 'huduma'
                            }`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          setActiveSearchQuery('');
                        }}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs transition-colors flex-shrink-0 cursor-pointer"
                      >
                        {language === 'en' ? 'Clear Search' : 'Futa Utafutaji'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                        {selectedCategory === 'All'
                          ? language === 'en'
                            ? 'Trending'
                            : 'Inayovuma'
                          : selectedCategory}
                      </h2>
                      <span className="text-xs text-gray-500 font-medium tabular-nums">
                        {filteredProducts.length} items available
                      </span>
                    </div>
                  )}

                  {filteredProducts.length === 0 && filteredServices.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 my-2">
                      <div className="text-base font-extrabold text-slate-800">
                        {language === 'en' ? 'No products found' : 'Hakuna bidhaa zilizopatikana'}
                      </div>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        {language === 'en'
                          ? `Try another search like "iPhone", "Lenovo", "Laptop", "CCTV", or "Repair".`
                          : `Jaribu kutafuta tena neno kama "iPhone", "Lenovo", "Laptop", "CCTV", au "Repair".`}
                      </p>
                      {activeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchInput('');
                            setActiveSearchQuery('');
                          }}
                          className="text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          {language === 'en' ? 'Clear & View All' : 'Futa & Tazama Zote'}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredProducts.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {filteredProducts.map((prod) => (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            onOpenDetails={(p) => setActiveProductDetails(p)}
                            onAddToCart={(p, e) => {
                              e.stopPropagation();
                              handleAddToCart(p);
                            }}
                            onBuyNow={(p, e) => {
                              e.stopPropagation();
                              handleBuyNow(p);
                            }}
                          />
                        ))}
                      </div>
                    )
                  )}

                  {/* Home Page Large "View Our Services" Banner ('All') OR Matching Search Services */}
                  {selectedCategory === 'All' && !activeSearchQuery && (
                    <ServicesHomeBanner
                      language={language}
                      servicesCount={services.length}
                      bannerConfig={settings.servicesBanner}
                      onOpenServices={() => {
                        setSelectedCategory('Services');
                        setSelectedServiceId(null);
                        const el = document.getElementById('home-products-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  )}

                  {activeSearchQuery && filteredServices.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <ServicesSection
                        services={filteredServices}
                        language={language}
                        selectedServiceId={selectedServiceId}
                        onSelectServiceCategory={(srvId) => {
                          setSearchInput('');
                          setActiveSearchQuery('');
                          setSelectedCategory('Services');
                          setSelectedServiceId(srvId);
                        }}
                        onBookService={handleBookServiceClick}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <CartView
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onProceedToCheckout={(selectedItems) => setCheckoutItems(selectedItems)}
            onContinueShopping={() => setActiveTab('home')}
            outsideDarFee={settings.deliverySettings.outsideDarFee}
          />
        )}

        {activeTab === 'messenger' && (
          <AppexAiChat
            customerPhone={customerProfile.phone}
            isFullMode={isChatFullMode}
            onEnterFullMode={() => setIsChatFullMode(true)}
            onExitFullMode={() => setIsChatFullMode(false)}
            onCloseChat={() => {
              setIsChatFullMode(false);
              setActiveTab('home');
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            bookings={bookings}
            paymentSettings={settings.paymentSettings}
            whatsappNumber={settings.contactSettings?.whatsapp}
            onRefreshOrders={loadData}
            onContinueShopping={() => setActiveTab('home')}
            onBrowseServices={() => {
              setSelectedCategory('Services');
              setSelectedServiceId(null);
              setActiveTab('home');
            }}
            highlightedOrderId={highlightedOrderId}
            onClearHighlight={() => setHighlightedOrderId(null)}
            highlightedBookingId={highlightedBookingId}
            onClearBookingHighlight={() => setHighlightedBookingId(null)}
            initialSubTab={ordersInitialSubTab}
          />
        )}

        {activeTab === 'myappex' && (
          <MyAppexView
            settings={settings}
            profile={customerProfile}
            onSaveProfile={(prof) => {
              setAuthUser(prof);
              const isAdmin = prof.role === 'admin' || isOfficialAdminEmail(prof.email);
              if (isAdmin && prof.authProvider === 'email') {
                setAdminUnlocked(true);
              }
            }}
            language={language}
            setLanguage={setLanguage}
            onOpenAdmin={() => setIsAdminDashboardOpen(true)}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Bottom Fixed Navigation Bar */}
      {!showFullChat && !isSearchFocused && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          cartCount={totalCartCount}
          isVisible={isBottomNavVisible}
        />
      )}

      {/* Floating Round Dark Blue Animated "Obby Ai" Chatbot Button (Bottom-Right) */}
      {activeTab !== 'messenger' &&
        !isSearchFocused &&
        !activeProductDetails &&
        !checkoutItems &&
        !latestSubmittedOrder &&
        !activeBookingService &&
        !isAdminDashboardOpen &&
        !isNotificationsOpen &&
        !authModalState.isOpen && (
          <div
            className={`fixed right-3.5 z-35 transition-all duration-150 ease-out ${
              isBottomNavVisible ? 'bottom-[70px]' : 'bottom-4'
            }`}
          >
            <button
              type="button"
              onClick={() => handleTabChange('messenger')}
              aria-label="Open Obby Ai Chatbot"
              title="Obby Ai"
              className="relative group animate-obby-float w-[54px] h-[54px] rounded-full flex flex-col items-center justify-center bg-[#0B3B8C] hover:bg-[#082E6E] text-white shadow-[0_6px_20px_rgba(11,59,140,0.48)] border border-white/25 transition-colors active:scale-95 cursor-pointer"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[#1565C0] opacity-35 animate-ping pointer-events-none"
              />
              <Bot className="w-5 h-5 relative z-10 shrink-0" />
              <span className="relative z-10 text-[9px] font-bold leading-none mt-0.5 tracking-tight whitespace-nowrap">
                Obby Ai
              </span>
            </button>
          </div>
        )}

      {/* OVERLAY MODALS */}

      {/* Mandatory Temporary Admin Password Change Modal */}
      {showForcedAdminPasswordModal && authUser?.email && (
        <AdminPasswordForceModal
          adminEmail={authUser.email}
          onPasswordChanged={() => {
            setAuthUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
            loadData();
          }}
          onSignOut={handleSignOut}
        />
      )}

      {/* Route Protection Auth Modal Overlay */}
      {authModalState.isOpen && (
        <AuthModal
          isOpen={true}
          isModal={true}
          title="OBBY TECH"
          subtitle={authModalState.subtitle || 'Sign in or create an account to continue'}
          websiteLogo={settings.websiteLogo}
          onClose={() => {
            setPendingTab(null);
            setPendingBuyProduct(null);
            setPendingBookingService(null);
            setPendingBookingShowcaseItem(null);
            setAuthModalState({ isOpen: false });
          }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Service Booking Modal */}
      {activeBookingService && (
        <ServiceBookingModal
          services={services}
          initialService={activeBookingService}
          initialShowcaseItem={activeBookingShowcaseItem}
          customerProfile={customerProfile}
          whatsappNumber={settings.contactSettings?.whatsapp || '+255713340900'}
          onClose={() => {
            setActiveBookingService(null);
            setActiveBookingShowcaseItem(null);
          }}
          onBookingCreated={(saved) => {
            setBookings((prev) => [saved, ...prev.filter((b) => b.id !== saved.id)]);
            loadData();
          }}
          onViewBookings={(bookingId) => {
            setActiveBookingService(null);
            setActiveBookingShowcaseItem(null);
            setOrdersInitialSubTab('bookings');
            setHighlightedBookingId(bookingId);
            setActiveTab('orders');
          }}
        />
      )}

      {/* Product Details Drawer/Modal */}
      {activeProductDetails && (
        <ProductDetailsModal
          product={activeProductDetails}
          allProducts={products}
          onSelectProduct={(p) => setActiveProductDetails(p)}
          onClose={() => setActiveProductDetails(null)}
          onAddToCart={(p, q) => handleAddToCart(p, q)}
          onBuyNow={(p, q) => handleBuyNow(p, q)}
        />
      )}

      {/* Checkout Modal Form */}
      {checkoutItems && (
        <CheckoutModal
          items={checkoutItems}
          deliverySettings={settings.deliverySettings}
          paymentSettings={settings.paymentSettings}
          customerProfile={customerProfile}
          onClose={() => setCheckoutItems(null)}
          onSubmitOrder={handleSubmitOrder}
        />
      )}

      {/* Payment Selection Modal */}
      {latestSubmittedOrder && (
        <PaymentSelectionModal
          order={latestSubmittedOrder}
          paymentSettings={settings.paymentSettings}
          onClose={() => setLatestSubmittedOrder(null)}
          onOrderUpdated={(updated) => {
            setLatestSubmittedOrder(updated);
            loadData();
          }}
          onViewOrders={() => {
            const targetId = latestSubmittedOrder.id;
            setLatestSubmittedOrder(null);
            setOrdersInitialSubTab('orders');
            setHighlightedOrderId(targetId);
            setActiveTab('orders');
          }}
        />
      )}

      {/* Admin Dashboard Overlay */}
      {isAdminDashboardOpen && (
        <AdminDashboard
          products={products}
          orders={orders}
          categories={categories}
          settings={settings}
          authUser={authUser}
          initialAdminUnlocked={adminUnlocked}
          onAdminUnlocked={(needsChange) => {
            setAdminUnlocked(true);
            setAuthUser((prev) => (prev ? { ...prev, mustChangePassword: needsChange } : null));
          }}
          onPasswordUpdated={() => {
            setAuthUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
            loadData();
          }}
          onRefreshData={loadData}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}

      {/* Notification Drawer */}
      {isNotificationsOpen && (
        <NotificationDrawer
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkRead={async (id) => {
            await api.markNotificationRead(id);
            loadData();
          }}
          onDeleteNotification={handleDeleteNotification}
        />
      )}
    </div>
  );
}
