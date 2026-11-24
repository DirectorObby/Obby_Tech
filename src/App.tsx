import React, { useState, useEffect, useRef } from 'react';
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
  restoreSavedAuthToken,
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
  const [hasLoadedServerData, setHasLoadedServerData] = useState(false);
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
  const pendingCartActionRef = useRef<{
    product: Product;
    quantity: number;
    openCheckout?: boolean;
  } | null>(null);
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

  // Phone / Browser Hardware Back Button Support — step back through modals & inner pages before exiting
  const navDepth =
    (activeTab !== 'home' ? 1 : 0) +
    (activeTab === 'home' && selectedCategory !== 'All' ? 1 : 0) +
    (activeTab === 'home' && selectedCategory === 'Services' && selectedServiceId ? 1 : 0) +
    (activeTab === 'home' && activeSearchQuery ? 1 : 0) +
    (activeProductDetails ? 1 : 0) +
    (checkoutItems ? 1 : 0) +
    (latestSubmittedOrder ? 1 : 0) +
    (activeBookingService ? 1 : 0) +
    (authModalState.isOpen ? 1 : 0) +
    (isNotificationsOpen ? 1 : 0) +
    (isAdminDashboardOpen ? 1 : 0) +
    (isChatFullMode ? 1 : 0);

  const lastNavDepthRef = useRef(0);
  const isPoppingHistoryRef = useRef(false);
  const navSnapshotRef = useRef({
    activeTab,
    selectedCategory,
    selectedServiceId,
    activeSearchQuery,
    activeProductDetails,
    checkoutItems,
    latestSubmittedOrder,
    activeBookingService,
    authModalOpen: authModalState.isOpen,
    isNotificationsOpen,
    isAdminDashboardOpen,
    isChatFullMode,
  });

  navSnapshotRef.current = {
    activeTab,
    selectedCategory,
    selectedServiceId,
    activeSearchQuery,
    activeProductDetails,
    checkoutItems,
    latestSubmittedOrder,
    activeBookingService,
    authModalOpen: authModalState.isOpen,
    isNotificationsOpen,
    isAdminDashboardOpen,
    isChatFullMode,
  };

  useEffect(() => {
    if (isPoppingHistoryRef.current) {
      isPoppingHistoryRef.current = false;
      lastNavDepthRef.current = navDepth;
      return;
    }

    if (navDepth > lastNavDepthRef.current) {
      window.history.pushState({ obbyNavDepth: navDepth }, '');
    }
    lastNavDepthRef.current = navDepth;
  }, [navDepth]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const s = navSnapshotRef.current;
      const currentDepth =
        (s.activeTab !== 'home' ? 1 : 0) +
        (s.activeTab === 'home' && s.selectedCategory !== 'All' ? 1 : 0) +
        (s.activeTab === 'home' && s.selectedCategory === 'Services' && s.selectedServiceId ? 1 : 0) +
        (s.activeTab === 'home' && s.activeSearchQuery ? 1 : 0) +
        (s.activeProductDetails ? 1 : 0) +
        (s.checkoutItems ? 1 : 0) +
        (s.latestSubmittedOrder ? 1 : 0) +
        (s.activeBookingService ? 1 : 0) +
        (s.authModalOpen ? 1 : 0) +
        (s.isNotificationsOpen ? 1 : 0) +
        (s.isAdminDashboardOpen ? 1 : 0) +
        (s.isChatFullMode ? 1 : 0);

      if (currentDepth <= 0) return;

      isPoppingHistoryRef.current = true;

      if (s.isAdminDashboardOpen) {
        setIsAdminDashboardOpen(false);
      } else if (s.isNotificationsOpen) {
        setIsNotificationsOpen(false);
      } else if (s.authModalOpen) {
        setPendingTab(null);
        pendingCartActionRef.current = null;
        setPendingBookingService(null);
        setPendingBookingShowcaseItem(null);
        setAuthModalState({ isOpen: false });
      } else if (s.latestSubmittedOrder) {
        setLatestSubmittedOrder(null);
      } else if (s.checkoutItems) {
        setCheckoutItems(null);
      } else if (s.activeBookingService) {
        setActiveBookingService(null);
        setActiveBookingShowcaseItem(null);
      } else if (s.activeProductDetails) {
        setActiveProductDetails(null);
      } else if (s.isChatFullMode) {
        setIsChatFullMode(false);
      } else if (s.activeTab === 'home' && s.selectedCategory === 'Services' && s.selectedServiceId) {
        setSelectedServiceId(null);
      } else if (s.activeTab === 'home' && s.activeSearchQuery) {
        setSearchInput('');
        setActiveSearchQuery('');
      } else if (s.activeTab === 'home' && s.selectedCategory !== 'All') {
        setSelectedCategory('All');
      } else if (s.activeTab !== 'home') {
        setActiveTab('home');
      }

      const remainingDepth = Math.max(0, currentDepth - 1);
      if (remainingDepth > 0 && !event.state?.obbyNavDepth) {
        window.history.pushState({ obbyNavDepth: remainingDepth }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Restore Remembered Session & Verify Active Login on Startup
  useEffect(() => {
    const restoreSession = async () => {
      const { token } = restoreSavedAuthToken();
      if (token) {
        try {
          const me = await api.getCurrentUser();
          if (me && me.user) {
            setAuthUser(me.user);
            setAdminUnlocked(Boolean(me.adminUnlocked));
            return;
          }
        } catch {
          clearAuthToken();
        }
      }

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

    restoreSession();

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

  const mergeItemIntoCart = (baseCart: OrderItem[], product: Product, quantity: number): OrderItem[] => {
    const existing = baseCart.find((item) => item.productId === product.id);
    if (existing) {
      return baseCart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    }
    return [
      ...baseCart,
      {
        productId: product.id,
        productName: product.name,
        productImage: product.primaryImage,
        price: product.price,
        quantity,
      },
    ];
  };

  // Load Storefront & User-Private Data
  const loadData = async () => {
    try {
      const [prodsData, settingsData, catsData, srvsData, bannersData] = await Promise.all([
        api.getProducts().catch(() => null),
        api.getSettings().catch(() => null),
        api.getCategories().catch(() => null),
        api.getServices().catch(() => null),
        api.getBanners().catch(() => null),
      ]);

      if (prodsData) setProducts(prodsData);
      if (settingsData) setSettings(settingsData);
      if (catsData) setCategories(catsData);
      if (srvsData) setServices(srvsData);
      if (bannersData) {
        setBanners(bannersData);
        setHasLoadedServerData(true);
      }

      if (authUser?.id && getAuthToken()) {
        const isAdmin =
          (authUser.role === 'admin' || isOfficialAdminEmail(authUser.email)) && adminUnlocked;
        const [ordersData, bookingsData, notifsData, cartData] = await Promise.all([
          api.getOrders(isAdmin).catch(() => []),
          api.getBookings(isAdmin).catch(() => []),
          api.getNotifications(isAdmin).catch(() => []),
          api.getCart().catch(() => []),
        ]);
        setOrders(ordersData);
        setBookings(bookingsData);
        setNotifications(notifsData);

        const pendingAction = pendingCartActionRef.current;
        if (pendingAction) {
          pendingCartActionRef.current = null;
          const mergedCart = mergeItemIntoCart(
            cartData,
            pendingAction.product,
            pendingAction.quantity
          );
          setCartItems(mergedCart);
          api.saveCart(mergedCart).catch((err) => console.error('Failed to sync cart:', err));
          if (pendingAction.openCheckout) {
            setCheckoutItems([
              {
                productId: pendingAction.product.id,
                productName: pendingAction.product.name,
                productImage: pendingAction.product.primaryImage,
                price: pendingAction.product.price,
                quantity: pendingAction.quantity,
              },
            ]);
          }
        } else {
          setCartItems(cartData);
        }
      } else {
        setOrders([]);
        setBookings([]);
        setNotifications([]);
        setCartItems([]);
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
  const handleAuthSuccess = (user: CustomerProfile, token: string, rememberMe: boolean = true) => {
    setAuthToken(token, rememberMe);
    setOrders([]);
    setBookings([]);
    setNotifications([]);
    setCartItems([]);
    setAuthUser(user);
    const isAdmin = user.role === 'admin' || isOfficialAdminEmail(user.email);
    setAdminUnlocked(isAdmin && user.authProvider === 'email');
    setAuthModalState({ isOpen: false });

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
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

  // Handle Logout — immediately hide all account data on screen while keeping it saved on the server for next sign-in
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
    pendingCartActionRef.current = null;
    setPendingTab(null);
    setPendingBookingService(null);
    setPendingBookingShowcaseItem(null);
    setAuthModalState({ isOpen: false });
    setAuthUser(null);
    setAdminUnlocked(false);
    setIsAdminDashboardOpen(false);
    setIsNotificationsOpen(false);
    setIsChatFullMode(false);
    setActiveProductDetails(null);
    setActiveBookingService(null);
    setActiveBookingShowcaseItem(null);
    setCheckoutItems(null);
    setLatestSubmittedOrder(null);
    setHighlightedOrderId(null);
    setHighlightedBookingId(null);
    setSearchInput('');
    setActiveSearchQuery('');
    setSelectedCategory('All');
    setSelectedServiceId(null);
    setCartItems([]);
    setOrders([]);
    setBookings([]);
    setNotifications([]);
    setActiveTab('home');
  };

  // Cart Helpers (Strictly Per-User Account)
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (!authUser) {
      pendingCartActionRef.current = { product, quantity, openCheckout: false };
      setAuthModalState({
        isOpen: true,
        subtitle: `Please sign in or create an account to save ${product.name} to your cart`,
      });
      return;
    }

    const nextCart = mergeItemIntoCart(cartItems, product, quantity);
    setCartItems(nextCart);
    api.saveCart(nextCart).catch((err) => console.error('Failed to save cart:', err));
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    if (!authUser) {
      pendingCartActionRef.current = { product, quantity, openCheckout: true };
      setAuthModalState({
        isOpen: true,
        subtitle: `Please sign in to complete your purchase of ${product.name}`,
      });
      return;
    }

    const nextCart = mergeItemIntoCart(cartItems, product, quantity);
    setCartItems(nextCart);
    api.saveCart(nextCart).catch((err) => console.error('Failed to save cart:', err));
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
    const nextCart =
      quantity <= 0
        ? cartItems.filter((i) => i.productId !== productId)
        : cartItems.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    setCartItems(nextCart);
    if (authUser && getAuthToken()) {
      api.saveCart(nextCart).catch((err) => console.error('Failed to save cart:', err));
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    const nextCart = cartItems.filter((i) => i.productId !== productId);
    setCartItems(nextCart);
    if (authUser && getAuthToken()) {
      api.saveCart(nextCart).catch((err) => console.error('Failed to save cart:', err));
    }
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
      const remainingCart = cartItems.filter((item) => !submittedIds.has(item.productId));
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      setLatestSubmittedOrder(newOrder);
      setCheckoutItems(null);
      setCartItems(remainingCart);

      if (authUser && getAuthToken()) {
        await api.saveCart(remainingCart).catch((err) => console.error('Failed to update cart:', err));
      }

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
    <div className="min-h-screen bg-[#F2F6FC] text-gray-900 font-sans antialiased selection:bg-[#00B553] selection:text-white">
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
      <main className={showFullChat ? 'w-full bg-white' : 'max-w-4xl mx-auto bg-[#F2F6FC]'}>
        {activeTab === 'home' && (
          <div className="bg-[#F2F6FC] min-h-[85vh] pb-20">
            {/* Promotional Slides Banner at Top of Home Page */}
            {!activeSearchQuery && (
              <PromoBannerCarousel
                language={language}
                banners={banners}
                hasLoadedFromServer={hasLoadedServerData}
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
            <div id="home-products-section" className="p-3 bg-[#F2F6FC] space-y-5">
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

                  {/* Home Page Large "View Our Services" Banner ('All') — Edge-to-Edge 16:9 */}
                  {selectedCategory === 'All' && !activeSearchQuery && (
                    <div className="-mx-3">
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
                    </div>
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
            key={`cart-${authUser?.id || 'guest'}`}
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
            key={`chat-${authUser?.id || 'guest'}`}
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
            key={`orders-${authUser?.id || 'guest'}`}
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
            key={`myobby-${authUser?.id || 'guest'}`}
            settings={settings}
            profile={customerProfile}
            onSaveProfile={(prof) => {
              setAuthUser(prof);
              const isAdmin = prof.role === 'admin' || isOfficialAdminEmail(prof.email);
              if (isAdmin && prof.authProvider === 'email') {
                setAdminUnlocked(true);
              }
            }}
            onAuthSuccess={handleAuthSuccess}
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

      {/* Floating Round Animated WhatsApp Button (+255 713 340 900) at Bottom-Right */}
      {activeTab !== 'messenger' &&
        !isSearchFocused &&
        !activeProductDetails &&
        !checkoutItems &&
        !latestSubmittedOrder &&
        !activeBookingService &&
        !isAdminDashboardOpen &&
        !isNotificationsOpen &&
        !authModalState.isOpen && (() => {
          const rawWa = (settings.contactSettings?.whatsapp || '+255713340900').replace(/[^\d]/g, '');
          const waDigits = rawWa.startsWith('0') && rawWa.length >= 10 ? `255${rawWa.slice(1)}` : rawWa || '255713340900';
          return (
            <div
              className={`fixed right-3.5 z-35 transition-all duration-150 ease-out ${
                isBottomNavVisible ? 'bottom-[72px]' : 'bottom-4'
              }`}
            >
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp +255 713 340 900"
                title="Chat on WhatsApp (+255 713 340 900)"
                className="relative group animate-obby-float w-[54px] h-[54px] rounded-full flex items-center justify-center bg-[#25D366] hover:bg-[#1fb857] text-white shadow-[0_6px_20px_rgba(37,211,102,0.45)] border-2 border-white transition-colors active:scale-95"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 animate-ping pointer-events-none"
                />
                <svg className="w-7 h-7 fill-current relative z-10" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.438-.516.078-1.188.109-1.906-.125-.438-.141-1-.328-1.719-.641-3.031-1.313-5-4.375-5.156-4.578-.156-.203-1.234-1.641-1.234-3.125s.781-2.219 1.063-2.516c.281-.297.609-.375.813-.375s.406 0 .578.016c.188.016.438-.078.688.531.25.609.859 2.094.938 2.25.078.156.125.344.016.547-.109.203-.156.328-.313.516-.156.188-.328.422-.469.563-.156.156-.313.328-.141.625.172.297.781 1.281 1.672 2.078 1.156 1.031 2.125 1.344 2.422 1.5.297.156.469.125.641-.078.172-.203.75-.875.953-1.172.203-.297.406-.25.672-.156.266.094 1.719.813 2.016.953.297.156.5.219.578.344.078.125.078.734-.172 1.438z" />
                </svg>
              </a>
            </div>
          );
        })()}

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
            pendingCartActionRef.current = null;
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
