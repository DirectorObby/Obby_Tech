import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  ClipboardList,
  CreditCard,
  Image as ImageIcon,
  PhoneCall,
  Key,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Wrench,
  Sparkles,
  Layers,
  Bot,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Cloud,
  CloudOff,
} from 'lucide-react';
import {
  AIInstruction,
  AdminSettings,
  BookingStatus,
  CategoryItem,
  CategoryName,
  CustomerProfile,
  DeliveryStatus,
  Order,
  PaymentStatus,
  Product,
  PromoBanner,
  ServiceBooking,
  ServiceIconName,
  ServiceItem,
  ServiceShowcaseItem,
} from '../types';
import { api, isOfficialAdminEmail } from '../services/api';
import {
  auth,
  firebaseSignOut,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
} from '../lib/firebase';
import {
  deleteAiInstructionInFirestore,
  deleteBannerInFirestore,
  deleteBookingInFirestore,
  deleteOrderInFirestore,
  deleteProductInFirestore,
  deleteServiceInFirestore,
  ensureAdminRegistryInFirestore,
  fetchAiInstructionsFromFirestore,
  fetchStorefrontFromFirestore,
  isFirebaseAdminVerified,
  saveSettingsToFirestore,
  syncFullStorefrontToFirestore,
  upsertAiInstructionInFirestore,
  upsertBannerInFirestore,
  upsertBookingInFirestore,
  upsertCategoryInFirestore,
  upsertOrderInFirestore,
  upsertProductInFirestore,
  upsertServiceInFirestore,
} from '../lib/firestoreStore';
import { renderCategoryLucideIcon } from './RecommendedCategories';
import { renderServiceIcon } from './ServicesSection';
import { ObbyTechLogoEmblem, ObbyTechWordmark } from './ObbyTechBrand';
import { uploadImageFile } from '../utils/imageUpload';

type AdminTab =
  | 'home'
  | 'products'
  | 'orders'
  | 'bookings'
  | 'services'
  | 'banners'
  | 'categories'
  | 'ai'
  | 'payments'
  | 'contacts'
  | 'branding'
  | 'password';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  categories: CategoryItem[];
  settings: AdminSettings;
  authUser?: CustomerProfile | null;
  initialAdminUnlocked?: boolean;
  onAdminUnlocked?: (mustChangePassword: boolean) => void;
  onPasswordUpdated?: () => void;
  onRefreshData: () => void;
  onClose: () => void;
}

const EMOJI_PRESETS = ['📱', '💻', '📹', '🔌', '🛠️', '🎧', '🖥️', '⚡', '🛡️', '🎨', '📢', '🎓'];
const LUCIDE_ICON_OPTIONS = [
  'Smartphone',
  'Laptop',
  'Camera',
  'Video',
  'Zap',
  'Wrench',
  'Headphones',
  'Monitor',
  'Shield',
  'Palette',
  'Megaphone',
  'GraduationCap',
  'Sparkles',
];

