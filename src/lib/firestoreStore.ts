import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AIInstruction,
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
} from '../types';

export const OFFICIAL_ADMIN_EMAIL = 'obbyitmasters@gmail.com';

const clampStr = (val: unknown, maxLen: number, fallback = ''): string => {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

export const sanitizeDocId = (raw: unknown, prefix = 'doc'): string => {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 120);
  return cleaned || `${prefix}_${Date.now()}`;
};

const toIso = (val: unknown, fallback = new Date().toISOString()): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof (val as any)?.toDate === 'function') {
    try {
      return (val as any).toDate().toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const isFirebaseUserVerified = (): boolean => {
  const u = auth.currentUser;
  return Boolean(u && u.emailVerified);
};

export const isFirebaseAdminVerified = (): boolean => {
  const u = auth.currentUser;
  return Boolean(
    u &&
      u.emailVerified &&
      u.email &&
      u.email.trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL
  );
};

// --- PUBLIC STOREFRONT READS ---

export async function fetchStorefrontFromFirestore(): Promise<{
  settings: AdminSettings | null;
  products: Product[];
  categories: CategoryItem[];
  services: ServiceItem[];
  banners: PromoBanner[];
}> {
  const [settingsSnap, prodSnap, catSnap, srvSnap, bannerSnap] = await Promise.all([
    getDoc(doc(db, 'settings', 'store')).catch((err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/store');
    }),
    getDocs(collection(db, 'products')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
    }),
    getDocs(collection(db, 'categories')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'categories');
    }),
    getDocs(collection(db, 'services')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'services');
    }),
    getDocs(collection(db, 'banners')).catch((err) => {
      handleFirestoreError(err, OperationType.LIST, 'banners');
    }),
  ]);

  let settings: AdminSettings | null = null;
  if (settingsSnap && settingsSnap.exists()) {
    const d = settingsSnap.data();
    settings = {
      websiteLogo: d.websiteLogo || '',
      websiteName: d.websiteName || 'OBBY TECH',
      paymentSettings: d.paymentSettings,
      contactSettings: d.contactSettings,
      deliverySettings: d.deliverySettings,
      servicesBanner: d.servicesBanner,
    };
  }

  const products: Product[] = prodSnap
    ? prodSnap.docs.map((snap) => {
        const d = snap.data();
        return {
          id: d.id || snap.id,
          name: d.name || '',
          category: d.category || 'Phones',
          price: Number(d.price || 0),
          description: d.description || '',
          specifications: Array.isArray(d.specifications) ? d.specifications : [],
          stock: Number(d.stock || 0),
          availability: d.availability || (Number(d.stock || 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
          condition: d.condition || 'Brand New',
          images: Array.isArray(d.images) ? d.images : [d.primaryImage || ''],
          primaryImage: d.primaryImage || (Array.isArray(d.images) ? d.images[0] : '') || '',
          location: d.location || 'Dodoma, Dodoma Mjini',
          createdAt: toIso(d.createdAt),
          updatedAt: toIso(d.updatedAt),
        };
      })
    : [];

  const categories: CategoryItem[] = catSnap
    ? catSnap.docs.map((snap) => {
        const d = snap.data();
        return {
          id: d.id || snap.id,
          name: d.name,
          icon: d.icon || '📱',
          iconType: d.iconType || 'emoji',
          description: d.description || '',
          imageUrl: d.imageUrl || '',
        };
      })
    : [];

  const services: ServiceItem[] = srvSnap
    ? srvSnap.docs.map((snap) => {
        const d = snap.data();
        return {
          id: d.id || snap.id,
          slug: d.slug || snap.id,
          title: d.title || '',
          description: d.description || '',
          iconName: d.iconName || 'Wrench',
          requiresDeviceDetails: Boolean(d.requiresDeviceDetails),
          coverImage: d.coverImage || '',
          showcaseItems: Array.isArray(d.showcaseItems) ? d.showcaseItems : [],
        };
      })
    : [];

  const banners: PromoBanner[] = bannerSnap
    ? bannerSnap.docs
        .map((snap) => {
          const d = snap.data();
          return {
            id: d.id || snap.id,
            image: d.image || '',
            kickerEn: d.kickerEn || '',
            kickerSw: d.kickerSw || '',
            titleEn: d.titleEn || '',
            titleSw: d.titleSw || '',
            subtitleEn: d.subtitleEn || '',
            subtitleSw: d.subtitleSw || '',
            ctaEn: d.ctaEn || 'Shop Now',
            ctaSw: d.ctaSw || 'Nunua Sasa',
            targetCategory: d.targetCategory || 'All',
            enabled: d.enabled !== false,
            order: Number(d.order ?? 1),
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt),
          };
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  return { settings, products, categories, services, banners };
}

// --- ADMIN REGISTRY & STOREFRONT WRITES ---

export async function ensureAdminRegistryInFirestore(): Promise<void> {
  if (!isFirebaseAdminVerified() || !auth.currentUser) return;
  const uid = sanitizeDocId(auth.currentUser.uid, 'admin');
  const path = `admins/${uid}`;
  const docRef = doc(db, 'admins', uid);
  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        uid,
        email: OFFICIAL_ADMIN_EMAIL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveSettingsToFirestore(settings: AdminSettings): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const path = 'settings/store';
  const docRef = doc(db, 'settings', 'store');
  const cleanPayload = {
    websiteLogo: clampStr(settings.websiteLogo, 350000),
    websiteName: clampStr(settings.websiteName || 'OBBY TECH', 120, 'OBBY TECH'),
    paymentSettings: settings.paymentSettings || {},
    contactSettings: settings.contactSettings || {},
    deliverySettings: settings.deliverySettings || {},
    ...(settings.servicesBanner ? { servicesBanner: settings.servicesBanner } : {}),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertProductInFirestore(product: Product): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(product.id, 'prod');
  const path = `products/${id}`;
  const docRef = doc(db, 'products', id);
  const imagesList = (Array.isArray(product.images) ? product.images : [product.primaryImage])
    .filter((img) => typeof img === 'string' && img.trim().length > 0)
    .slice(0, 6)
    .map((img) => clampStr(img, 350000));
  const safeImages =
    imagesList.length > 0
      ? imagesList
      : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'];
  const validCat = ['Phones', 'PC & Laptops', 'CCTV', 'Accessories', 'Services'].includes(
    product.category
  )
    ? product.category
    : 'Phones';
  const validCond = ['Brand New', 'Refurbished', 'Used'].includes(product.condition)
    ? product.condition
    : 'Brand New';
  const stockNum = Math.max(0, Math.min(1_000_000, Number(product.stock || 0)));

  const fields = {
    name: clampStr(product.name, 200, 'Product'),
    category: validCat,
    price: Math.max(0, Math.min(1_000_000_000, Number(product.price || 0))),
    description: clampStr(product.description, 4000),
    specifications: (Array.isArray(product.specifications) ? product.specifications : [])
      .slice(0, 25)
      .map((s) => clampStr(s, 300))
      .filter(Boolean),
    stock: stockNum,
    availability:
      product.availability === 'OUT_OF_STOCK' || stockNum <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
    condition: validCond,
    images: safeImages,
    primaryImage: clampStr(product.primaryImage || safeImages[0], 350000, safeImages[0]),
    location: clampStr(product.location || 'Dodoma, Dodoma Mjini', 160),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductInFirestore(productId: string): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(productId, 'prod');
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
  }
}

export async function upsertCategoryInFirestore(category: CategoryItem): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(category.id, 'cat');
  const path = `categories/${id}`;
  const docRef = doc(db, 'categories', id);
  const validName = ['Phones', 'PC & Laptops', 'CCTV', 'Accessories', 'Services'].includes(
    category.name
  )
    ? category.name
    : 'Phones';
  const validIconType = ['emoji', 'lucide', 'image'].includes(category.iconType || '')
    ? category.iconType!
    : 'emoji';

  const editableFields = {
    icon: clampStr(category.icon || '📱', 350000, '📱'),
    iconType: validIconType,
    description: clampStr(category.description, 600),
    imageUrl: clampStr(category.imageUrl, 350000),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...editableFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        name: validName,
        ...editableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function upsertServiceInFirestore(service: ServiceItem): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(service.id, 'srv');
  const path = `services/${id}`;
  const docRef = doc(db, 'services', id);
  const fields = {
    slug: clampStr(service.slug || id, 128, id),
    title: clampStr(service.title, 160, 'Service'),
    description: clampStr(service.description, 2000),
    iconName: clampStr(service.iconName || 'Wrench', 60, 'Wrench'),
    requiresDeviceDetails: Boolean(service.requiresDeviceDetails),
    coverImage: clampStr(service.coverImage, 350000),
    showcaseItems: (Array.isArray(service.showcaseItems) ? service.showcaseItems : []).slice(0, 15),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteServiceInFirestore(serviceId: string): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(serviceId, 'srv');
  try {
    await deleteDoc(doc(db, 'services', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `services/${id}`);
  }
}

export async function upsertBannerInFirestore(banner: PromoBanner): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(banner.id, 'bnr');
  const path = `banners/${id}`;
  const docRef = doc(db, 'banners', id);
  const validTarget = ['All', 'Phones', 'PC & Laptops', 'CCTV', 'Accessories', 'Services'].includes(
    banner.targetCategory
  )
    ? banner.targetCategory
    : 'All';

  const fields = {
    image: clampStr(banner.image, 450000),
    kickerEn: clampStr(banner.kickerEn, 120),
    kickerSw: clampStr(banner.kickerSw, 120),
    titleEn: clampStr(banner.titleEn, 160),
    titleSw: clampStr(banner.titleSw, 160),
    subtitleEn: clampStr(banner.subtitleEn, 400),
    subtitleSw: clampStr(banner.subtitleSw, 400),
    ctaEn: clampStr(banner.ctaEn, 80),
    ctaSw: clampStr(banner.ctaSw, 80),
    targetCategory: validTarget,
    enabled: banner.enabled !== false,
    order: Math.max(0, Math.min(1000, Number(banner.order ?? 1))),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteBannerInFirestore(bannerId: string): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(bannerId, 'bnr');
  try {
    await deleteDoc(doc(db, 'banners', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `banners/${id}`);
  }
}

export async function fetchAiInstructionsFromFirestore(): Promise<AIInstruction[]> {
  if (!isFirebaseAdminVerified()) return [];
  try {
    const snap = await getDocs(collection(db, 'ai_instructions'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        title: data.title || '',
        instruction: data.instruction || '',
        enabled: data.enabled !== false,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'ai_instructions');
  }
}

export async function upsertAiInstructionInFirestore(item: AIInstruction): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(item.id, 'ai');
  const path = `ai_instructions/${id}`;
  const docRef = doc(db, 'ai_instructions', id);
  const fields = {
    title: clampStr(item.title, 160, 'Rule'),
    instruction: clampStr(item.instruction, 4000, 'Follow OBBY TECH store rules.'),
    enabled: item.enabled !== false,
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAiInstructionInFirestore(instructionId: string): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  const id = sanitizeDocId(instructionId, 'ai');
  try {
    await deleteDoc(doc(db, 'ai_instructions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `ai_instructions/${id}`);
  }
}

// --- FULL STOREFRONT CLOUD SYNC / MIGRATION ---

export async function syncFullStorefrontToFirestore(snapshot: {
  settings?: AdminSettings;
  products?: Product[];
  categories?: CategoryItem[];
  services?: ServiceItem[];
  banners?: PromoBanner[];
  aiInstructions?: AIInstruction[];
}): Promise<void> {
  if (!isFirebaseAdminVerified()) return;
  await ensureAdminRegistryInFirestore();

  if (snapshot.settings) {
    await saveSettingsToFirestore(snapshot.settings);
  }
  if (Array.isArray(snapshot.categories)) {
    for (const c of snapshot.categories) {
      await upsertCategoryInFirestore(c);
    }
  }
  if (Array.isArray(snapshot.services)) {
    for (const s of snapshot.services) {
      await upsertServiceInFirestore(s);
    }
  }
  if (Array.isArray(snapshot.banners)) {
    for (const b of snapshot.banners) {
      await upsertBannerInFirestore(b);
    }
  }
  if (Array.isArray(snapshot.products)) {
    for (const p of snapshot.products) {
      await upsertProductInFirestore(p);
    }
  }
  if (Array.isArray(snapshot.aiInstructions)) {
    for (const inst of snapshot.aiInstructions) {
      await upsertAiInstructionInFirestore(inst);
    }
  }
}

// --- USER-PRIVATE DATA (PROFILES, CARTS, ORDERS, BOOKINGS, NOTIFICATIONS) ---

export async function upsertUserProfileInFirestore(profile: CustomerProfile): Promise<void> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return;
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  const path = `users/${uid}`;
  const docRef = doc(db, 'users', uid);
  const editable = {
    fullName: clampStr(profile.fullName || auth.currentUser.displayName || 'Customer', 160, 'Customer'),
    photo: clampStr(profile.photo, 350000),
    phone: clampStr(profile.phone, 40),
    region: clampStr(profile.region || 'Dodoma', 100),
    street: clampStr(profile.street, 200),
    address: clampStr(profile.address, 300),
  };

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...editable,
        updatedAt: serverTimestamp(),
      });
    } else {
      const email = clampStr(
        profile.email || auth.currentUser.email || '',
        200,
        'customer@obbytech.co.tz'
      ).toLowerCase();
      await setDoc(docRef, {
        id: uid,
        email,
        role: isFirebaseAdminVerified() ? 'admin' : 'customer',
        authProvider:
          profile.authProvider && ['google', 'facebook', 'email'].includes(profile.authProvider)
            ? profile.authProvider
            : 'google',
        ...editable,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchCartFromFirestore(): Promise<OrderItem[] | null> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return null;
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  try {
    const snap = await getDoc(doc(db, 'carts', uid));
    if (!snap.exists()) return [];
    const d = snap.data();
    return Array.isArray(d.items) ? d.items : [];
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `carts/${uid}`);
  }
}

export async function saveCartToFirestore(items: OrderItem[]): Promise<void> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return;
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  const path = `carts/${uid}`;
  const docRef = doc(db, 'carts', uid);
  const safeItems = (Array.isArray(items) ? items : []).slice(0, 50);

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      await updateDoc(docRef, {
        items: safeItems,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        userId: uid,
        items: safeItems,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchOrdersFromFirestore(adminView: boolean): Promise<Order[]> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return [];
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  try {
    const q =
      adminView && isFirebaseAdminVerified()
        ? collection(db, 'orders')
        : query(collection(db, 'orders'), where('customerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        phone: data.phone,
        region: data.region,
        street: data.street || '',
        items: Array.isArray(data.items) ? data.items : [],
        subtotal: Number(data.subtotal || 0),
        deliveryFee: Number(data.deliveryFee || 0),
        total: Number(data.total || 0),
        paymentMethod: data.paymentMethod || 'M-Pesa',
        paymentNumber: data.paymentNumber || '',
        paymentStatus: data.paymentStatus || 'PENDING',
        deliveryStatus: data.deliveryStatus || 'PENDING',
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}

export async function upsertOrderInFirestore(order: Order): Promise<void> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return;
  const id = sanitizeDocId(order.id, 'APX');
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  const docRef = doc(db, 'orders', id);

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      if (isFirebaseAdminVerified()) {
        await updateDoc(docRef, {
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
          paymentMethod: clampStr(order.paymentMethod, 100, 'M-Pesa'),
          paymentNumber: clampStr(order.paymentNumber, 80),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(docRef, {
          paymentMethod: clampStr(order.paymentMethod, 100, 'M-Pesa'),
          paymentNumber: clampStr(order.paymentNumber, 80),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await setDoc(docRef, {
        id,
        customerId: uid,
        customerEmail: clampStr(order.customerEmail || auth.currentUser.email || '', 200),
        customerName: clampStr(order.customerName, 160, 'Customer'),
        phone: clampStr(order.phone, 40, '0000'),
        region: clampStr(order.region, 100, 'Dodoma'),
        street: clampStr(order.street, 250),
        items: (Array.isArray(order.items) ? order.items : []).slice(0, 50),
        subtotal: Math.max(0, Number(order.subtotal || 0)),
        deliveryFee: Math.max(0, Number(order.deliveryFee || 0)),
        total: Math.max(0, Number(order.total || 0)),
        paymentMethod: clampStr(order.paymentMethod, 100, 'M-Pesa'),
        paymentNumber: clampStr(order.paymentNumber, 80),
        paymentStatus: 'PENDING',
        deliveryStatus: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${id}`);
  }
}

export async function deleteOrderInFirestore(orderId: string): Promise<void> {
  if (!isFirebaseUserVerified()) return;
  const id = sanitizeDocId(orderId, 'APX');
  try {
    await deleteDoc(doc(db, 'orders', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
  }
}

export async function fetchBookingsFromFirestore(adminView: boolean): Promise<ServiceBooking[]> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return [];
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  try {
    const q =
      adminView && isFirebaseAdminVerified()
        ? collection(db, 'bookings')
        : query(collection(db, 'bookings'), where('customerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        customerId: data.customerId,
        customerEmail: data.customerEmail || '',
        customerName: data.customerName || '',
        phone: data.phone || '',
        serviceId: data.serviceId || '',
        serviceName: data.serviceName || '',
        bookingDate: data.bookingDate || '',
        bookingTime: data.bookingTime || '',
        deviceDetails: data.deviceDetails || '',
        problemDescription: data.problemDescription || '',
        status: data.status || 'PENDING',
        adminNotes: data.adminNotes || '',
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'bookings');
  }
}

export async function upsertBookingInFirestore(booking: ServiceBooking): Promise<void> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return;
  const id = sanitizeDocId(booking.id, 'BK');
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  const docRef = doc(db, 'bookings', id);

  try {
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      if (isFirebaseAdminVerified()) {
        await updateDoc(docRef, {
          status: booking.status,
          adminNotes: clampStr(booking.adminNotes, 1000),
          bookingDate: clampStr(booking.bookingDate, 30),
          bookingTime: clampStr(booking.bookingTime, 30),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await setDoc(docRef, {
        id,
        customerId: uid,
        customerEmail: clampStr(booking.customerEmail || auth.currentUser.email || '', 200),
        customerName: clampStr(booking.customerName, 160, 'Customer'),
        phone: clampStr(booking.phone, 40, '0000'),
        serviceId: sanitizeDocId(booking.serviceId, 'srv'),
        serviceName: clampStr(booking.serviceName, 160, 'Service'),
        bookingDate: clampStr(booking.bookingDate, 30, '2026-01-01'),
        bookingTime: clampStr(booking.bookingTime, 30, '09:00'),
        deviceDetails: clampStr(booking.deviceDetails, 400),
        problemDescription: clampStr(booking.problemDescription, 2000, 'Service request'),
        status: 'PENDING',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bookings/${id}`);
  }
}

export async function deleteBookingInFirestore(bookingId: string): Promise<void> {
  if (!isFirebaseUserVerified()) return;
  const id = sanitizeDocId(bookingId, 'BK');
  try {
    await deleteDoc(doc(db, 'bookings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `bookings/${id}`);
  }
}

export async function fetchNotificationsFromFirestore(
  adminView: boolean
): Promise<CustomerNotification[]> {
  if (!isFirebaseUserVerified() || !auth.currentUser) return [];
  const uid = sanitizeDocId(auth.currentUser.uid, 'usr');
  try {
    const q =
      adminView && isFirebaseAdminVerified()
        ? collection(db, 'notifications')
        : query(collection(db, 'notifications'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        userId: data.userId,
        userEmail: data.userEmail,
        title: data.title,
        message: data.message,
        type: data.type,
        read: Boolean(data.read),
        orderId: data.orderId,
        bookingId: data.bookingId,
        createdAt: toIso(data.createdAt),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'notifications');
  }
}

export async function markNotificationReadInFirestore(notifId: string): Promise<void> {
  if (!isFirebaseUserVerified()) return;
  const id = sanitizeDocId(notifId, 'ntf');
  try {
    const refDoc = doc(db, 'notifications', id);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      await updateDoc(refDoc, {
        read: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}

export async function deleteNotificationInFirestore(notifId: string): Promise<void> {
  if (!isFirebaseUserVerified()) return;
  const id = sanitizeDocId(notifId, 'ntf');
  try {
    const refDoc = doc(db, 'notifications', id);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      await deleteDoc(refDoc);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
  }
}