const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders: propOrders,
  categories: propCategories,
  settings,
  authUser,
  initialAdminUnlocked = false,
  onAdminUnlocked,
  onPasswordUpdated,
  onRefreshData,
  onClose,
}) => {
  const isVerifiedAdmin = Boolean(
    authUser && (authUser.role === 'admin' || isOfficialAdminEmail(authUser.email))
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    isVerifiedAdmin && initialAdminUnlocked
  );
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(
    Boolean(authUser?.mustChangePassword)
  );

  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminLoginPass, setShowAdminLoginPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin-specific data fetched when unlocked
  const [adminOrders, setAdminOrders] = useState<Order[]>(propOrders);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(propCategories);
  const [aiInstructions, setAiInstructions] = useState<AIInstruction[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('home');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Sync props
  useEffect(() => {
    if (propOrders.length > 0 && adminOrders.length === 0) setAdminOrders(propOrders);
  }, [propOrders]);

  useEffect(() => {
    setCategories(propCategories);
  }, [propCategories]);

  const hasInitializedSettingsForm = React.useRef(false);
  useEffect(() => {
    if (!hasInitializedSettingsForm.current) {
      setSettingsForm(settings);
      setNewLogo(settings.websiteLogo || '');
      setBrandingName(settings.websiteName || 'OBBY TECH');
      hasInitializedSettingsForm.current = true;
    }
  }, [settings]);

  const ADMIN_VAULT_KEY = 'obby_admin_store_vault_v1';
  const [vaultSnapshot, setVaultSnapshot] = useState<{
    exportedAt: string;
    settings?: AdminSettings;
    banners?: PromoBanner[];
    categories?: CategoryItem[];
    services?: ServiceItem[];
    products?: Product[];
    aiInstructions?: AIInstruction[];
  } | null>(() => {
    try {
      const raw = localStorage.getItem(ADMIN_VAULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() =>
    isFirebaseAdminVerified()
  );
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {
      setIsCloudConnected(isFirebaseAdminVerified());
    });
    return () => unsub();
  }, []);

  const handleConnectCloudDatabase = async () => {
    setIsConnectingCloud(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const signedEmail = (cred.user?.email || '').trim().toLowerCase();
      if (!cred.user?.emailVerified || !isOfficialAdminEmail(signedEmail)) {
        await firebaseSignOut(auth).catch(() => {});
        setIsCloudConnected(false);
        showToast(
          'Please sign in with the verified official admin Google account (obbyitmasters@gmail.com).',
          'error'
        );
        return;
      }

      setIsCloudConnected(true);
      await ensureAdminRegistryInFirestore();

      const [fsData, fsAi] = await Promise.all([
        fetchStorefrontFromFirestore().catch(() => null),
        fetchAiInstructionsFromFirestore().catch(() => []),
      ]);

      const isServerDefaultNumbers =
        settings.paymentSettings?.mpesa?.number === '0755123456' &&
        settings.paymentSettings?.tigoPesa?.number === '0655123456';

      if (fsData?.settings) {
        if (isServerDefaultNumbers) {
          await api.restoreAdminBackup({
            settings: fsData.settings,
            banners: fsData.banners,
            categories: fsData.categories,
            services: fsData.services,
            products: fsData.products,
            aiInstructions: fsAi,
          });
          setSettingsForm(fsData.settings);
          setNewLogo(fsData.settings.websiteLogo || '');
          setBrandingName(fsData.settings.websiteName || 'OBBY TECH');
        } else {
          const liveBackup = await api.exportAdminBackup().catch(() => null);
          if (liveBackup) {
            await syncFullStorefrontToFirestore(liveBackup);
          }
        }
      } else {
        const liveBackup = await api.exportAdminBackup().catch(() => null);
        const sourceSnapshot =
          isServerDefaultNumbers && vaultSnapshot?.settings
            ? vaultSnapshot
            : liveBackup || {
                settings: settingsForm,
                products,
                categories,
                services: servicesList,
                banners,
                aiInstructions,
              };
        await syncFullStorefrontToFirestore(sourceSnapshot);
        if (isServerDefaultNumbers && vaultSnapshot?.settings) {
          await api.restoreAdminBackup(vaultSnapshot).catch(() => {});
        }
      }

      await loadAdminData();
      onRefreshData();
      await syncAdminVaultFromServer();
      showToast('Cloud Firestore connected! All admin changes are now permanently saved.');
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || String(err?.message || '').includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'obby-tech.onrender.com';
        setToastMsg({
          type: 'error',
          text: `Add "${host}" in Firebase Console -> Authentication -> Settings -> Authorized domains, then click Connect Cloud Database again.`,
        });
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        showToast(err?.message || 'Could not connect Cloud Database.', 'error');
      }
    } finally {
      setIsConnectingCloud(false);
    }
  };

  const syncAdminVaultFromServer = async () => {
    if (!isVerifiedAdmin) return;
    try {
      const snapshot = await api.exportAdminBackup();
      try {
        localStorage.setItem(ADMIN_VAULT_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore quota limits if any
      }
      setVaultSnapshot(snapshot);
    } catch {
      // ignore background backup failures
    }
  };

  const loadAdminData = async () => {
    if (!isVerifiedAdmin || !isAuthenticated) return;
    setIsLoadingAdminData(true);
    try {
      const [ordersData, bookingsData, servicesData, bannersData, catsData, aiData] = await Promise.all([
        api.getOrders(true).catch(() => propOrders),
        api.getBookings(true).catch(() => []),
        api.getServices().catch(() => []),
        api.getBanners(true).catch(() => []),
        api.getCategories().catch(() => propCategories),
        api.getAiInstructions().catch(() => []),
      ]);
      setAdminOrders(ordersData);
      setBookings(bookingsData);
      setServicesList(servicesData);
      setBanners(bannersData);
      setCategories(catsData);
      setAiInstructions(aiData);
      if (bannersData.length > 0) {
        // Keep local backup up-to-date when server already holds admin changes
        const isServerDefaultNumbers =
          settings.paymentSettings?.mpesa?.number === '0755123456' &&
          settings.paymentSettings?.tigoPesa?.number === '0655123456';
        const hasCustomizedVault = Boolean(
          vaultSnapshot?.settings?.paymentSettings &&
            (vaultSnapshot.settings.paymentSettings.mpesa?.number !== '0755123456' ||
              vaultSnapshot.settings.paymentSettings.tigoPesa?.number !== '0655123456' ||
              (vaultSnapshot.settings.paymentSettings.customMethods?.length || 0) > 0)
        );
        if (!isServerDefaultNumbers || !hasCustomizedVault) {
          syncAdminVaultFromServer();
        }
      }
    } finally {
      setIsLoadingAdminData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !mustChangePassword) {
      loadAdminData();
    }
  }, [isAuthenticated, mustChangePassword]);

  // --- MANDATORY INITIAL PASSWORD CHANGE STATE ---
  const [forceCurrPass, setForceCurrPass] = useState('');
  const [forceNewPass, setForceNewPass] = useState('');
  const [forceConfirmPass, setForceConfirmPass] = useState('');
  const [forcePassError, setForcePassError] = useState('');
  const [isUpdatingForcePass, setIsUpdatingForcePass] = useState(false);

  // --- PRODUCT STATE ---
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productImageUrlInput, setProductImageUrlInput] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [primaryImgIdx, setPrimaryImgIdx] = useState(0);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // --- ORDER STATE ---
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // --- BOOKINGS STATE ---
  const [bookingFilter, setBookingFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [bookingNotesDraft, setBookingNotesDraft] = useState<Record<string, string>>({});
  const [bookingToDelete, setBookingToDelete] = useState<ServiceBooking | null>(null);

  // --- SERVICES MANAGEMENT STATE ---
  const [editingService, setEditingService] = useState<Partial<ServiceItem> | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

  // --- BANNERS STATE ---
  const [editingBanner, setEditingBanner] = useState<Partial<PromoBanner> | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<PromoBanner | null>(null);

  // --- CATEGORIES STATE ---
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // --- AI INSTRUCTIONS STATE ---
  const [newAiTitle, setNewAiTitle] = useState('');
  const [newAiText, setNewAiText] = useState('');
  const [editingAiItem, setEditingAiItem] = useState<AIInstruction | null>(null);

  // --- BRANDING, PASSWORD & SETTINGS STATE ---
  const [newLogo, setNewLogo] = useState(settings.websiteLogo || '');
  const [brandingName, setBrandingName] = useState(settings.websiteName || 'OBBY TECH');

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodProvider, setNewMethodProvider] = useState('');
  const [newMethodNumber, setNewMethodNumber] = useState('');
  const [newMethodAccountName, setNewMethodAccountName] = useState('');

  const [settingsForm, setSettingsForm] = useState<AdminSettings>(settings);
  const [editingPaymentKey, setEditingPaymentKey] = useState<string | null>(null);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);

  const defaultServicesBanner = {
    kicker: '',
    title: 'Obby Tech Services',
    subtitle: '',
    ctaText: 'View Services',
    imageUrl: '',
  };

  const servicesBannerForm = settingsForm.servicesBanner || defaultServicesBanner;

  const updateServicesBannerField = (
    field: keyof NonNullable<AdminSettings['servicesBanner']>,
    value: string
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      servicesBanner: {
        ...(prev.servicesBanner || defaultServicesBanner),
        [field]: value,
      },
    }));
  };

  const handleServicesBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 1920, maxRawBytes: 1_500_000, quality: 0.92 });
      updateServicesBannerField('imageUrl', imageUrl);
      showToast('Banner image uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load selected image.', 'error');
    }
  };

  const handleSaveServicesBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await api.updateSettings({ servicesBanner: servicesBannerForm });
      await saveSettingsToFirestore(saved);
      showToast('Home Page Services Banner updated successfully!');
      onRefreshData();
      syncAdminVaultFromServer();
    } catch (err: any) {
      showToast(err.message || 'Failed to save Home Page Services Banner', 'error');
    }
  };

  // Handle Admin Lock / Logout
  const handleAdminLock = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setAuthError('');
  };

  // Handle Admin Unlock Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter the administrator password.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin(passwordInput);
      const needsChange = Boolean(res.mustChangePassword);
      setMustChangePassword(needsChange);
      setIsAuthenticated(true);
      setAuthError('');
      setPasswordInput('');
      onAdminUnlocked?.(needsChange);
      onRefreshData();
    } catch (err: any) {
      setAuthError(err.message || 'Invalid administrator password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Mandatory Password Change
  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcePassError('');
    if (forceNewPass.length < 6) {
      setForcePassError('New password must be at least 6 characters long.');
      return;
    }
    if (forceNewPass === forceCurrPass) {
      setForcePassError('New password must be different from the initial temporary password.');
      return;
    }
    if (forceNewPass !== forceConfirmPass) {
      setForcePassError('New password and confirmation do not match.');
      return;
    }
    setIsUpdatingForcePass(true);
    try {
      await api.changeAdminPassword(forceCurrPass, forceNewPass);
      setMustChangePassword(false);
      setForceCurrPass('');
      setForceNewPass('');
      setForceConfirmPass('');
      onPasswordUpdated?.();
      showToast('Administrator password updated!');
      loadAdminData();
    } catch (err: any) {
      setForcePassError(err.message || 'Unable to change password.');
    } finally {
      setIsUpdatingForcePass(false);
    }
  };

  // Product helpers
  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList) as File[];
    e.target.value = '';
    let uploadedCount = 0;
    for (const file of files) {
      try {
        const imageUrl = await uploadImageFile(file, { maxDimension: 1400, maxRawBytes: 900_000, quality: 0.88 });
        setProductImages((prev) => [...prev, imageUrl]);
        uploadedCount += 1;
      } catch (err: any) {
        showToast(err?.message || `Could not load ${file.name}.`, 'error');
      }
    }
    if (uploadedCount > 0) {
      showToast(`${uploadedCount} product ${uploadedCount === 1 ? 'photo' : 'photos'} uploaded!`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.category || editingProduct?.price === undefined) {
      showToast('Please fill product name, category, and price', 'error');
      return;
    }

    const finalImages =
      productImages.length > 0
        ? productImages
        : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'];
    const parsedSpecs = specsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      ...editingProduct,
      specifications: parsedSpecs,
      images: finalImages,
      primaryImage: finalImages[primaryImgIdx] || finalImages[0],
      stock: Number(editingProduct.stock || 0),
      price: Number(editingProduct.price || 0),
    };

    try {
      let savedProduct: Product;
      if (editingProduct.id) {
        savedProduct = await api.updateProduct(editingProduct.id, payload);
        showToast('Product updated successfully!');
      } else {
        savedProduct = await api.createProduct(payload);
        showToast('New product added successfully!');
      }
      await upsertProductInFirestore(savedProduct);
      setEditingProduct(null);
      setProductImages([]);
      setSpecsText('');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      await deleteProductInFirestore(productToDelete.id);
      setProductToDelete(null);
      showToast('Product deleted.');
      onRefreshData();
      syncAdminVaultFromServer();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // Order helpers
  const handleOrderStatusUpdate = async (
    orderId: string,
    statusUpdates: { paymentStatus?: PaymentStatus; deliveryStatus?: DeliveryStatus }
  ) => {
    try {
      const updated = await api.updateOrderStatus(orderId, statusUpdates);
      await upsertOrderInFirestore(updated);
      setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Order #${orderId} updated.`);
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order', 'error');
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeletingOrder(true);
      await api.deleteOrder(orderToDelete.id);
      await deleteOrderInFirestore(orderToDelete.id);
      setAdminOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
      setOrderToDelete(null);
      showToast('Order deleted.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete order.', 'error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Booking helpers
  const handleBookingStatusUpdate = async (
    bookingId: string,
    status: BookingStatus,
    adminNotes?: string
  ) => {
    try {
      const updated = await api.updateBookingStatus(bookingId, { status, adminNotes });
      await upsertBookingInFirestore(updated);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      showToast(`Booking #${bookingId} marked as ${status}.`);
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update booking', 'error');
    }
  };

  const handleSaveBookingNotes = async (booking: ServiceBooking) => {
    const notes = bookingNotesDraft[booking.id] ?? booking.adminNotes ?? '';
    await handleBookingStatusUpdate(booking.id, booking.status, notes);
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      await api.deleteBooking(bookingToDelete.id);
      await deleteBookingInFirestore(bookingToDelete.id);
      setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));
      setBookingToDelete(null);
      showToast('Booking deleted.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete booking', 'error');
    }
  };

  // Services Management helpers
  const handleAddShowcaseItem = () => {
    if (!editingService) return;
    const currentItems = editingService.showcaseItems || [];
    const newItem: ServiceShowcaseItem = {
      id: `sh-${Date.now()}`,
      title: '',
      description: '',
      price: undefined,
      priceLabel: '',
      image: '',
    };
    setEditingService({
      ...editingService,
      showcaseItems: [...currentItems, newItem],
    });
  };

  const handleUpdateShowcaseItem = (
    itemId: string,
    patch: Partial<ServiceShowcaseItem>
  ) => {
    if (!editingService) return;
    setEditingService({
      ...editingService,
      showcaseItems: (editingService.showcaseItems || []).map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    });
  };

  const handleRemoveShowcaseItem = (itemId: string) => {
    if (!editingService) return;
    setEditingService({
      ...editingService,
      showcaseItems: (editingService.showcaseItems || []).filter((item) => item.id !== itemId),
    });
  };

  const handleShowcaseImageUpload = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 1400, maxRawBytes: 900_000, quality: 0.88 });
      handleUpdateShowcaseItem(itemId, { image: imageUrl });
      showToast('Service photo uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load selected image.', 'error');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title?.trim()) {
      showToast('Service category title is required.', 'error');
      return;
    }
    try {
      let savedService: ServiceItem;
      if (editingService.id) {
        savedService = await api.updateService(editingService.id, editingService);
        showToast('Service category & showcase updated!');
      } else {
        savedService = await api.createService(editingService);
        showToast('New service category added!');
      }
      await upsertServiceInFirestore(savedService);
      setEditingService(null);
      await loadAdminData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save service', 'error');
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      await api.deleteService(serviceToDelete.id);
      await deleteServiceInFirestore(serviceToDelete.id);
      setServicesList((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      setServiceToDelete(null);
      showToast('Service category deleted.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete service', 'error');
    }
  };

  // Banner helpers — preserve exact original uploaded banner photo in full crisp quality
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingBanner) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 1920, maxRawBytes: 1_500_000, quality: 0.92 });
      setEditingBanner((prev) => (prev ? { ...prev, image: imageUrl } : prev));
      showToast('Banner photo uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load selected banner image.', 'error');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner?.image) {
      showToast('Please select or enter a banner image.', 'error');
      return;
    }
    try {
      const payload = {
        ...editingBanner,
        titleEn: (editingBanner.titleEn || '').trim(),
        titleSw: (editingBanner.titleSw || '').trim(),
      };
      let savedBanner: PromoBanner;
      if (editingBanner.id) {
        savedBanner = await api.updateBanner(editingBanner.id, payload);
        showToast('Banner slide updated!');
      } else {
        savedBanner = await api.createBanner(payload);
        showToast('New banner slide added!');
      }
      await upsertBannerInFirestore(savedBanner);
      setEditingBanner(null);
      await loadAdminData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save banner', 'error');
    }
  };

  const handleMoveBannerOrder = async (index: number, direction: -1 | 1) => {
    const sorted = [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const current = sorted[index];
    const swap = sorted[targetIdx];
    try {
      const [u1, u2] = await Promise.all([
        api.updateBanner(current.id, { order: targetIdx + 1 }),
        api.updateBanner(swap.id, { order: index + 1 }),
      ]);
      await Promise.all([upsertBannerInFirestore(u1), upsertBannerInFirestore(u2)]);
      await loadAdminData();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder banner', 'error');
    }
  };

  const handleConfirmDeleteBanner = async () => {
    if (!bannerToDelete) return;
    try {
      await api.deleteBanner(bannerToDelete.id);
      await deleteBannerInFirestore(bannerToDelete.id);
      setBannerToDelete(null);
      await loadAdminData();
      onRefreshData();
      showToast('Banner deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete banner', 'error');
    }
  };

  // Category helpers
  const handleCategoryIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingCategory) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 600, maxRawBytes: 600_000 });
      setEditingCategory((prev) =>
        prev
          ? {
              ...prev,
              icon: imageUrl,
              iconType: 'image',
            }
          : prev
      );
      showToast('Category icon uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load icon image.', 'error');
    }
  };

  const handleCategoryThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingCategory) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 1200, maxRawBytes: 800_000 });
      setEditingCategory((prev) => (prev ? { ...prev, imageUrl } : prev));
      showToast('Category image uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load category image.', 'error');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      const updated = await api.updateCategory(editingCategory.id, {
        icon: editingCategory.icon,
        iconType: editingCategory.iconType || 'emoji',
        imageUrl: editingCategory.imageUrl,
        description: editingCategory.description,
      });
      await upsertCategoryInFirestore(updated);
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCategory(null);
      onRefreshData();
      syncAdminVaultFromServer();
      showToast(`Category "${updated.name}" updated!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update category', 'error');
    }
  };

  // AI Instructions helpers
  const handleAddAiInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAiTitle.trim() || !newAiText.trim()) return;
    try {
      const created = await api.createAiInstruction({
        title: newAiTitle.trim(),
        instruction: newAiText.trim(),
        enabled: true,
      });
      await upsertAiInstructionInFirestore(created);
      setAiInstructions((prev) => [created, ...prev]);
      setNewAiTitle('');
      setNewAiText('');
      showToast('AI instruction added & activated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to add AI instruction', 'error');
    }
  };

  const handleSaveAiInstructionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAiItem) return;
    try {
      const updated = await api.updateAiInstruction(editingAiItem.id, {
        title: editingAiItem.title,
        instruction: editingAiItem.instruction,
        enabled: editingAiItem.enabled,
      });
      await upsertAiInstructionInFirestore(updated);
      setAiInstructions((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setEditingAiItem(null);
      showToast('AI instruction updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update AI instruction', 'error');
    }
  };

  const handleToggleAiInstruction = async (item: AIInstruction) => {
    try {
      const updated = await api.updateAiInstruction(item.id, { enabled: !item.enabled });
      await upsertAiInstructionInFirestore(updated);
      setAiInstructions((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle AI instruction', 'error');
    }
  };

  const handleDeleteAiInstruction = async (id: string) => {
    try {
      await api.deleteAiInstruction(id);
      await deleteAiInstructionInFirestore(id);
      setAiInstructions((prev) => prev.filter((i) => i.id !== id));
      showToast('AI instruction removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove instruction', 'error');
    }
  };

  // Branding & Settings helpers
  const handleSaveBranding = async () => {
    try {
      const saved = await api.updateSettings({
        websiteLogo: newLogo,
        websiteName: brandingName,
      });
      await saveSettingsToFirestore(saved);
      showToast('Branding updated!');
      onRefreshData();
      syncAdminVaultFromServer();
    } catch (err: any) {
      showToast(err.message || 'Failed to update branding', 'error');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imageUrl = await uploadImageFile(file, { maxDimension: 1024, maxRawBytes: 900_000 });
      setNewLogo(imageUrl);
      showToast('Website logo uploaded!');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load logo image.', 'error');
    }
  };

  const persistSettings = async (nextSettings: AdminSettings, successMessage = 'Settings saved successfully!') => {
    try {
      const saved = await api.updateSettings(nextSettings);
      await saveSettingsToFirestore(saved);
      setSettingsForm(saved);
      showToast(successMessage);
      onRefreshData();
      syncAdminVaultFromServer();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  };

  const handleSaveSettings = async () => {
    await persistSettings(settingsForm, 'Settings saved successfully!');
  };

  const handleAddCustomPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName || !newMethodNumber) return;

    const newMethod = {
      id: `pm-${Date.now()}`,
      name: newMethodName,
      provider: newMethodProvider || newMethodName,
      number: newMethodNumber,
      accountName: newMethodAccountName || 'OBBY TECH',
      enabled: true,
    };

    const currentCustom = settingsForm.paymentSettings.customMethods || [];
    const nextSettings: AdminSettings = {
      ...settingsForm,
      paymentSettings: {
        ...settingsForm.paymentSettings,
        customMethods: [...currentCustom, newMethod],
      },
    };
    setSettingsForm(nextSettings);

    setNewMethodName('');
    setNewMethodProvider('');
    setNewMethodNumber('');
    setNewMethodAccountName('');
    await persistSettings(nextSettings, `Payment method "${newMethod.name}" saved!`);
  };

  const handleDeleteCustomPaymentMethod = async (idToDelete: string) => {
    const currentCustom = settingsForm.paymentSettings.customMethods || [];
    const nextSettings: AdminSettings = {
      ...settingsForm,
      paymentSettings: {
        ...settingsForm.paymentSettings,
        customMethods: currentCustom.filter((m) => m.id !== idToDelete),
      },
    };
    setSettingsForm(nextSettings);
    await persistSettings(nextSettings, 'Payment method removed & saved.');
  };

  const handleSaveAndAddPayment = async () => {
    await handleSaveSettings();
    setShowAddPaymentForm(true);
  };

  const handleDownloadAdminBackup = async () => {
    try {
      const snapshot = await api.exportAdminBackup();
      try {
        localStorage.setItem(ADMIN_VAULT_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore storage limits
      }
      setVaultSnapshot(snapshot);
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obby-tech-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup file downloaded!');
    } catch (err: any) {
      showToast(err?.message || 'Failed to download backup', 'error');
    }
  };

  const handleRestoreSnapshot = async (snapshotToRestore: any) => {
    if (!snapshotToRestore) return;
    setIsRestoringBackup(true);
    try {
      await api.restoreAdminBackup(snapshotToRestore);
      await syncFullStorefrontToFirestore(snapshotToRestore);
      if (snapshotToRestore.settings) {
        setSettingsForm(snapshotToRestore.settings);
      }
      await loadAdminData();
      onRefreshData();
      await syncAdminVaultFromServer();
      showToast('Admin settings, payment numbers & banners restored!');
    } catch (err: any) {
      showToast(err?.message || 'Failed to restore admin backup', 'error');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleUploadBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await handleRestoreSnapshot(parsed);
    } catch (err: any) {
      showToast(err?.message || 'Invalid backup file.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'error', text: 'New password and Confirm password do not match.' });
      return;
    }
    if (newPass.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    try {
      await api.changeAdminPassword(currPass, newPass);
      setPassMsg({ type: 'success', text: 'Administrator password changed successfully!' });
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
      onPasswordUpdated?.();
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Current password incorrect.' });
    }
  };

  const sortedOrders = useMemo(
    () =>
      [...adminOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [adminOrders]
  );

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (bookingFilter === 'ALL') return sorted;
    return sorted.filter((b) => b.status === bookingFilter);
  }, [bookings, bookingFilter]);

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [banners]
  );

  const customerContacts = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; region: string; source: string }>();
    adminOrders.forEach((o) => {
      if (o.phone) {
        map.set(o.phone.trim(), {
          phone: o.phone.trim(),
          name: o.customerName || 'Customer',
          region: o.region || 'Dodoma',
          source: 'Order',
        });
      }
    });
    bookings.forEach((b) => {
      if (b.phone && !map.has(b.phone.trim())) {
        map.set(b.phone.trim(), {
          phone: b.phone.trim(),
          name: b.customerName || 'Customer',
          region: 'Service Booking',
          source: 'Booking',
        });
      }
    });
    return Array.from(map.values());
  }, [adminOrders, bookings]);

  // Access guard
  if (!isVerifiedAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-sm font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600">
            The Admin Dashboard is accessible exclusively to the authorized administrator account.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer"
          >
            Return to Obby Tech
          </button>
        </div>
      </div>
    );
  }

  // Admin Password Verification Screen
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-2 pt-2">
            <div className="flex flex-col items-center gap-1.5">
              <ObbyTechLogoEmblem customLogoUrl={settings.websiteLogo} size="md" />
              <ObbyTechWordmark variant="light" size="md" />
            </div>
            <div className="text-xs font-black text-slate-900">
              OBBY TECH Administrator Access
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Authorized Account: <span className="text-slate-900 font-bold">{authUser?.email}</span>
            </div>
          </div>

          {authError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Enter Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showAdminLoginPass ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminLoginPass((p) => !p)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showAdminLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-md cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? 'VERIFYING...' : 'LOGIN TO ADMIN DASHBOARD'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Mandatory Temporary Password Replacement Gate
  if (mustChangePassword) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4 border border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-1.5 pt-2">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-black text-slate-900">Change Initial Admin Password</h2>
            <p className="text-xs text-slate-600">
              For security, update your temporary initial password before accessing the Admin Dashboard.
            </p>
          </div>

          {forcePassError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
              {forcePassError}
            </div>
          )}

          <form onSubmit={handleForcePasswordSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Temporary Password</label>
              <input
                type="password"
                required
                value={forceCurrPass}
                onChange={(e) => setForceCurrPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={forceNewPass}
                onChange={(e) => setForceNewPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={forceConfirmPass}
                onChange={(e) => setForceConfirmPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdatingForcePass}
              className="w-full bg-[#1565C0] hover:bg-[#0d47a1] text-white py-3 rounded-xl font-bold cursor-pointer disabled:opacity-60"
            >
              {isUpdatingForcePass ? 'Updating Password...' : 'Save New Password & Open Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingOrders = adminOrders.filter((o) => o.paymentStatus === 'PENDING').length;
  const paidOrders = adminOrders.filter((o) => o.paymentStatus === 'PAID').length;
  const pendingBookingsCount = bookings.filter((b) => b.status === 'PENDING').length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Dashboard', icon: <Package className="w-4 h-4 shrink-0" /> },
    { id: 'products', label: `Products (${products.length})`, icon: <Package className="w-4 h-4 shrink-0" /> },
    {
      id: 'orders',
      label: `Orders (${adminOrders.length})`,
      icon: <ClipboardList className="w-4 h-4 shrink-0" />,
      badge: pendingOrders,
    },
    {
      id: 'bookings',
      label: `Bookings (${bookings.length})`,
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      badge: pendingBookingsCount,
    },
    { id: 'services', label: `Services (${servicesList.length})`, icon: <Wrench className="w-4 h-4 shrink-0" /> },
    { id: 'banners', label: `Banners (${banners.length})`, icon: <Layers className="w-4 h-4 shrink-0" /> },
    { id: 'categories', label: 'Categories', icon: <Sparkles className="w-4 h-4 shrink-0" /> },
    { id: 'ai', label: 'AI Instructions', icon: <Bot className="w-4 h-4 shrink-0" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4 shrink-0" /> },
    { id: 'contacts', label: 'Contacts & Store', icon: <PhoneCall className="w-4 h-4 shrink-0" /> },
    { id: 'branding', label: 'Branding', icon: <ImageIcon className="w-4 h-4 shrink-0" /> },
    { id: 'password', label: 'Password', icon: <Key className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden animate-fade-in">
      {/* Top Navbar */}
      <div className="bg-[#0C0826] text-white p-3 px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <ObbyTechLogoEmblem customLogoUrl={settings.websiteLogo} size="xs" className="border border-white/15" />
          <ObbyTechWordmark variant="dark" size="sm" />
          <span className="text-xs font-semibold text-slate-300 truncate hidden sm:inline">
            Admin Dashboard
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onRefreshData();
              loadAdminData();
            }}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAdminData ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleAdminLock}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-red-400 cursor-pointer"
            title="Lock Admin Dashboard"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
            title="Close Admin Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Scrollable Navigation Strip */}
      <div className="sm:hidden bg-white border-b border-slate-200 px-2 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              activeTab === item.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden sm:flex w-56 bg-white border-r border-slate-200 flex-col p-2.5 space-y-1 overflow-y-auto shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-auto">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 max-w-5xl">
          {/* Cloud Firestore Sync Banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2.5 ${
              isCloudConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isCloudConnected ? (
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-extrabold">
                  {isCloudConnected
                    ? 'Cloud Database Connected (Firestore Active)'
                    : 'Cloud Database Not Yet Connected'}
                </div>
                <div className="text-[11px] opacity-85">
                  {isCloudConnected
                    ? 'All saved products, banners, payment numbers, contacts & services sync permanently across restarts.'
                    : 'Click Connect Cloud Database using obbyitmasters@gmail.com so changes never reset after server sleep or updates.'}
                </div>
              </div>
            </div>
            {!isCloudConnected && (
              <button
                type="button"
                disabled={isConnectingCloud}
                onClick={handleConnectCloudDatabase}
                className="px-3.5 py-1.5 bg-[#1565C0] hover:bg-[#0d47a1] text-white font-bold rounded-lg text-[11px] cursor-pointer disabled:opacity-60 shrink-0"
              >
                {isConnectingCloud ? 'Connecting...' : 'Connect Cloud Database'}
              </button>
            )}
          </div>

          {toastMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
                toastMsg.type === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>{toastMsg.text}</span>
              <button type="button" onClick={() => setToastMsg(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. DASHBOARD HOME */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Overview &amp; Activity
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs text-gray-500 font-semibold">Total Products</div>
                  <div className="text-xl font-black text-gray-900 mt-1">{products.length}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs text-amber-600 font-bold">Pending Orders</div>
                  <div className="text-xl font-black text-amber-600 mt-1">{pendingOrders}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs text-emerald-600 font-bold">Paid Orders</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">{paidOrders}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-xs text-blue-600 font-bold">Service Bookings</div>
                  <div className="text-xl font-black text-blue-600 mt-1">
                    {bookings.length}{' '}
                    <span className="text-[11px] font-semibold text-amber-600">
                      ({pendingBookingsCount} pending)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase">Recent Customer Orders</h3>
                  {sortedOrders.length === 0 ? (
                    <p className="text-xs text-gray-400">No orders received yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sortedOrders.slice(0, 5).map((o) => (
                        <div
                          key={o.id}
                          className="p-2.5 bg-gray-50 rounded-lg text-xs flex items-center justify-between border border-gray-100"
                        >
                          <div>
                            <span className="font-bold text-slate-900">#{o.id}</span> · {o.customerName} ({o.phone})
                            <div className="text-[10px] text-blue-600 font-medium">
                              {new Date(o.createdAt).toLocaleDateString()} · {o.region} · TSh {o.total.toLocaleString()}
                            </div>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {o.paymentStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 uppercase">Recent Service Bookings</h3>
                  {bookings.length === 0 ? (
                    <p className="text-xs text-gray-400">No service bookings received yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {bookings.slice(0, 5).map((b) => (
                        <div
                          key={b.id}
                          className="p-2.5 bg-gray-50 rounded-lg text-xs flex items-center justify-between border border-gray-100"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-900">#{b.id}</span> · {b.serviceName}
                            <div className="text-[10px] text-slate-500 truncate">
                              {b.customerName} · {b.bookingDate} {b.bookingTime}
                            </div>
                          </div>
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Saved Data Backup & Auto-Recovery Vault */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase">
                      Admin Store Backup &amp; Protection
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Protects your saved payment numbers, banners, logo, contacts, categories, services &amp; products across app updates.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadAdminBackup}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Save Backup (.json)
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Restore File
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleUploadBackupFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {vaultSnapshot?.settings?.paymentSettings &&
                  settings.paymentSettings?.mpesa?.number === '0755123456' &&
                  vaultSnapshot.settings.paymentSettings.mpesa?.number !== '0755123456' && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-amber-900">
                        <strong>Saved Admin Data Found on This Device</strong> (from{' '}
                        {new Date(vaultSnapshot.exportedAt).toLocaleString()}). Restore your saved payment numbers &amp; banners in one click.
                      </div>
                      <button
                        type="button"
                        disabled={isRestoringBackup}
                        onClick={() => handleRestoreSnapshot(vaultSnapshot)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer disabled:opacity-60"
                      >
                        {isRestoringBackup ? 'Restoring...' : 'Restore My Saved Data'}
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* 2. PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase">Product Catalog Management</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct({
                      name: '',
                      category: 'Phones',
                      price: 0,
                      description: '',
                      specifications: [],
                      stock: 10,
                      condition: 'Brand New',
                      location: 'Dodoma',
                    });
                    setProductImages([]);
                    setSpecsText('');
                    setPrimaryImgIdx(0);
                  }}
                  className="bg-[#00B553] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#009b47] cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Product
                </button>
              </div>

              {editingProduct && (
                <div className="bg-white p-4 rounded-xl border-2 border-[#00B553] shadow-md space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-bold text-gray-900">
                      {editingProduct.id ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full bg-gray-50 border p-2 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Category</label>
                        <select
                          value={editingProduct.category || 'Phones'}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, category: e.target.value as CategoryName })
                          }
                          className="w-full bg-gray-50 border p-2 rounded-lg"
                        >
                          <option value="Phones">Phones</option>
                          <option value="PC & Laptops">PC &amp; Laptops</option>
                          <option value="CCTV">CCTV</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Price (TSh)</label>
                        <input
                          type="number"
                          required
                          value={editingProduct.price || ''}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                          }
                          className="w-full bg-gray-50 border p-2 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Stock Qty</label>
                        <input
                          type="number"
                          required
                          value={editingProduct.stock ?? 0}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                          }
                          className="w-full bg-gray-50 border p-2 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Condition</label>
                        <select
                          value={editingProduct.condition || 'Brand New'}
                          onChange={(e) =>
                            setEditingProduct({ ...editingProduct, condition: e.target.value as any })
                          }
                          className="w-full bg-gray-50 border p-2 rounded-lg"
                        >
                          <option value="Brand New">Brand New</option>
                          <option value="Refurbished">Refurbished</option>
                          <option value="Used">Used</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={editingProduct.location || 'Dodoma'}
                          onChange={(e) => setEditingProduct({ ...editingProduct, location: e.target.value })}
                          className="w-full bg-gray-50 border p-2 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                      <label className="block font-bold text-gray-800">
                        Product Images (Upload from Device or Add Image URL)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          multiple
                          onChange={handleMultipleImageUpload}
                          className="text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-bold file:text-slate-800 hover:file:bg-slate-100 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="url"
                          placeholder="Or paste https:// image URL..."
                          value={productImageUrlInput}
                          onChange={(e) => setProductImageUrlInput(e.target.value)}
                          className="flex-1 bg-white border p-1.5 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (productImageUrlInput.trim()) {
                              setProductImages((prev) => [...prev, productImageUrlInput.trim()]);
                              setProductImageUrlInput('');
                            }
                          }}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Add URL
                        </button>
                      </div>

                      {productImages.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-2">
                          {productImages.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden flex-shrink-0">
                              <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setProductImages(productImages.filter((_, i) => i !== idx))}
                                className="absolute top-0 right-0 bg-red-600 text-white p-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPrimaryImgIdx(idx)}
                                className={`absolute bottom-0 inset-x-0 text-[8px] font-bold text-center py-0.5 cursor-pointer ${
                                  primaryImgIdx === idx ? 'bg-[#00B553] text-white' : 'bg-black/60 text-white'
                                }`}
                              >
                                {primaryImgIdx === idx ? 'Primary' : 'Set Main'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={editingProduct.description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full bg-gray-50 border p-2 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Specifications (one specification per line)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="8GB RAM&#10;256GB NVMe SSD&#10;Original Charger Included"
                        value={specsText}
                        onChange={(e) => setSpecsText(e.target.value)}
                        className="w-full bg-gray-50 border p-2 rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#00B553] text-white py-2.5 rounded-lg font-bold hover:bg-[#009b47] cursor-pointer"
                    >
                      SAVE PRODUCT
                    </button>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="divide-y divide-gray-100">
                  {products.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={p.primaryImage} alt={p.name} className="w-12 h-12 rounded object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{p.name}</div>
                          <div className="text-emerald-600 font-extrabold">TSh {p.price.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">
                            {p.category} · Stock: {p.stock}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            const imgs = p.images && p.images.length > 0 ? p.images : [p.primaryImage];
                            setProductImages(imgs);
                            setPrimaryImgIdx(Math.max(0, imgs.indexOf(p.primaryImage)));
                            setSpecsText((p.specifications || []).join('\n'));
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase">Customer Orders Management</h2>
                  <p className="text-[11px] text-slate-500">View and update customer payment and shipping status.</p>
                </div>
                <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                  Total Orders: {adminOrders.length}
                </div>
              </div>

              {adminOrders.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-slate-400 text-xs">
                  No customer orders placed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedOrders.map((o) => {
                    const productSummary = o.items
                      .map((i) => `${i.productName}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`)
                      .join(', ');
                    const isPaid = o.paymentStatus === 'PAID';
                    const isShipped = o.deliveryStatus === 'SHIPPED' || o.deliveryStatus === 'UMESAFIRISHWA';

                    return (
                      <div
                        key={o.id}
                        className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="font-black text-sm text-slate-900">Order #{o.id}</div>
                          <div className="text-[11px] text-blue-500 font-medium">
                            {new Date(o.createdAt).toLocaleDateString()} ·{' '}
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Customer</span>
                            <span className="font-bold text-slate-900">{o.customerName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Contact</span>
                            <span className="font-bold text-slate-900">{o.phone}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Region</span>
                            <span className="font-semibold text-slate-800">{o.region} ({o.street})</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Product</span>
                            <span className="font-bold text-slate-900">{productSummary}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total</span>
                            <span className="font-black text-blue-600">TSh {o.total.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 block">
                              Method: {o.paymentMethod === 'Tigo Pesa' ? 'Mixx by Yas' : o.paymentMethod}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-xs">Payment:</span>
                            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOrderStatusUpdate(o.id, { paymentStatus: 'PENDING' })}
                                className={`px-3 py-1 rounded-md font-extrabold text-[11px] cursor-pointer ${
                                  !isPaid ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                PENDING
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrderStatusUpdate(o.id, { paymentStatus: 'PAID' })}
                                className={`px-3 py-1 rounded-md font-extrabold text-[11px] cursor-pointer ${
                                  isPaid ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                PAID
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-xs">Shipping:</span>
                            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOrderStatusUpdate(o.id, { deliveryStatus: 'NOT_SHIPPED' })}
                                className={`px-3 py-1 rounded-md font-extrabold text-[11px] cursor-pointer ${
                                  !isShipped ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                NOT SHIPPED
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrderStatusUpdate(o.id, { deliveryStatus: 'SHIPPED' })}
                                className={`px-3 py-1 rounded-md font-extrabold text-[11px] cursor-pointer ${
                                  isShipped ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                                }`}
                              >
                                SHIPPED
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setOrderToDelete(o)}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Order</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. SERVICE BOOKINGS MANAGEMENT */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase">Service Bookings Management</h2>
                  <p className="text-[11px] text-slate-500">
                    Review service appointments, update statuses, add technician notes, or remove completed/cancelled records.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['ALL', ...BOOKING_STATUS_OPTIONS] as const).map((statusOpt) => (
                    <button
                      key={statusOpt}
                      type="button"
                      onClick={() => setBookingFilter(statusOpt)}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition-colors ${
                        bookingFilter === statusOpt
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {statusOpt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-slate-400 text-xs">
                  No service bookings match this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 text-xs shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-black text-sm text-slate-900">Booking #{b.id}</span>
                          <span className="ml-2 text-xs font-bold text-[#1565C0]">{b.serviceName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <Calendar className="w-3.5 h-3.5" /> {b.bookingDate}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <Clock className="w-3.5 h-3.5" /> {b.bookingTime}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Customer</span>
                          <span className="font-bold text-slate-900">{b.customerName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Phone &amp; Email</span>
                          <span className="font-bold text-slate-900 block">{b.phone}</span>
                          <span className="text-[10.5px] text-slate-500">{b.customerEmail}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Device Details</span>
                          <span className="font-semibold text-slate-800">{b.deviceDetails || 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-3 pt-1 border-t border-slate-200/70">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                            Problem / Request Description
                          </span>
                          <p className="text-slate-800 leading-relaxed">{b.problemDescription}</p>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Add technician or status note for customer..."
                          value={bookingNotesDraft[b.id] ?? b.adminNotes ?? ''}
                          onChange={(e) =>
                            setBookingNotesDraft((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveBookingNotes(b)}
                          className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-black cursor-pointer shrink-0"
                        >
                          Save Note
                        </button>
                      </div>

                      {/* Status Controls & Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {BOOKING_STATUS_OPTIONS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                handleBookingStatusUpdate(
                                  b.id,
                                  st,
                                  bookingNotesDraft[b.id] ?? b.adminNotes
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-[10.5px] font-extrabold cursor-pointer transition-all ${
                                b.status === st
                                  ? st === 'COMPLETED'
                                    ? 'bg-[#00B553] text-white'
                                    : st === 'CANCELLED'
                                    ? 'bg-red-600 text-white'
                                    : st === 'CONFIRMED'
                                    ? 'bg-blue-600 text-white'
                                    : st === 'IN_PROGRESS'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-amber-500 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st.replace('_', ' ')}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setBookingToDelete(b)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4B. SERVICES & SHOWCASE MANAGEMENT */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase">
                    Services, Showcase Photos &amp; Pricing
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Add/edit service categories, upload work sample photos (e.g. Graphics, Repairs, Ads), edit captions/descriptions, and set TSh prices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingService({
                      title: '',
                      description: '',
                      iconName: 'Sparkles',
                      requiresDeviceDetails: false,
                      showcaseItems: [],
                    })
                  }
                  className="bg-[#00B553] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#009b47] cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Service Category
                </button>
              </div>

              {/* Home Page "View Our Services" Banner Editor */}
              <form
                onSubmit={handleSaveServicesBanner}
                className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase text-[11.5px] flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#0B3B8C]" />
                      Home Page &ldquo;Services View More&rdquo; Banner Settings
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Customize the headline, text, button label, and optional background image of the Services banner on the Home page.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1565C0] hover:bg-[#0d47a1] text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Save Services Banner
                  </button>
                </div>

                {/* Live Mini Preview (16:9 Sharp Corners) */}
                <div className="relative overflow-hidden bg-gradient-to-r from-[#0C0826] via-[#0B3B8C] to-[#0C0826] text-white rounded-none aspect-video w-full max-w-md p-4 flex flex-col justify-end">
                  {servicesBannerForm.imageUrl && (
                    <img
                      src={servicesBannerForm.imageUrl}
                      alt="Services banner preview"
                      className="absolute inset-0 w-full h-full object-cover object-center opacity-100"
                    />
                  )}
                  <div className="relative z-10 space-y-2 max-w-[75%]">
                    {(servicesBannerForm.title || defaultServicesBanner.title) && (
                      <div className="text-sm sm:text-base font-black text-white leading-tight [text-shadow:0_2px_8px_rgba(12,8,38,0.75)]">
                        {servicesBannerForm.title || defaultServicesBanner.title}
                      </div>
                    )}
                    <div>
                      <span className="inline-flex items-center gap-1 bg-white/95 text-[#0C0826] text-[11px] font-extrabold px-3.5 py-1 rounded-full shadow-sm">
                        <span>{servicesBannerForm.ctaText || 'View Services'}</span>
                        <span>&gt;&gt;</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Banner Top Kicker</label>
                    <input
                      type="text"
                      value={servicesBannerForm.kicker}
                      onChange={(e) => updateServicesBannerField('kicker', e.target.value)}
                      placeholder="OBBY TECH · TECHNICAL & CREATIVE STUDIO"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={servicesBannerForm.ctaText}
                      onChange={(e) => updateServicesBannerField('ctaText', e.target.value)}
                      placeholder="View Our Services"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banner Headline</label>
                  <input
                    type="text"
                    value={servicesBannerForm.title}
                    onChange={(e) => updateServicesBannerField('title', e.target.value)}
                    placeholder="Professional Repairs, Graphic Design, Video & IT Solutions"
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banner Subtitle / Description</label>
                  <textarea
                    rows={2}
                    value={servicesBannerForm.subtitle}
                    onChange={(e) => updateServicesBannerField('subtitle', e.target.value)}
                    placeholder="Describe your services..."
                    className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Background Image (Upload Photo)
                    </label>
                    <input
                      type="file"
                      onChange={handleServicesBannerImageUpload}
                      className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-[11px] file:font-bold file:text-slate-800 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block font-bold text-slate-700 mb-1">
                        Or Background Image URL
                      </label>
                      <input
                        type="text"
                        value={servicesBannerForm.imageUrl || ''}
                        onChange={(e) => updateServicesBannerField('imageUrl', e.target.value)}
                        placeholder="https://... (optional)"
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                      />
                    </div>
                    {servicesBannerForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() => updateServicesBannerField('imageUrl', '')}
                        className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {editingService && (
                <form
                  onSubmit={handleSaveService}
                  className="bg-white p-4 rounded-xl border-2 border-[#0B3B8C] space-y-4 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-slate-900">
                      {editingService.id ? `Edit Service: ${editingService.title}` : 'New Service Category'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Service Category Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Graphic Design Services"
                        value={editingService.title || ''}
                        onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Category Icon</label>
                      <select
                        value={editingService.iconName || 'Sparkles'}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            iconName: e.target.value as ServiceIconName,
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                      >
                        <option value="Smartphone">Smartphone (Phone Repair)</option>
                        <option value="Laptop">Laptop (PC Repair)</option>
                        <option value="Palette">Palette (Graphic Design)</option>
                        <option value="Megaphone">Megaphone (Business Ads)</option>
                        <option value="Camera">Camera (Video &amp; Photo Shooting)</option>
                        <option value="Video">Video (Video Production)</option>
                        <option value="GraduationCap">GraduationCap (Consultation)</option>
                        <option value="Wrench">Wrench (General Repair)</option>
                        <option value="Monitor">Monitor (Displays &amp; Systems)</option>
                        <option value="Shield">Shield (CCTV &amp; Security)</option>
                        <option value="Sparkles">Sparkles (Creative / Other)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category Description *</label>
                    <textarea
                      rows={2}
                      required
                      value={editingService.description || ''}
                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg"
                    />
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={Boolean(editingService.requiresDeviceDetails)}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          requiresDeviceDetails: e.target.checked,
                        })
                      }
                    />
                    <span>Ask customer for "Your Device Details" when booking (keep unchecked for Graphics / Ads / Consultation)</span>
                  </label>

                  {/* Showcase Items (Images, Captions, Descriptions, Prices) */}
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 uppercase text-[11px]">
                          Service Photos, Captions &amp; Prices ({(editingService.showcaseItems || []).length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Customers see these images, descriptions, and prices after clicking this service category.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddShowcaseItem}
                        className="bg-[#0B3B8C] hover:bg-[#082E6E] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Photo / Package
                      </button>
                    </div>

                    {(editingService.showcaseItems || []).length === 0 ? (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-500">
                        No showcase photos added yet. Click <strong>Add Photo / Package</strong> to upload samples and set prices.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(editingService.showcaseItems || []).map((item, idx) => (
                          <div
                            key={item.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700">Item #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveShowcaseItem(item.id)}
                                className="text-red-600 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                              <div className="sm:col-span-4 space-y-1.5">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.title || 'Service sample'}
                                    className="w-full aspect-[16/10] object-cover rounded-lg border border-slate-200 bg-white"
                                  />
                                ) : (
                                  <div className="w-full aspect-[16/10] rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                                    No Image
                                  </div>
                                )}
                                <input
                                  type="file"
                                  onChange={(e) => handleShowcaseImageUpload(item.id, e)}
                                  className="w-full text-[10.5px] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-[10.5px] file:font-bold file:text-slate-800 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  placeholder="Or image URL"
                                  value={item.image || ''}
                                  onChange={(e) =>
                                    handleUpdateShowcaseItem(item.id, { image: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-[11px]"
                                />
                              </div>

                              <div className="sm:col-span-8 space-y-2">
                                <div>
                                  <label className="block font-bold text-slate-700 mb-0.5">
                                    Caption / Title *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Business Flyer & Poster Design"
                                    value={item.title}
                                    onChange={(e) =>
                                      handleUpdateShowcaseItem(item.id, { title: e.target.value })
                                    }
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">
                                      Price (TSh)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="e.g. 20000"
                                      value={item.price ?? ''}
                                      onChange={(e) =>
                                        handleUpdateShowcaseItem(item.id, {
                                          price: e.target.value ? Number(e.target.value) : undefined,
                                        })
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">
                                      Price Display Label (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. From TSh 20,000"
                                      value={item.priceLabel || ''}
                                      onChange={(e) =>
                                        handleUpdateShowcaseItem(item.id, {
                                          priceLabel: e.target.value,
                                        })
                                      }
                                      className="w-full bg-white border border-slate-200 p-2 rounded-lg"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block font-bold text-slate-700 mb-0.5">
                                    Details / Explanation
                                  </label>
                                  <textarea
                                    rows={2}
                                    placeholder="Describe what is included in this service option..."
                                    value={item.description}
                                    onChange={(e) =>
                                      handleUpdateShowcaseItem(item.id, {
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0B3B8C] hover:bg-[#082E6E] text-white py-2.5 rounded-lg font-bold cursor-pointer"
                  >
                    SAVE SERVICE CATEGORY &amp; SHOWCASE
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicesList.map((srv) => (
                  <div
                    key={srv.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between gap-3 text-xs shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-[#0B3B8C] text-white flex items-center justify-center shrink-0">
                            {renderServiceIcon(srv.iconName, 'w-5 h-5')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{srv.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {(srv.showcaseItems || []).length} photos/packages ·{' '}
                              {srv.requiresDeviceDetails ? 'Asks Device Details' : 'No Device Field'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{srv.description}</p>
                      {(srv.showcaseItems || []).length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                          {(srv.showcaseItems || []).map((item) => (
                            <div
                              key={item.id}
                              className="w-14 h-10 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0"
                              title={item.title}
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingService(srv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3B8C] hover:bg-[#082E6E] text-white rounded-lg font-bold cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Photos, Captions &amp; Prices
                      </button>
                      <button
                        type="button"
                        onClick={() => setServiceToDelete(srv)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                        title="Delete Service Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. HOME PAGE BANNER SLIDES MANAGEMENT */}
          {activeTab === 'banners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase">Home Page Promotional Banners</h2>
                  <p className="text-[11px] text-slate-500">
                    Upload new slides, edit headlines/CTAs, reorder, enable/disable, or delete home banners.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingBanner({
                      image: '',
                      kickerEn: '',
                      kickerSw: '',
                      titleEn: '',
                      titleSw: '',
                      subtitleEn: '',
                      subtitleSw: '',
                      ctaEn: 'Shop Now',
                      ctaSw: 'Nunua Sasa',
                      targetCategory: 'All',
                      enabled: true,
                    })
                  }
                  className="bg-[#00B553] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-[#009b47] cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Banner Slide
                </button>
              </div>

              {editingBanner && (
                <form
                  onSubmit={handleSaveBanner}
                  className="bg-white p-4 rounded-xl border-2 border-[#1565C0] space-y-3 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-slate-900">
                      {editingBanner.id ? 'Edit Banner Slide' : 'New Promotional Banner Slide'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingBanner(null)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block font-bold text-slate-800">Banner Image (Full Original Quality) *</label>
                      <span className="text-[10.5px] font-medium text-emerald-700">
                        Shown exactly as uploaded (no dark overlay)
                      </span>
                    </div>
                    <input
                      type="file"
                      onChange={handleBannerImageUpload}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-bold file:text-slate-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Or enter banner image URL / path"
                      value={editingBanner.image || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, image: e.target.value })}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                    {editingBanner.image && (
                      <div className="w-full max-w-md aspect-video overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={editingBanner.image}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Title / Reference (Optional)</label>
                      <input
                        type="text"
                        placeholder="Optional banner title"
                        value={editingBanner.titleEn || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, titleEn: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Headline (Kiswahili)</label>
                      <input
                        type="text"
                        value={editingBanner.titleSw || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, titleSw: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kicker Label</label>
                      <input
                        type="text"
                        value={editingBanner.kickerEn || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, kickerEn: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Category</label>
                      <select
                        value={editingBanner.targetCategory || 'All'}
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            targetCategory: e.target.value as CategoryName | 'All',
                          })
                        }
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      >
                        <option value="All">All Items</option>
                        <option value="Phones">Phones</option>
                        <option value="PC & Laptops">PC &amp; Laptops</option>
                        <option value="CCTV">CCTV</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Services">Services</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subtitle (English)</label>
                      <input
                        type="text"
                        value={editingBanner.subtitleEn || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, subtitleEn: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Button Text (English)</label>
                      <input
                        type="text"
                        value={editingBanner.ctaEn || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, ctaEn: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1565C0] hover:bg-[#0d47a1] text-white py-2.5 rounded-lg font-bold cursor-pointer"
                  >
                    SAVE BANNER SLIDE
                  </button>
                </form>
              )}

              <div className="space-y-2.5">
                {sortedBanners.map((b, idx) => (
                  <div
                    key={b.id}
                    className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={b.image}
                        alt={b.titleEn}
                        className="w-28 aspect-video object-cover bg-slate-100 shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{b.titleEn}</div>
                        <div className="text-[11px] text-slate-500 truncate">{b.subtitleEn}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                            Target: {b.targetCategory}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.enabled !== false
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {b.enabled !== false ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveBannerOrder(idx, -1)}
                        className="p-1.5 bg-slate-50 border rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedBanners.length - 1}
                        onClick={() => handleMoveBannerOrder(idx, 1)}
                        className="p-1.5 bg-slate-50 border rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.updateBanner(b.id, { enabled: b.enabled === false });
                          await loadAdminData();
                          onRefreshData();
                        }}
                        className="px-2.5 py-1.5 border rounded-lg font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        {b.enabled !== false ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBanner(b)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBannerToDelete(b)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. CATEGORY ICON MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase">Category Icon &amp; Image Management</h2>
                <p className="text-[11px] text-slate-500">
                  Update category icons (emoji, vector icon, or custom uploaded image) and thumbnails shown on Home.
                </p>
              </div>

              {editingCategory && (
                <form
                  onSubmit={handleSaveCategory}
                  className="bg-white p-4 rounded-xl border-2 border-slate-900 space-y-3 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-slate-900">Edit Category: {editingCategory.name}</h3>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">Icon Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['emoji', 'lucide', 'image'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setEditingCategory({
                              ...editingCategory,
                              iconType: mode,
                              icon:
                                mode === 'lucide' && !LUCIDE_ICON_OPTIONS.includes(editingCategory.icon)
                                  ? 'Sparkles'
                                  : editingCategory.icon,
                            })
                          }
                          className={`py-2 rounded-lg font-bold capitalize cursor-pointer border ${
                            (editingCategory.iconType || 'emoji') === mode
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {mode === 'lucide' ? 'Vector Icon' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(editingCategory.iconType || 'emoji') === 'emoji' && (
                    <div className="space-y-2">
                      <label className="block font-bold text-slate-700">Select Preset Emoji or Type Custom</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJI_PRESETS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setEditingCategory({ ...editingCategory, icon: em, iconType: 'emoji' })}
                            className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center cursor-pointer ${
                              editingCategory.icon === em
                                ? 'border-slate-900 bg-slate-100'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={editingCategory.icon}
                        onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                        className="w-full bg-slate-50 border p-2 rounded-lg"
                      />
                    </div>
                  )}

                  {editingCategory.iconType === 'lucide' && (
                    <div className="space-y-2">
                      <label className="block font-bold text-slate-700">Select Vector Icon</label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {LUCIDE_ICON_OPTIONS.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() =>
                              setEditingCategory({ ...editingCategory, icon: iconName, iconType: 'lucide' })
                            }
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${
                              editingCategory.icon === iconName
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {renderCategoryLucideIcon(
                              iconName,
                              `w-4 h-4 ${editingCategory.icon === iconName ? 'text-white' : 'text-slate-800'}`
                            )}
                            <span className="text-[9px] truncate w-full text-center">{iconName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingCategory.iconType === 'image' && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block font-bold text-slate-700">Upload Custom Icon Image</label>
                      <input
                        type="file"
                        onChange={handleCategoryIconUpload}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-bold file:text-slate-800 cursor-pointer"
                      />
                      {editingCategory.icon &&
                        (editingCategory.icon.startsWith('data:image') ||
                          editingCategory.icon.startsWith('/uploads/') ||
                          editingCategory.icon.startsWith('http')) && (
                          <img
                            src={editingCategory.icon}
                            alt="Icon preview"
                            className="w-12 h-12 object-contain rounded-lg border bg-white p-1"
                          />
                        )}
                    </div>
                  )}

                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block font-bold text-slate-700">Category Background Thumbnail</label>
                    <input
                      type="file"
                      onChange={handleCategoryThumbUpload}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-bold file:text-slate-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingCategory.imageUrl}
                      onChange={(e) => setEditingCategory({ ...editingCategory, imageUrl: e.target.value })}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editingCategory.description}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      className="w-full bg-slate-50 border p-2 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#00B553] hover:bg-[#009b47] text-white py-2.5 rounded-lg font-bold cursor-pointer"
                  >
                    SAVE CATEGORY
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 border border-slate-200">
                        <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center text-lg">
                          {cat.iconType === 'image' ? (
                            <img src={cat.icon} alt="" className="w-6 h-6 object-contain bg-white rounded" />
                          ) : cat.iconType === 'lucide' ? (
                            renderCategoryLucideIcon(cat.icon, 'w-5 h-5 text-white')
                          ) : (
                            <span>{cat.icon}</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900">{cat.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{cat.description}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingCategory(cat)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer shrink-0"
                    >
                      Edit Icon
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. AI ASSISTANT INSTRUCTIONS */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase">Obby Ai Custom Instructions</h2>
                <p className="text-[11px] text-slate-500">
                  Add business rules, service promotions, warranty policies, or FAQs that Obby Ai follows automatically.
                </p>
              </div>

              <form
                onSubmit={handleAddAiInstruction}
                className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 text-xs"
              >
                <div className="font-bold text-slate-900">+ Add New AI Instruction</div>
                <input
                  type="text"
                  required
                  placeholder="Instruction Title (e.g. Repair Turnaround & Warranty)"
                  value={newAiTitle}
                  onChange={(e) => setNewAiTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Write exact instructions Obby Ai should follow when replying to customers..."
                  value={newAiText}
                  onChange={(e) => setNewAiText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                />
                <button
                  type="submit"
                  className="bg-[#1565C0] hover:bg-[#0d47a1] text-white px-4 py-2 rounded-lg font-bold cursor-pointer"
                >
                  Add Instruction
                </button>
              </form>

              {editingAiItem && (
                <form
                  onSubmit={handleSaveAiInstructionEdit}
                  className="bg-white p-4 rounded-xl border-2 border-[#1565C0] space-y-3 text-xs shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Edit AI Instruction</span>
                    <button
                      type="button"
                      onClick={() => setEditingAiItem(null)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingAiItem.title}
                    onChange={(e) => setEditingAiItem({ ...editingAiItem, title: e.target.value })}
                    className="w-full bg-slate-50 border p-2 rounded-lg"
                  />
                  <textarea
                    rows={3}
                    required
                    value={editingAiItem.instruction}
                    onChange={(e) => setEditingAiItem({ ...editingAiItem, instruction: e.target.value })}
                    className="w-full bg-slate-50 border p-2 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="bg-[#00B553] text-white px-4 py-2 rounded-lg font-bold cursor-pointer"
                  >
                    Save Changes
                  </button>
                </form>
              )}

              <div className="space-y-2.5">
                {aiInstructions.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.enabled ? 'Active in AI Prompt' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAiInstruction(item)}
                          className="px-2.5 py-1 border rounded-lg font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          {item.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAiItem(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAiInstruction(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
                      {item.instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. PAYMENT METHODS MANAGEMENT */}
          {activeTab === 'payments' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 uppercase">Payment Methods Management</h2>
                  <p className="text-[11px] text-slate-500">Edit, enable, disable, or add payment numbers visible to customers.</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* 1. Vodacom M-Pesa */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">Vodacom M-Pesa</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settingsForm.paymentSettings.mpesa.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {settingsForm.paymentSettings.mpesa.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPaymentKey === 'mpesa') {
                            setEditingPaymentKey(null);
                            persistSettings(settingsForm, 'Vodacom M-Pesa number saved!');
                          } else {
                            setEditingPaymentKey('mpesa');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {editingPaymentKey === 'mpesa' ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextSettings: AdminSettings = {
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              mpesa: {
                                ...settingsForm.paymentSettings.mpesa,
                                enabled: !settingsForm.paymentSettings.mpesa.enabled,
                              },
                            },
                          };
                          setSettingsForm(nextSettings);
                          persistSettings(nextSettings, 'M-Pesa status updated!');
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {settingsForm.paymentSettings.mpesa.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Number: <strong className="text-slate-900">{settingsForm.paymentSettings.mpesa.number || 'Not set'}</strong> · Name:{' '}
                    <strong className="text-slate-900">{settingsForm.paymentSettings.mpesa.accountName || 'OBBY TECH'}</strong>
                  </div>
                  {editingPaymentKey === 'mpesa' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="M-Pesa Number"
                        value={settingsForm.paymentSettings.mpesa.number || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              mpesa: { ...settingsForm.paymentSettings.mpesa, number: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={settingsForm.paymentSettings.mpesa.accountName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              mpesa: { ...settingsForm.paymentSettings.mpesa, accountName: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Mixx by Yas */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">Mixx by Yas</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settingsForm.paymentSettings.tigoPesa.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {settingsForm.paymentSettings.tigoPesa.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPaymentKey === 'tigoPesa') {
                            setEditingPaymentKey(null);
                            persistSettings(settingsForm, 'Mixx by Yas number saved!');
                          } else {
                            setEditingPaymentKey('tigoPesa');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {editingPaymentKey === 'tigoPesa' ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextSettings: AdminSettings = {
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              tigoPesa: {
                                ...settingsForm.paymentSettings.tigoPesa,
                                enabled: !settingsForm.paymentSettings.tigoPesa.enabled,
                              },
                            },
                          };
                          setSettingsForm(nextSettings);
                          persistSettings(nextSettings, 'Mixx by Yas status updated!');
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {settingsForm.paymentSettings.tigoPesa.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Number: <strong className="text-slate-900">{settingsForm.paymentSettings.tigoPesa.number || 'Not set'}</strong> · Name:{' '}
                    <strong className="text-slate-900">{settingsForm.paymentSettings.tigoPesa.accountName || 'OBBY TECH'}</strong>
                  </div>
                  {editingPaymentKey === 'tigoPesa' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="Mixx by Yas Number"
                        value={settingsForm.paymentSettings.tigoPesa.number || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              tigoPesa: { ...settingsForm.paymentSettings.tigoPesa, number: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={settingsForm.paymentSettings.tigoPesa.accountName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              tigoPesa: { ...settingsForm.paymentSettings.tigoPesa, accountName: e.target.value },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Airtel Money */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">Airtel Money</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settingsForm.paymentSettings.airtelMoney?.enabled ?? true
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {settingsForm.paymentSettings.airtelMoney?.enabled ?? true ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPaymentKey === 'airtelMoney') {
                            setEditingPaymentKey(null);
                            persistSettings(settingsForm, 'Airtel Money number saved!');
                          } else {
                            setEditingPaymentKey('airtelMoney');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {editingPaymentKey === 'airtelMoney' ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextSettings: AdminSettings = {
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              airtelMoney: {
                                ...settingsForm.paymentSettings.airtelMoney,
                                enabled: !(settingsForm.paymentSettings.airtelMoney?.enabled ?? true),
                              },
                            },
                          };
                          setSettingsForm(nextSettings);
                          persistSettings(nextSettings, 'Airtel Money status updated!');
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {settingsForm.paymentSettings.airtelMoney?.enabled ?? true ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Number: <strong className="text-slate-900">{settingsForm.paymentSettings.airtelMoney?.number || 'Not set'}</strong> · Name:{' '}
                    <strong className="text-slate-900">{settingsForm.paymentSettings.airtelMoney?.accountName || 'OBBY TECH'}</strong>
                  </div>
                  {editingPaymentKey === 'airtelMoney' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="Airtel Money Number"
                        value={settingsForm.paymentSettings.airtelMoney?.number || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              airtelMoney: {
                                ...settingsForm.paymentSettings.airtelMoney,
                                number: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={settingsForm.paymentSettings.airtelMoney?.accountName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              airtelMoney: {
                                ...settingsForm.paymentSettings.airtelMoney,
                                accountName: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 4. HaloPesa */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">HaloPesa</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settingsForm.paymentSettings.haloPesa?.enabled ?? true
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {settingsForm.paymentSettings.haloPesa?.enabled ?? true ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPaymentKey === 'haloPesa') {
                            setEditingPaymentKey(null);
                            persistSettings(settingsForm, 'HaloPesa number saved!');
                          } else {
                            setEditingPaymentKey('haloPesa');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {editingPaymentKey === 'haloPesa' ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextSettings: AdminSettings = {
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              haloPesa: {
                                ...settingsForm.paymentSettings.haloPesa,
                                enabled: !(settingsForm.paymentSettings.haloPesa?.enabled ?? true),
                              },
                            },
                          };
                          setSettingsForm(nextSettings);
                          persistSettings(nextSettings, 'HaloPesa status updated!');
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {settingsForm.paymentSettings.haloPesa?.enabled ?? true ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Number: <strong className="text-slate-900">{settingsForm.paymentSettings.haloPesa?.number || 'Not set'}</strong> · Name:{' '}
                    <strong className="text-slate-900">{settingsForm.paymentSettings.haloPesa?.accountName || 'OBBY TECH'}</strong>
                  </div>
                  {editingPaymentKey === 'haloPesa' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="HaloPesa Number"
                        value={settingsForm.paymentSettings.haloPesa?.number || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              haloPesa: {
                                ...settingsForm.paymentSettings.haloPesa,
                                number: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={settingsForm.paymentSettings.haloPesa?.accountName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              haloPesa: {
                                ...settingsForm.paymentSettings.haloPesa,
                                accountName: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* 5. Bank Transfer */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-xs">Bank Transfer</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settingsForm.paymentSettings.bank?.enabled ?? true
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {settingsForm.paymentSettings.bank?.enabled ?? true ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPaymentKey === 'bank') {
                            setEditingPaymentKey(null);
                            persistSettings(settingsForm, 'Bank account saved!');
                          } else {
                            setEditingPaymentKey('bank');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {editingPaymentKey === 'bank' ? 'Done' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextSettings: AdminSettings = {
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              bank: {
                                ...settingsForm.paymentSettings.bank,
                                enabled: !(settingsForm.paymentSettings.bank?.enabled ?? true),
                              },
                            },
                          };
                          setSettingsForm(nextSettings);
                          persistSettings(nextSettings, 'Bank status updated!');
                        }}
                        className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {settingsForm.paymentSettings.bank?.enabled ?? true ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Bank: <strong className="text-slate-900">{settingsForm.paymentSettings.bank?.bankName || 'CRDB'}</strong> · Acc No:{' '}
                    <strong className="text-slate-900">{settingsForm.paymentSettings.bank?.accountNumber || 'Not set'}</strong>
                  </div>
                  {editingPaymentKey === 'bank' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="Bank Name"
                        value={settingsForm.paymentSettings.bank?.bankName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              bank: { ...settingsForm.paymentSettings.bank, bankName: e.target.value, enabled: true },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={settingsForm.paymentSettings.bank?.accountNumber || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              bank: {
                                ...settingsForm.paymentSettings.bank,
                                accountNumber: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Account Name"
                        value={settingsForm.paymentSettings.bank?.accountName || ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings,
                              bank: {
                                ...settingsForm.paymentSettings.bank,
                                accountName: e.target.value,
                                enabled: true,
                              },
                            },
                          })
                        }
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Custom Payment Methods */}
                {settingsForm.paymentSettings.customMethods?.map((m) => (
                  <div key={m.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs">
                        {m.name} ({m.provider})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomPaymentMethod(m.id!)}
                          className="px-2.5 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Number: <strong className="text-slate-900">{m.number}</strong> · Name:{' '}
                      <strong className="text-slate-900">{m.accountName}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {showAddPaymentForm && (
                <form
                  onSubmit={(e) => {
                    handleAddCustomPaymentMethod(e);
                    setShowAddPaymentForm(false);
                  }}
                  className="bg-slate-100 p-4 rounded-xl space-y-3 border border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs uppercase">+ Add New Payment Method</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPaymentForm(false)}
                      className="text-slate-500 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Method Name (e.g. NBC Bank)"
                      required
                      value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Provider"
                      value={newMethodProvider}
                      onChange={(e) => setNewMethodProvider(e.target.value)}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Phone / Account Number"
                      required
                      value={newMethodNumber}
                      onChange={(e) => setNewMethodNumber(e.target.value)}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Account Name"
                      value={newMethodAccountName}
                      onChange={(e) => setNewMethodAccountName(e.target.value)}
                      className="w-full bg-white border p-2 rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Add Method to List
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveAndAddPayment}
                  className="bg-[#00B553] text-white px-6 py-2.5 rounded-xl font-extrabold shadow-sm hover:bg-emerald-600 transition-colors cursor-pointer"
                >
                  SAVE &amp; ADD
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Save Payment Settings
                </button>
              </div>
            </div>
          )}

          {/* 9. CONTACTS & STORE SETTINGS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase">Store Contact &amp; WhatsApp Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Phone</label>
                    <input
                      type="text"
                      value={settingsForm.contactSettings.phone}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          contactSettings: { ...settingsForm.contactSettings, phone: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Booking WhatsApp Number</label>
                    <input
                      type="text"
                      value={settingsForm.contactSettings.whatsapp}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          contactSettings: { ...settingsForm.contactSettings, whatsapp: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={settingsForm.contactSettings.email}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          contactSettings: { ...settingsForm.contactSettings, email: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Outside Dodoma Delivery Fee (TSh)</label>
                    <input
                      type="number"
                      value={settingsForm.deliverySettings.outsideDarFee}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          deliverySettings: {
                            ...settingsForm.deliverySettings,
                            outsideDarFee: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full bg-slate-50 border p-2 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">About OBBY TECH Description</label>
                  <textarea
                    rows={2}
                    value={settingsForm.contactSettings.aboutText}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        contactSettings: { ...settingsForm.contactSettings, aboutText: e.target.value },
                      })
                    }
                    className="w-full bg-slate-50 border p-2 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="bg-[#00B553] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#009b47] cursor-pointer"
                >
                  Save Contact &amp; Delivery Settings
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900 uppercase">Customer Contacts</h2>
                    <p className="text-[11px] text-slate-500">Collected from orders &amp; service bookings.</p>
                  </div>
                  <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                    {customerContacts.length} Contacts
                  </div>
                </div>

                {customerContacts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic">No customer contacts recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 font-extrabold text-slate-900 uppercase">Name</th>
                          <th className="py-2 px-3 font-extrabold text-slate-900 uppercase">Contact</th>
                          <th className="py-2 px-3 font-extrabold text-slate-900 uppercase">Region / Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerContacts.map((c, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">{c.name}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 font-mono">{c.phone}</td>
                            <td className="py-2 px-3 text-slate-600">{c.region}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. BRANDING */}
          {activeTab === 'branding' && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase">Website Branding</h2>
              <div>
                <label className="block font-bold mb-1">Website Name</label>
                <input
                  type="text"
                  value={brandingName}
                  onChange={(e) => setBrandingName(e.target.value)}
                  className="w-full bg-slate-50 border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Upload Website Logo</label>
                <input
                  type="file"
                  onChange={handleLogoUpload}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-bold file:text-slate-800 cursor-pointer"
                />
                {newLogo && <img src={newLogo} alt="Logo preview" className="h-12 mt-2 object-contain" />}
              </div>
              <button
                type="button"
                onClick={handleSaveBranding}
                className="bg-[#00B553] text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                SAVE BRANDING
              </button>
            </div>
          )}

          {/* 11. CHANGE ADMIN PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase">Change Admin Password</h2>
              {passMsg && (
                <div
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-2 ${
                    passMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{passMsg.text}</span>
                </div>
              )}
              <div>
                <label className="block font-bold mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  className="w-full bg-gray-50 border p-2 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">New Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-gray-50 border p-2 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full bg-gray-50 border p-2 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-[#00B553] text-white px-5 py-2.5 rounded-xl font-extrabold shadow-sm hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                UPDATE PASSWORD
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Delete Order Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">Delete Order #{orderToDelete.id}?</h3>
            <p className="text-xs text-slate-600">
              Customer: <strong>{orderToDelete.customerName}</strong> · TSh {orderToDelete.total.toLocaleString()}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                {isDeletingOrder ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">Delete Product?</h3>
            <p className="text-xs text-slate-600">Remove <strong>{productToDelete.name}</strong> from catalog?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Confirmation Dialog */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">Delete Booking #{bookingToDelete.id}?</h3>
            <p className="text-xs text-slate-600">
              {bookingToDelete.serviceName} for <strong>{bookingToDelete.customerName}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBooking}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Banner Confirmation Dialog */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">Delete Banner Slide?</h3>
            <p className="text-xs text-slate-600">{bannerToDelete.titleEn}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBanner}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Service Category Confirmation Dialog */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">Delete Service Category?</h3>
            <p className="text-xs text-slate-600">
              Remove <strong>{serviceToDelete.title}</strong> and its showcase photos?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteService}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
