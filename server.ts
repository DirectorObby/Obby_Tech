import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_ADMIN_SETTINGS,
  INITIAL_AI_INSTRUCTIONS,
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
} from './src/data/initialData';
import {
  AIInstruction,
  AdminSettings,
  BookingStatus,
  CategoryItem,
  CustomerNotification,
  Order,
  OrderItem,
  Product,
  PromoBanner,
  ServiceBooking,
  ServiceItem,
} from './src/types';
import firebaseConfig from './firebase-applet-config.json';

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'db.json');
const OFFICIAL_ADMIN_EMAIL = 'obbyitmasters@gmail.com';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REMEMBERED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface UserAccount {
  id: string;
  googleUid?: string;
  fullName: string;
  email: string;
  role: 'admin' | 'customer';
  mustChangePassword?: boolean;
  photo?: string;
  phone?: string;
  region?: string;
  street?: string;
  address?: string;
  authProvider: 'google' | 'facebook' | 'email';
  passwordHash?: string;
  cart?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  token: string;
  userId: string;
  email: string;
  role: 'admin' | 'customer';
  adminUnlocked: boolean;
  expiresAt: number;
}

interface DatabaseState {
  products: Product[];
  categories: CategoryItem[];
  services: ServiceItem[];
  banners: PromoBanner[];
  bookings: ServiceBooking[];
  aiInstructions: AIInstruction[];
  orders: Order[];
  notifications: CustomerNotification[];
  settings: AdminSettings;
  adminEmail: string;
  adminPasswordHash: string;
  adminMustChangePassword: boolean;
  users: UserAccount[];
  sessions: SessionRecord[];
}

function isOfficialAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

function isSafeImageOrUrl(url?: string): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/')) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (
    /^data:image\/(png|jpeg|jpg|pjpeg|webp|gif|svg\+xml|bmp|avif|heic|heif|tiff|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

function getPaymentNumberForMethod(paymentMethod: string, settings: AdminSettings): string {
  const p = settings.paymentSettings;
  const norm = (paymentMethod || '').toLowerCase();

  if (p.customMethods && Array.isArray(p.customMethods)) {
    const custom = p.customMethods.find((m) => m.name && norm.includes(m.name.toLowerCase()));
    if (custom) {
      return custom.number || custom.accountNumber || '';
    }
  }

  if (norm.includes('m-pesa') || norm.includes('mpesa') || norm.includes('vodacom')) {
    return p.mpesa?.number || '0755123456';
  }
  if (norm.includes('mixx') || norm.includes('yas') || norm.includes('tigo')) {
    return p.tigoPesa?.number || '0655123456';
  }
  if (norm.includes('airtel')) {
    return p.airtelMoney?.number || '0788123456';
  }
  if (norm.includes('halo')) {
    return p.haloPesa?.number || '0622123456';
  }
  if (norm.includes('bank') || norm.includes('crdb') || norm.includes('nmb')) {
    return p.bank?.accountNumber || '0150123456700';
  }
  return p.mpesa?.number || '0755123456';
}

function mergeCategories(existing?: CategoryItem[]): CategoryItem[] {
  const base = Array.isArray(existing) && existing.length > 0 ? [...existing] : [...INITIAL_CATEGORIES];
  for (const defCat of INITIAL_CATEGORIES) {
    const hasCat = base.some((c) => c.name.toLowerCase() === defCat.name.toLowerCase());
    if (!hasCat) {
      base.push(defCat);
    }
  }
  return base.map((c) => ({
    ...c,
    iconType: c.iconType || 'emoji',
  }));
}

function getInitialAdminTempPassword(): string {
  return process.env.ADMIN_INITIAL_PASSWORD?.trim() || 'obbytech';
}

function loadDatabase(): DatabaseState {
  let loaded: Partial<DatabaseState> = {};
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      loaded = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load database from disk, using defaults:', err);
  }

  const now = new Date().toISOString();
  const existingSettings = loaded.settings || INITIAL_ADMIN_SETTINGS;
  const contactSettings = {
    ...INITIAL_ADMIN_SETTINGS.contactSettings,
    ...(existingSettings.contactSettings || {}),
  };
  // Upgrade old placeholder or swapped contact defaults
  if (
    contactSettings.whatsapp === '+255 755 123 456' ||
    (contactSettings.phone === '+255713340900' && contactSettings.whatsapp === '+255779594321')
  ) {
    contactSettings.phone = '+255779594321';
    contactSettings.whatsapp = '+255713340900';
  }
  if (contactSettings.phone === '+255 755 123 456') {
    contactSettings.phone = '+255779594321';
  }
  if (contactSettings.email === 'sales@appex.co.tz') {
    contactSettings.email = OFFICIAL_ADMIN_EMAIL;
  }

  const settings: AdminSettings = {
    ...INITIAL_ADMIN_SETTINGS,
    ...existingSettings,
    websiteName: existingSettings.websiteName || 'OBBY TECH',
    contactSettings,
    paymentSettings: {
      ...INITIAL_ADMIN_SETTINGS.paymentSettings,
      ...(existingSettings.paymentSettings || {}),
    },
    deliverySettings: {
      ...INITIAL_ADMIN_SETTINGS.deliverySettings,
      ...(existingSettings.deliverySettings || {}),
    },
    servicesBanner: {
      ...INITIAL_ADMIN_SETTINGS.servicesBanner!,
      ...(existingSettings.servicesBanner || {}),
    },
  };

  let adminEmail = loaded.adminEmail || '';
  let adminPasswordHash = loaded.adminPasswordHash || '';
  let adminMustChangePassword = Boolean(loaded.adminMustChangePassword);
  let needsSave = false;

  // Migrate or initialize admin credentials for obbyitmasters@gmail.com
  if (adminEmail.toLowerCase() !== OFFICIAL_ADMIN_EMAIL || !adminPasswordHash.includes(':')) {
    adminEmail = OFFICIAL_ADMIN_EMAIL;
    adminPasswordHash = hashPassword(getInitialAdminTempPassword());
    adminMustChangePassword = true;
    needsSave = true;
  }

  const users: UserAccount[] = Array.isArray(loaded.users)
    ? loaded.users.map((u) => {
        const lower = (u.email || '').trim().toLowerCase();
        const hadLegacyDefaultAvatar = Boolean(
          u.photo && u.photo.includes('photo-1535713875002-d1d0cf377fde')
        );
        if (hadLegacyDefaultAvatar) {
          needsSave = true;
        }
        const cleanedPhoto = hadLegacyDefaultAvatar ? '' : u.photo;
        if (lower === OFFICIAL_ADMIN_EMAIL) {
          return {
            ...u,
            photo: cleanedPhoto,
            email: OFFICIAL_ADMIN_EMAIL,
            role: 'admin' as const,
            passwordHash: u.passwordHash && u.passwordHash.includes(':') && !needsSave ? u.passwordHash : adminPasswordHash,
            mustChangePassword: adminMustChangePassword,
          };
        }
        return {
          ...u,
          photo: cleanedPhoto,
          role: 'customer' as const,
          mustChangePassword: false,
        };
      })
    : [];

  if (!users.some((u) => u.email.toLowerCase() === OFFICIAL_ADMIN_EMAIL)) {
    users.push({
      id: `admin_${crypto.randomBytes(6).toString('hex')}`,
      fullName: 'OBBY TECH Administrator',
      email: OFFICIAL_ADMIN_EMAIL,
      role: 'admin',
      mustChangePassword: adminMustChangePassword,
      authProvider: 'email',
      passwordHash: adminPasswordHash,
      createdAt: now,
      updatedAt: now,
    });
    needsSave = true;
  }

  const existingServicesList: ServiceItem[] =
    Array.isArray(loaded.services) && loaded.services.length > 0 ? [...loaded.services] : [];
  for (const defSrv of INITIAL_SERVICES) {
    if (!existingServicesList.some((s) => s.id === defSrv.id || s.slug === defSrv.slug)) {
      existingServicesList.push(defSrv);
      needsSave = true;
    }
  }
  const mergedServices: ServiceItem[] = (
    existingServicesList.length > 0 ? existingServicesList : INITIAL_SERVICES
  ).map((srv) => {
    const defSrv = INITIAL_SERVICES.find((d) => d.id === srv.id || d.slug === srv.slug);
    return {
      ...srv,
      coverImage: srv.coverImage || defSrv?.coverImage || '',
      showcaseItems:
        Array.isArray(srv.showcaseItems) && srv.showcaseItems.length > 0
          ? srv.showcaseItems
          : defSrv?.showcaseItems || [],
    };
  });

  const state: DatabaseState = {
    products: Array.isArray(loaded.products) && loaded.products.length > 0 ? loaded.products : INITIAL_PRODUCTS,
    categories: mergeCategories(loaded.categories),
    services: mergedServices,
    banners: Array.isArray(loaded.banners) && loaded.banners.length > 0 ? loaded.banners : INITIAL_BANNERS,
    bookings: Array.isArray(loaded.bookings) ? loaded.bookings : [],
    aiInstructions:
      Array.isArray(loaded.aiInstructions) && loaded.aiInstructions.length > 0
        ? loaded.aiInstructions
        : INITIAL_AI_INSTRUCTIONS,
    orders: Array.isArray(loaded.orders) ? loaded.orders : [],
    notifications: Array.isArray(loaded.notifications) ? loaded.notifications : [],
    settings,
    adminEmail,
    adminPasswordHash,
    adminMustChangePassword,
    users,
    sessions: Array.isArray(loaded.sessions)
      ? loaded.sessions.filter((s) => s.expiresAt > Date.now())
      : [],
  };

  if (needsSave || !fs.existsSync(DB_PATH)) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save migrated database:', err);
    }
  }

  return state;
}

let db: DatabaseState = loadDatabase();

function saveDatabase() {
  try {
    db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

function createSession(
  user: UserAccount,
  adminUnlocked: boolean,
  rememberMe: boolean = true
): SessionRecord {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl = rememberMe ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
  const session: SessionRecord = {
    token,
    userId: user.id,
    email: user.email.toLowerCase(),
    role: isOfficialAdmin(user.email) ? 'admin' : 'customer',
    adminUnlocked: isOfficialAdmin(user.email) && adminUnlocked,
    expiresAt: Date.now() + ttl,
  };
  db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
  db.sessions.push(session);
  saveDatabase();
  return session;
}

function getSessionFromRequest(req: express.Request): { session: SessionRecord; user: UserAccount } | null {
  const authHeader = (req.headers['authorization'] as string) || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  if (!session) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return { session, user };
}

function sanitizeUser(user: UserAccount) {
  const { passwordHash: _, cart: _cart, ...safeUser } = user;
  const isAdmin = isOfficialAdmin(user.email);
  return {
    ...safeUser,
    role: isAdmin ? ('admin' as const) : ('customer' as const),
    mustChangePassword: isAdmin ? db.adminMustChangePassword : false,
  };
}

interface AuthedRequest extends express.Request {
  authSession?: SessionRecord;
  authUser?: UserAccount;
}

function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const ctx = getSessionFromRequest(req);
  if (!ctx) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  req.authSession = ctx.session;
  req.authUser = ctx.user;
  next();
}

function requireAdmin(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const ctx = getSessionFromRequest(req);
  if (!ctx) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (!isOfficialAdmin(ctx.user.email)) {
    return res.status(403).json({ error: 'Access denied: Administrator permission required.' });
  }
  if (!ctx.session.adminUnlocked) {
    return res.status(403).json({ error: 'Admin password verification required.' });
  }
  req.authSession = ctx.session;
  req.authUser = ctx.user;
  next();
}

function requireAdminPasswordUpdated(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  if (db.adminMustChangePassword) {
    return res.status(403).json({
      error: 'Please change your temporary initial administrator password first.',
      mustChangePassword: true,
    });
  }
  next();
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- PUBLIC STOREFRONT DATA ---

  app.get('/api/products', (req, res) => {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    let results = db.products;

    if (category && category !== 'All') {
      results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const term = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.specifications.some((s) => s.toLowerCase().includes(term))
      );
    }

    res.json(results);
  });

  app.get('/api/products/:id', (req, res) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });

  app.get('/api/categories', (_req, res) => {
    res.json(db.categories);
  });

  app.get('/api/services', (_req, res) => {
    res.json(db.services);
  });

  app.post('/api/services', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const { title, description, iconName, requiresDeviceDetails, coverImage, showcaseItems } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Service category title is required.' });
    }
    if (coverImage && !isSafeImageOrUrl(coverImage)) {
      return res.status(400).json({ error: 'Invalid cover image URL.' });
    }

    const sanitizedShowcase = (Array.isArray(showcaseItems) ? showcaseItems : [])
      .filter((item: any) => item && item.title && isSafeImageOrUrl(item.image))
      .map((item: any, idx: number) => ({
        id: String(item.id || `sh-${Date.now()}-${idx}`),
        title: String(item.title).trim(),
        description: String(item.description || '').trim(),
        price: item.price !== undefined && item.price !== '' ? Number(item.price) : undefined,
        priceLabel: item.priceLabel ? String(item.priceLabel).trim() : '',
        image: String(item.image || '').trim(),
      }));

    const slugBase = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newService: ServiceItem = {
      id: `srv-${Date.now()}`,
      slug: slugBase || `service-${Date.now()}`,
      title: String(title).trim(),
      description: String(description || '').trim(),
      iconName: iconName || 'Sparkles',
      requiresDeviceDetails: Boolean(requiresDeviceDetails),
      coverImage: coverImage ? String(coverImage).trim() : '',
      showcaseItems: sanitizedShowcase,
    };

    db.services.push(newService);
    saveDatabase();
    res.status(201).json(newService);
  });

  app.put('/api/services/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const idx = db.services.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Service category not found.' });
    }

    const existing = db.services[idx];
    if (req.body.coverImage && !isSafeImageOrUrl(req.body.coverImage)) {
      return res.status(400).json({ error: 'Invalid cover image URL.' });
    }

    let updatedShowcase = existing.showcaseItems || [];
    if (Array.isArray(req.body.showcaseItems)) {
      for (const item of req.body.showcaseItems) {
        if (item?.image && !isSafeImageOrUrl(item.image)) {
          return res.status(400).json({ error: 'Invalid showcase item image URL.' });
        }
      }
      updatedShowcase = req.body.showcaseItems
        .filter((item: any) => item && (item.title || item.image))
        .map((item: any, sIdx: number) => ({
          id: String(item.id || `sh-${Date.now()}-${sIdx}`),
          title: String(item.title || 'Service Item').trim(),
          description: String(item.description || '').trim(),
          price: item.price !== undefined && item.price !== '' && !Number.isNaN(Number(item.price))
            ? Number(item.price)
            : undefined,
          priceLabel: item.priceLabel ? String(item.priceLabel).trim() : '',
          image: String(item.image || '').trim(),
        }));
    }

    const updated: ServiceItem = {
      ...existing,
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      description: req.body.description !== undefined ? String(req.body.description).trim() : existing.description,
      iconName: req.body.iconName || existing.iconName,
      requiresDeviceDetails:
        req.body.requiresDeviceDetails !== undefined
          ? Boolean(req.body.requiresDeviceDetails)
          : existing.requiresDeviceDetails,
      coverImage: req.body.coverImage !== undefined ? String(req.body.coverImage).trim() : existing.coverImage,
      showcaseItems: updatedShowcase,
    };

    db.services[idx] = updated;
    saveDatabase();
    res.json(updated);
  });

  app.delete('/api/services/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const before = db.services.length;
    db.services = db.services.filter((s) => s.id !== req.params.id);
    if (db.services.length === before) {
      return res.status(404).json({ error: 'Service category not found.' });
    }
    saveDatabase();
    res.json({ success: true });
  });

  app.get('/api/banners', (req, res) => {
    const includeAll = req.query.all === 'true';
    const sorted = [...db.banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (includeAll) {
      const ctx = getSessionFromRequest(req);
      if (ctx && isOfficialAdmin(ctx.user.email) && ctx.session.adminUnlocked) {
        return res.json(sorted);
      }
    }
    res.json(sorted.filter((b) => b.enabled !== false));
  });

  app.get('/api/settings', (_req, res) => {
    res.json(db.settings);
  });

  // --- ADMIN CATALOG, BANNERS, CATEGORIES, AI INSTRUCTIONS & SETTINGS ---

  app.post('/api/products', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const { name, category, price, description, specifications, stock, condition, images, primaryImage, location } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }

    const sanitizedImages = (Array.isArray(images) ? images : []).filter((img: string) => isSafeImageOrUrl(img));
    const safePrimary = isSafeImageOrUrl(primaryImage) ? primaryImage : '';

    const newProduct: Product = {
      id: `apx-${Date.now()}`,
      name: String(name).trim(),
      category,
      price: Number(price),
      description: String(description || ''),
      specifications: Array.isArray(specifications)
        ? specifications.map((s: any) => String(s).trim()).filter(Boolean)
        : specifications
        ? [String(specifications).trim()]
        : [],
      stock: Number(stock || 0),
      availability: Number(stock || 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      condition: condition || 'Brand New',
      images:
        sanitizedImages.length > 0
          ? sanitizedImages
          : ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'],
      primaryImage:
        safePrimary ||
        sanitizedImages[0] ||
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
      location: String(location || 'Dodoma'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    saveDatabase();
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const index = db.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = db.products[index];
    const updatedStock = req.body.stock !== undefined ? Number(req.body.stock) : existing.stock;
    const incomingImages = Array.isArray(req.body.images)
      ? req.body.images.filter((img: string) => isSafeImageOrUrl(img))
      : existing.images;
    const safePrimary =
      req.body.primaryImage && isSafeImageOrUrl(req.body.primaryImage)
        ? req.body.primaryImage
        : existing.primaryImage;

    const updatedProduct: Product = {
      ...existing,
      name: req.body.name !== undefined ? String(req.body.name).trim() : existing.name,
      category: req.body.category || existing.category,
      price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
      description: req.body.description !== undefined ? String(req.body.description) : existing.description,
      specifications: Array.isArray(req.body.specifications)
        ? req.body.specifications.map((s: any) => String(s).trim()).filter(Boolean)
        : existing.specifications,
      condition: req.body.condition || existing.condition,
      location: req.body.location !== undefined ? String(req.body.location) : existing.location,
      images: incomingImages.length > 0 ? incomingImages : existing.images,
      primaryImage: safePrimary,
      stock: updatedStock,
      availability: updatedStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      updatedAt: new Date().toISOString(),
    };

    db.products[index] = updatedProduct;
    saveDatabase();
    res.json(updatedProduct);
  });

  app.delete('/api/products/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const initialLength = db.products.length;
    db.products = db.products.filter((p) => p.id !== req.params.id);
    if (db.products.length === initialLength) {
      return res.status(404).json({ error: 'Product not found' });
    }
    saveDatabase();
    res.json({ success: true, message: 'Product deleted successfully' });
  });

  // Banners CRUD (Admin)
  app.post('/api/banners', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const {
      image,
      kickerEn,
      kickerSw,
      titleEn,
      titleSw,
      subtitleEn,
      subtitleSw,
      ctaEn,
      ctaSw,
      targetCategory,
      enabled,
      order,
    } = req.body;

    if (!image || !isSafeImageOrUrl(image)) {
      return res.status(400).json({ error: 'A valid banner image is required' });
    }
    if (!titleEn) {
      return res.status(400).json({ error: 'Banner title is required' });
    }

    const now = new Date().toISOString();
    const nextOrder =
      order !== undefined
        ? Number(order)
        : db.banners.reduce((max, b) => Math.max(max, b.order || 0), 0) + 1;

    const newBanner: PromoBanner = {
      id: `banner-${Date.now()}`,
      image,
      kickerEn: String(kickerEn || 'OBBY TECH · FEATURED'),
      kickerSw: String(kickerSw || kickerEn || 'OBBY TECH · OFA MAALUM'),
      titleEn: String(titleEn).trim(),
      titleSw: String(titleSw || titleEn).trim(),
      subtitleEn: String(subtitleEn || ''),
      subtitleSw: String(subtitleSw || subtitleEn || ''),
      ctaEn: String(ctaEn || 'Explore Now'),
      ctaSw: String(ctaSw || ctaEn || 'Tazama Sasa'),
      targetCategory: targetCategory || 'All',
      enabled: enabled !== false,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    };

    db.banners.push(newBanner);
    saveDatabase();
    res.status(201).json(newBanner);
  });

  app.put('/api/banners/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const idx = db.banners.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    const existing = db.banners[idx];
    if (req.body.image && !isSafeImageOrUrl(req.body.image)) {
      return res.status(400).json({ error: 'Invalid banner image URL' });
    }

    const updated: PromoBanner = {
      ...existing,
      image: req.body.image || existing.image,
      kickerEn: req.body.kickerEn !== undefined ? String(req.body.kickerEn) : existing.kickerEn,
      kickerSw: req.body.kickerSw !== undefined ? String(req.body.kickerSw) : existing.kickerSw,
      titleEn: req.body.titleEn !== undefined ? String(req.body.titleEn) : existing.titleEn,
      titleSw: req.body.titleSw !== undefined ? String(req.body.titleSw) : existing.titleSw,
      subtitleEn: req.body.subtitleEn !== undefined ? String(req.body.subtitleEn) : existing.subtitleEn,
      subtitleSw: req.body.subtitleSw !== undefined ? String(req.body.subtitleSw) : existing.subtitleSw,
      ctaEn: req.body.ctaEn !== undefined ? String(req.body.ctaEn) : existing.ctaEn,
      ctaSw: req.body.ctaSw !== undefined ? String(req.body.ctaSw) : existing.ctaSw,
      targetCategory: req.body.targetCategory || existing.targetCategory,
      enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : existing.enabled,
      order: req.body.order !== undefined ? Number(req.body.order) : existing.order,
      updatedAt: new Date().toISOString(),
    };

    db.banners[idx] = updated;
    saveDatabase();
    res.json(updated);
  });

  app.delete('/api/banners/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const before = db.banners.length;
    db.banners = db.banners.filter((b) => b.id !== req.params.id);
    if (db.banners.length === before) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    saveDatabase();
    res.json({ success: true });
  });

  // Categories Icon & Image Update (Admin)
  app.put('/api/categories/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const idx = db.categories.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const existing = db.categories[idx];
    const { icon, iconType, imageUrl, description } = req.body;

    if (imageUrl && !isSafeImageOrUrl(imageUrl)) {
      return res.status(400).json({ error: 'Invalid category image URL' });
    }
    if (iconType === 'image' && icon && !isSafeImageOrUrl(icon)) {
      return res.status(400).json({ error: 'Invalid custom icon image' });
    }

    const updated: CategoryItem = {
      ...existing,
      icon: icon !== undefined ? String(icon) : existing.icon,
      iconType: iconType || existing.iconType || 'emoji',
      imageUrl: imageUrl !== undefined ? String(imageUrl) : existing.imageUrl,
      description: description !== undefined ? String(description) : existing.description,
    };

    db.categories[idx] = updated;
    saveDatabase();
    res.json(updated);
  });

  // AI Instructions CRUD (Admin)
  app.get('/api/ai/instructions', requireAdmin, (_req, res) => {
    res.json(db.aiInstructions);
  });

  app.post('/api/ai/instructions', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const { title, instruction, enabled } = req.body;
    if (!title || !instruction) {
      return res.status(400).json({ error: 'Title and instruction content are required' });
    }
    const now = new Date().toISOString();
    const item: AIInstruction = {
      id: `ai-inst-${Date.now()}`,
      title: String(title).trim(),
      instruction: String(instruction).trim(),
      enabled: enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    db.aiInstructions.unshift(item);
    saveDatabase();
    res.status(201).json(item);
  });

  app.put('/api/ai/instructions/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const idx = db.aiInstructions.findIndex((i) => i.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'AI instruction not found' });
    }
    const existing = db.aiInstructions[idx];
    const updated: AIInstruction = {
      ...existing,
      title: req.body.title !== undefined ? String(req.body.title).trim() : existing.title,
      instruction: req.body.instruction !== undefined ? String(req.body.instruction).trim() : existing.instruction,
      enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    db.aiInstructions[idx] = updated;
    saveDatabase();
    res.json(updated);
  });

  app.delete('/api/ai/instructions/:id', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const before = db.aiInstructions.length;
    db.aiInstructions = db.aiInstructions.filter((i) => i.id !== req.params.id);
    if (db.aiInstructions.length === before) {
      return res.status(404).json({ error: 'AI instruction not found' });
    }
    saveDatabase();
    res.json({ success: true });
  });

  // Update Settings (Admin)
  app.put('/api/settings', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    if (req.body.websiteLogo && !isSafeImageOrUrl(req.body.websiteLogo)) {
      return res.status(400).json({ error: 'Invalid logo URL' });
    }
    if (req.body.servicesBanner?.imageUrl && !isSafeImageOrUrl(req.body.servicesBanner.imageUrl)) {
      return res.status(400).json({ error: 'Invalid services banner image URL' });
    }
    db.settings = {
      ...db.settings,
      ...req.body,
      paymentSettings: req.body.paymentSettings
        ? { ...db.settings.paymentSettings, ...req.body.paymentSettings }
        : db.settings.paymentSettings,
      contactSettings: req.body.contactSettings
        ? { ...db.settings.contactSettings, ...req.body.contactSettings }
        : db.settings.contactSettings,
      deliverySettings: req.body.deliverySettings
        ? { ...db.settings.deliverySettings, ...req.body.deliverySettings }
        : db.settings.deliverySettings,
      servicesBanner: req.body.servicesBanner
        ? { ...(db.settings.servicesBanner || INITIAL_ADMIN_SETTINGS.servicesBanner!), ...req.body.servicesBanner }
        : db.settings.servicesBanner,
    };
    saveDatabase();
    res.json(db.settings);
  });

  // --- AUTHENTICATION ROUTES ---

  // Verified Google Authentication (Verifies Firebase ID Token, Google GIS JWT credential, or Google OAuth Access Token)
  app.post('/api/auth/google', async (req, res) => {
    const { idToken, accessToken, credential } = req.body;

    let verifiedEmail = '';
    let verifiedUid = '';
    let verifiedName = '';
    let verifiedPhoto = '';

    try {
      if (idToken && typeof idToken === 'string') {
        const verifyRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );
        if (!verifyRes.ok) {
          return res.status(401).json({ error: 'Google token verification failed.' });
        }
        const verifyData = await verifyRes.json();
        const fbUser = verifyData?.users?.[0];
        if (!fbUser || !fbUser.email) {
          return res.status(401).json({ error: 'Invalid Google account token.' });
        }
        verifiedEmail = String(fbUser.email).toLowerCase().trim();
        verifiedUid = String(fbUser.localId);
        verifiedName = fbUser.displayName ? String(fbUser.displayName) : '';
        verifiedPhoto = fbUser.photoUrl ? String(fbUser.photoUrl) : '';
      } else if (credential && typeof credential === 'string') {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (!tokenInfoRes.ok) {
          return res.status(401).json({ error: 'Google ID token verification failed.' });
        }
        const googleUser = await tokenInfoRes.json();
        if (!googleUser || !googleUser.email) {
          return res.status(401).json({ error: 'Email address not provided by Google.' });
        }
        if (firebaseConfig.oAuthClientId && googleUser.aud && googleUser.aud !== firebaseConfig.oAuthClientId) {
          return res.status(401).json({ error: 'Google token audience mismatch.' });
        }
        verifiedEmail = String(googleUser.email).toLowerCase().trim();
        verifiedUid = String(googleUser.sub || `google_${verifiedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`);
        verifiedName = googleUser.name ? String(googleUser.name) : '';
        verifiedPhoto = googleUser.picture ? String(googleUser.picture) : '';
      } else if (accessToken && typeof accessToken === 'string') {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userInfoRes.ok) {
          return res.status(401).json({ error: 'Google OAuth access token verification failed.' });
        }
        const googleUser = await userInfoRes.json();
        if (!googleUser || !googleUser.email) {
          return res.status(401).json({ error: 'Email address not provided by Google.' });
        }
        verifiedEmail = String(googleUser.email).toLowerCase().trim();
        verifiedUid = String(googleUser.sub || `google_${verifiedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`);
        verifiedName = googleUser.name ? String(googleUser.name) : '';
        verifiedPhoto = googleUser.picture ? String(googleUser.picture) : '';
      } else {
        return res.status(401).json({ error: 'Google verification token is required.' });
      }
    } catch (err) {
      console.error('Google token verification error:', err);
      return res.status(500).json({ error: 'Unable to verify Google sign-in right now.' });
    }

    const isAdmin = isOfficialAdmin(verifiedEmail);
    const role: 'admin' | 'customer' = isAdmin ? 'admin' : 'customer';

    let user = db.users.find(
      (u) => (u.googleUid && u.googleUid === verifiedUid) || u.email.toLowerCase() === verifiedEmail
    );

    if (user) {
      user.googleUid = verifiedUid;
      user.role = role;
      if (verifiedName) user.fullName = verifiedName;
      if (verifiedPhoto && isSafeImageOrUrl(verifiedPhoto)) user.photo = verifiedPhoto;
      if (isAdmin) {
        user.mustChangePassword = db.adminMustChangePassword;
        if (!user.passwordHash) user.passwordHash = db.adminPasswordHash;
      }
      user.updatedAt = new Date().toISOString();
    } else {
      user = {
        id: verifiedUid,
        googleUid: verifiedUid,
        fullName: verifiedName || (isAdmin ? 'OBBY TECH Administrator' : verifiedEmail.split('@')[0]),
        email: verifiedEmail,
        role,
        mustChangePassword: isAdmin ? db.adminMustChangePassword : false,
        photo: verifiedPhoto && isSafeImageOrUrl(verifiedPhoto) ? verifiedPhoto : '',
        authProvider: 'google',
        passwordHash: isAdmin ? db.adminPasswordHash : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.push(user);
    }

    const session = createSession(user, false);
    res.json({
      success: true,
      user: sanitizeUser(user),
      token: session.token,
      isAdmin,
      adminUnlocked: false,
      mustChangePassword: isAdmin ? db.adminMustChangePassword : false,
    });
  });

  // Customer Email Registration
  app.post('/api/auth/email/register', (req, res) => {
    const { email, password, fullName, phone, region, street, address, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const lowerEmail = email.toLowerCase().trim();
    if (isOfficialAdmin(lowerEmail)) {
      return res.status(403).json({
        error: 'This email is reserved for the administrator account. Please sign in instead.',
      });
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === lowerEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newUser: UserAccount = {
      id: userId,
      fullName: (fullName && String(fullName).trim()) || lowerEmail.split('@')[0],
      email: lowerEmail,
      role: 'customer',
      mustChangePassword: false,
      phone: phone ? String(phone).trim() : '',
      region: region ? String(region).trim() : 'Dodoma',
      street: street ? String(street).trim() : '',
      address: address ? String(address).trim() : '',
      photo: '',
      authProvider: 'email',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    const session = createSession(newUser, false, rememberMe !== false);
    res.status(201).json({
      success: true,
      user: sanitizeUser(newUser),
      token: session.token,
      isAdmin: false,
    });
  });

  // Email Login (Customer or Admin)
  app.post('/api/auth/email/login', (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const lowerEmail = String(email).toLowerCase().trim();
    const user = db.users.find((u) => u.email.toLowerCase() === lowerEmail);
    const isAdmin = isOfficialAdmin(lowerEmail);

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const hashToCheck = isAdmin ? db.adminPasswordHash : user.passwordHash;
    if (!hashToCheck || !verifyPassword(String(password), hashToCheck)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    user.role = isAdmin ? 'admin' : 'customer';
    user.mustChangePassword = isAdmin ? db.adminMustChangePassword : false;
    user.updatedAt = new Date().toISOString();

    const session = createSession(user, isAdmin, rememberMe !== false);
    res.json({
      success: true,
      user: sanitizeUser(user),
      token: session.token,
      isAdmin,
      adminUnlocked: isAdmin,
      mustChangePassword: isAdmin ? db.adminMustChangePassword : false,
    });
  });

  // Update Own Authenticated Profile
  app.put('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { fullName, phone, region, street, address, photo } = req.body;

    if (fullName && String(fullName).trim()) user.fullName = String(fullName).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (region !== undefined) user.region = String(region).trim();
    if (street !== undefined) user.street = String(street).trim();
    if (address !== undefined) user.address = String(address).trim();
    if (photo !== undefined) {
      const trimmedPhoto = String(photo).trim();
      if (!trimmedPhoto) {
        user.photo = '';
      } else if (isSafeImageOrUrl(trimmedPhoto)) {
        user.photo = trimmedPhoto;
      } else {
        return res.status(400).json({ error: 'Invalid profile photo image.' });
      }
    }
    user.updatedAt = new Date().toISOString();

    saveDatabase();
    res.json({
      success: true,
      user: sanitizeUser(user),
      isAdmin: isOfficialAdmin(user.email),
    });
  });

  // Get Current Authenticated User Session
  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const isAdmin = isOfficialAdmin(user.email);
    res.json({
      success: true,
      user: sanitizeUser(user),
      isAdmin,
      adminUnlocked: Boolean(req.authSession?.adminUnlocked),
      mustChangePassword: isAdmin ? db.adminMustChangePassword : false,
    });
  });

  // Logout & Invalidate Session
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = (req.headers['authorization'] as string) || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveDatabase();
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Admin Password Verification / Unlock
  app.post('/api/admin/login', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    if (!isOfficialAdmin(user.email)) {
      return res.status(403).json({
        error: 'Access Denied: Admin access is restricted exclusively to the authorized administrator account.',
      });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Please enter the admin password.' });
    }

    if (!verifyPassword(String(password), db.adminPasswordHash)) {
      return res.status(401).json({ error: 'Incorrect admin password. Please try again.' });
    }

    if (req.authSession) {
      req.authSession.adminUnlocked = true;
      saveDatabase();
    }

    res.json({
      success: true,
      token: req.authSession?.token,
      mustChangePassword: db.adminMustChangePassword,
    });
  });

  // Change Admin Password (Mandatory after first login with initial temporary password)
  app.post('/api/admin/change-password', requireAdmin, (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !verifyPassword(String(currentPassword), db.adminPasswordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    if (newPassword === getInitialAdminTempPassword()) {
      return res.status(400).json({ error: 'Please choose a new password different from the initial temporary password.' });
    }

    const newHash = hashPassword(newPassword);
    db.adminPasswordHash = newHash;
    db.adminMustChangePassword = false;

    const adminUser = db.users.find((u) => isOfficialAdmin(u.email));
    if (adminUser) {
      adminUser.passwordHash = newHash;
      adminUser.mustChangePassword = false;
      adminUser.updatedAt = new Date().toISOString();
    }

    saveDatabase();
    res.json({
      success: true,
      message: 'Administrator password updated successfully.',
      mustChangePassword: false,
    });
  });

  // --- PRIVATE PER-USER CART API ---

  app.get('/api/cart', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const saved = Array.isArray(user.cart) ? user.cart : [];
    const hydrated: OrderItem[] = saved.map((item) => {
      const catalogProd = db.products.find((p) => p.id === item.productId);
      return {
        productId: String(item.productId),
        productName: catalogProd ? catalogProd.name : String(item.productName),
        productImage: catalogProd ? catalogProd.primaryImage : String(item.productImage || ''),
        price: catalogProd ? catalogProd.price : Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
      };
    });
    res.json(hydrated);
  });

  app.put('/api/cart', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];

    const sanitizedCart: OrderItem[] = incoming
      .filter((item: any) => item && item.productId)
      .map((item: any) => {
        const catalogProd = db.products.find((p) => p.id === item.productId);
        return {
          productId: String(item.productId),
          productName: catalogProd ? catalogProd.name : String(item.productName || 'Product'),
          productImage: catalogProd
            ? catalogProd.primaryImage
            : isSafeImageOrUrl(item.productImage)
            ? String(item.productImage || '')
            : '',
          price: catalogProd ? catalogProd.price : Math.max(0, Number(item.price || 0)),
          quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
        };
      });

    user.cart = sanitizedCart;
    user.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json(sanitizedCart);
  });

  // --- ORDERS API (STRICT PER-USER & ADMIN PRIVACY) ---

  app.get('/api/orders', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const sortNewestFirst = (list: Order[]) =>
      [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (isAdmin && req.query.admin === 'true') {
      return res.json(sortNewestFirst(db.orders));
    }

    const lowerEmail = user.email.toLowerCase();
    const customerOrders = db.orders.filter(
      (o) => o.customerId === user.id || (o.customerEmail && o.customerEmail.toLowerCase() === lowerEmail)
    );
    res.json(sortNewestFirst(customerOrders));
  });

  app.post('/api/orders', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { customerName, phone, region, street, items, paymentMethod, paymentNumber } = req.body;

    if (!customerName || !phone || !region || !street || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required customer order fields' });
    }

    let orderId = '';
    do {
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      orderId = `APX${orderNum}`;
    } while (db.orders.some((o) => o.id === orderId));

    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const catalogProd = db.products.find((p) => p.id === item.productId);
      const unitPrice = catalogProd ? catalogProd.price : Number(item.price || 0);
      const qty = Math.max(1, Number(item.quantity || 1));
      subtotal += unitPrice * qty;
      return {
        productId: String(item.productId),
        productName: catalogProd ? catalogProd.name : String(item.productName),
        productImage: catalogProd ? catalogProd.primaryImage : String(item.productImage || ''),
        price: unitPrice,
        quantity: qty,
      };
    });

    const isOutsideDodoma = !String(region).toLowerCase().includes('dodoma');
    const deliveryFee = isOutsideDodoma
      ? db.settings.deliverySettings.outsideDarFee || 10000
      : db.settings.deliverySettings.darFee || 0;
    const total = subtotal + deliveryFee;

    const selectedMethod = paymentMethod || 'Vodacom M-Pesa';
    const resolvedPaymentNumber = paymentNumber || getPaymentNumberForMethod(selectedMethod, db.settings);

    const newOrder: Order = {
      id: orderId,
      customerId: user.id,
      customerEmail: user.email.toLowerCase(),
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      region: String(region).trim(),
      street: String(street).trim(),
      items: processedItems,
      subtotal,
      deliveryFee,
      total,
      paymentMethod: selectedMethod,
      paymentNumber: resolvedPaymentNumber,
      paymentStatus: 'PENDING',
      deliveryStatus: 'NOT_SHIPPED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);

    const customerNotification: CustomerNotification = {
      id: `notif-${Date.now()}-c`,
      userId: user.id,
      userEmail: user.email.toLowerCase(),
      title: '🔔 Order Received',
      message: `Your order #${orderId} has been received. We are waiting for your payment.\n\nPayment No: ${resolvedPaymentNumber}`,
      type: 'order_received',
      read: false,
      createdAt: new Date().toISOString(),
      orderId,
    };
    db.notifications.unshift(customerNotification);

    const productSummary = processedItems
      .map((it) => `${it.productName}${it.quantity > 1 ? ` (x${it.quantity})` : ''}`)
      .join(', ');
    const adminNotificationMessage = `Order: #${orderId}\nCustomer: ${newOrder.customerName}\nPhone: ${newOrder.phone}\nRegion: ${newOrder.region}\nProduct: ${productSummary}\nTotal: TSh ${total.toLocaleString()}\nStatus: PENDING`;

    const adminNotification: CustomerNotification = {
      id: `notif-${Date.now()}-a`,
      userId: OFFICIAL_ADMIN_EMAIL,
      userEmail: OFFICIAL_ADMIN_EMAIL,
      title: '🔔 New Order Received',
      message: adminNotificationMessage,
      type: 'new_order_admin',
      read: false,
      createdAt: new Date().toISOString(),
      orderId,
    };
    db.notifications.unshift(adminNotification);

    saveDatabase();
    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id/payment-method', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const { paymentMethod, paymentNumber } = req.body;
    const order = db.orders.find((o) => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const isOwner =
      order.customerId === user.id ||
      (order.customerEmail && order.customerEmail.toLowerCase() === user.email.toLowerCase());
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to modify this order.' });
    }

    if (paymentMethod) {
      order.paymentMethod = String(paymentMethod);
      const resolvedNum = paymentNumber || getPaymentNumberForMethod(order.paymentMethod, db.settings);
      order.paymentNumber = String(resolvedNum);
      order.updatedAt = new Date().toISOString();

      const customerNotif = db.notifications.find(
        (n) => n.orderId === order.id && n.type === 'order_received' && n.userId === order.customerId
      );
      if (customerNotif) {
        customerNotif.message = `Your order #${order.id} has been received. We are waiting for your payment.\n\nPayment No: ${resolvedNum}`;
      }
    }

    saveDatabase();
    res.json(order);
  });

  app.put('/api/orders/:id/status', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const { paymentStatus, deliveryStatus } = req.body;
    const order = db.orders.find((o) => o.id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (paymentStatus && ['PENDING', 'PAID'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'PAID') {
        const payNotifMsg = `Your payment for order #${order.id} has been received and your order has been marked as PAID.`;
        db.notifications.unshift({
          id: `notif-${Date.now()}-pay-id`,
          userId: order.customerId,
          userEmail: order.customerEmail,
          title: '💰 Payment Confirmed',
          message: payNotifMsg,
          type: 'payment_confirmed',
          read: false,
          createdAt: new Date().toISOString(),
          orderId: order.id,
        });
      }
    }

    if (deliveryStatus && ['PENDING', 'NOT_SHIPPED', 'SHIPPED', 'UMESAFIRISHWA'].includes(deliveryStatus)) {
      const isShipped = deliveryStatus === 'SHIPPED' || deliveryStatus === 'UMESAFIRISHWA';
      order.deliveryStatus = isShipped ? 'SHIPPED' : 'NOT_SHIPPED';
      if (isShipped) {
        const shipNotifMsg = `Your order #${order.id} has been shipped.`;
        db.notifications.unshift({
          id: `notif-${Date.now()}-ship-id`,
          userId: order.customerId,
          userEmail: order.customerEmail,
          title: '🚚 Order Shipped',
          message: shipNotifMsg,
          type: 'order_shipped',
          read: false,
          createdAt: new Date().toISOString(),
          orderId: order.id,
        });
      }
    }

    order.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json(order);
  });

  app.delete('/api/orders/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const orderId = req.params.id;
    const orderIndex = db.orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = db.orders[orderIndex];
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const isOwner =
      order.customerId === user.id ||
      (order.customerEmail && order.customerEmail.toLowerCase() === user.email.toLowerCase());
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this order.' });
    }

    db.orders.splice(orderIndex, 1);
    saveDatabase();

    res.json({ success: true, message: `Order #${orderId} deleted permanently` });
  });

  // --- SERVICE BOOKINGS API (STRICT PER-USER & ADMIN PRIVACY) ---

  app.get('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const sortNewestFirst = (list: ServiceBooking[]) =>
      [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (isAdmin && req.query.admin === 'true') {
      return res.json(sortNewestFirst(db.bookings));
    }

    const lowerEmail = user.email.toLowerCase();
    const myBookings = db.bookings.filter(
      (b) => b.customerId === user.id || b.customerEmail.toLowerCase() === lowerEmail
    );
    res.json(sortNewestFirst(myBookings));
  });

  app.post('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const {
      serviceId,
      serviceName,
      bookingDate,
      bookingTime,
      customerName,
      phone,
      deviceDetails,
      problemDescription,
    } = req.body;

    if (!serviceName || !bookingDate || !bookingTime || !customerName || !phone || !problemDescription) {
      return res.status(400).json({ error: 'Please complete all required booking fields.' });
    }

    let bookingRef = '';
    do {
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      bookingRef = `BK-${randomCode}`;
    } while (db.bookings.some((b) => b.id === bookingRef));
    const now = new Date().toISOString();

    const newBooking: ServiceBooking = {
      id: bookingRef,
      customerId: user.id,
      customerEmail: user.email.toLowerCase(),
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      serviceId: String(serviceId || ''),
      serviceName: String(serviceName).trim(),
      bookingDate: String(bookingDate).trim(),
      bookingTime: String(bookingTime).trim(),
      deviceDetails: deviceDetails ? String(deviceDetails).trim() : '',
      problemDescription: String(problemDescription).trim(),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    db.bookings.unshift(newBooking);

    // Notify Customer
    db.notifications.unshift({
      id: `notif-${Date.now()}-bk-c`,
      userId: user.id,
      userEmail: user.email.toLowerCase(),
      title: '📅 Service Booking Confirmed',
      message: `Your booking #${bookingRef} for ${newBooking.serviceName} on ${newBooking.bookingDate} at ${newBooking.bookingTime} has been received (Status: PENDING).`,
      type: 'booking_received',
      read: false,
      createdAt: now,
      bookingId: bookingRef,
    });

    // Notify Administrator
    db.notifications.unshift({
      id: `notif-${Date.now()}-bk-a`,
      userId: OFFICIAL_ADMIN_EMAIL,
      userEmail: OFFICIAL_ADMIN_EMAIL,
      title: '🛠️ New Service Booking',
      message: `Ref: #${bookingRef}\nService: ${newBooking.serviceName}\nCustomer: ${newBooking.customerName} (${newBooking.phone})\nDate: ${newBooking.bookingDate} at ${newBooking.bookingTime}${
        newBooking.deviceDetails ? `\nDevice: ${newBooking.deviceDetails}` : ''
      }\nDetails: ${newBooking.problemDescription}`,
      type: 'new_booking_admin',
      read: false,
      createdAt: now,
      bookingId: bookingRef,
    });

    saveDatabase();
    res.status(201).json(newBooking);
  });

  app.put('/api/bookings/:id/status', requireAdmin, requireAdminPasswordUpdated, (req, res) => {
    const { status, adminNotes } = req.body;
    const booking = db.bookings.find((b) => b.id === req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && validStatuses.includes(status)) {
      booking.status = status;
    }
    if (adminNotes !== undefined) {
      booking.adminNotes = String(adminNotes).trim();
    }
    booking.updatedAt = new Date().toISOString();

    db.notifications.unshift({
      id: `notif-${Date.now()}-bk-upd`,
      userId: booking.customerId,
      userEmail: booking.customerEmail,
      title: `🛠️ Booking #${booking.id} Updated`,
      message: `Your ${booking.serviceName} booking (#${booking.id}) status is now ${booking.status}.${
        booking.adminNotes ? `\nNote: ${booking.adminNotes}` : ''
      }`,
      type: 'booking_updated',
      read: false,
      createdAt: new Date().toISOString(),
      bookingId: booking.id,
    });

    saveDatabase();
    res.json(booking);
  });

  app.delete('/api/bookings/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const idx = db.bookings.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = db.bookings[idx];
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const isOwner =
      booking.customerId === user.id ||
      booking.customerEmail.toLowerCase() === user.email.toLowerCase();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this booking.' });
    }

    db.bookings.splice(idx, 1);
    saveDatabase();
    res.json({ success: true });
  });

  // --- NOTIFICATIONS API (STRICT ACCOUNT PRIVACY) ---

  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const lowerEmail = user.email.toLowerCase();

    if (isAdmin && req.query.admin === 'true') {
      const adminNotifs = db.notifications.filter(
        (n) =>
          n.userId === OFFICIAL_ADMIN_EMAIL ||
          n.userEmail?.toLowerCase() === OFFICIAL_ADMIN_EMAIL ||
          n.type === 'new_order_admin' ||
          n.type === 'new_booking_admin' ||
          n.userId === user.id
      );
      return res.json(adminNotifs);
    }

    const userNotifs = db.notifications.filter((n) => {
      if (n.type === 'new_order_admin' || n.type === 'new_booking_admin') {
        return isAdmin;
      }
      return (
        n.userId === user.id ||
        (n.userEmail && n.userEmail.toLowerCase() === lowerEmail)
      );
    });
    res.json(userNotifs);
  });

  app.put('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const isOwner =
      notif.userId === user.id ||
      (notif.userEmail && notif.userEmail.toLowerCase() === user.email.toLowerCase());
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    notif.read = true;
    saveDatabase();
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const notifIndex = db.notifications.findIndex((n) => n.id === req.params.id);
    if (notifIndex === -1) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notif = db.notifications[notifIndex];
    const isAdmin = isOfficialAdmin(user.email) && Boolean(req.authSession?.adminUnlocked);
    const isOwner =
      notif.userId === user.id ||
      (notif.userEmail && notif.userEmail.toLowerCase() === user.email.toLowerCase());

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this notification' });
    }

    db.notifications.splice(notifIndex, 1);
    saveDatabase();
    res.json({ success: true, message: 'Notification deleted successfully' });
  });

  // --- OBBY AI CUSTOMER ASSISTANT ENDPOINT ---
  app.post('/api/ai/chat', async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!ai) {
      return res.json({
        reply: `Obby Ai assistant service is currently initializing. Please feel free to ask any question or contact Obby Tech directly at ${db.settings.contactSettings.phone}.`,
      });
    }

    try {
      const authCtx = getSessionFromRequest(req);
      const authUser = authCtx?.user;

      const availableProducts = db.products.map((p) => ({
        name: p.name,
        category: p.category,
        price: `TSh ${p.price.toLocaleString()}`,
        stock: p.stock > 0 ? `${p.stock} units in stock` : 'OUT OF STOCK',
        condition: p.condition,
        location: p.location,
        specs: p.specifications.join(', '),
      }));

      const availableServices = db.services.map((s) => ({
        title: s.title,
        description: s.description,
        packages: (s.showcaseItems || []).map((item) => ({
          name: item.title,
          details: item.description,
          price: item.priceLabel || (item.price ? `TSh ${item.price.toLocaleString()}` : 'Contact for quote'),
        })),
      }));

      let customerContext = 'Customer is browsing as a guest (not signed in).';
      if (authUser) {
        const lowerEmail = authUser.email.toLowerCase();
        const userOrders = db.orders.filter(
          (o) => o.customerId === authUser.id || (o.customerEmail && o.customerEmail.toLowerCase() === lowerEmail)
        );
        const userBookings = db.bookings.filter(
          (b) => b.customerId === authUser.id || b.customerEmail.toLowerCase() === lowerEmail
        );
        customerContext = JSON.stringify({
          customerName: authUser.fullName,
          orders: userOrders.map((o) => ({
            orderId: o.id,
            date: o.createdAt,
            total: `TSh ${o.total.toLocaleString()}`,
            paymentStatus: o.paymentStatus,
            deliveryStatus: o.deliveryStatus,
            items: o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
          })),
          serviceBookings: userBookings.map((b) => ({
            bookingRef: b.id,
            service: b.serviceName,
            date: b.bookingDate,
            time: b.bookingTime,
            status: b.status,
          })),
        });
      }

      const activePaymentMethods = Object.entries(db.settings.paymentSettings)
        .filter(([key, method]) => key !== 'customMethods' && method && (method as any).enabled)
        .map(([key, method]: [string, any]) => {
          if (key === 'bank') {
            return `Bank Transfer: ${method.bankName} - Account Name: ${method.accountName}, Account Number: ${method.accountNumber}`;
          }
          if (key === 'tigoPesa') {
            return `MIXX BY YAS: ${method.number}`;
          }
          return `${key.toUpperCase()}: ${method.number}`;
        })
        .join(' | ');

      const enabledInstructions = db.aiInstructions
        .filter((inst) => inst.enabled !== false)
        .map((inst, idx) => `${idx + 1}. [${inst.title}]: ${inst.instruction}`)
        .join('\n');

      const systemInstruction = `You are Obby Ai, the official intelligent customer support, services, and shopping assistant for OBBY TECH.

Business Information:
- Business Name: OBBY TECH (Always display exact name).
- Store Location: Dodoma, Tanzania
- Assistant Name: Obby Ai
- Contact Phone: ${db.settings.contactSettings.phone}
- WhatsApp: ${db.settings.contactSettings.whatsapp}
- Email: ${db.settings.contactSettings.email}
- Social Media: ${db.settings.contactSettings.socialMedia}
- About Obby Tech: ${db.settings.contactSettings.aboutText}

Available Payment Methods & Numbers:
${activePaymentMethods}

Delivery Policy:
- For customers outside Dodoma: Payment of TSh ${db.settings.deliverySettings.outsideDarFee.toLocaleString()} transport fee is required after placing order.
- For Dodoma customers: Local delivery arranged upon order submission.

REAL PRODUCT CATALOG (Use EXACT prices and stock! Never invent items):
${JSON.stringify(availableProducts, null, 2)}

OBBY TECH PROFESSIONAL SERVICES (Customers can book these in the "Services" category):
${JSON.stringify(availableServices, null, 2)}

AUTHENTICATED CUSTOMER RECORD (Only visible for the signed-in user):
${customerContext}

ADMIN CUSTOM AI INSTRUCTIONS (STRICTLY FOLLOW THESE):
${enabledInstructions || 'Follow standard helpful, accurate OBBY TECH customer service guidelines.'}

CRITICAL RULES:
1. Speak warmly, professionally, and concisely in English or Swahili depending on the customer's input language.
2. Only mention products, services, prices, stock, and payment numbers that exist above.
3. NEVER invent product prices, stock, or nonexistent items.
4. If a requested product or detail is not in the store database, state clearly: "I don't currently have that information. Please contact Obby Tech for assistance."
5. Help customers choose products, book OBBY TECH services (Mobile Phone Repair, Computer & Laptop Repair, Graphic Design, Business Advertising & Promotion, Technology Consultation & Digital Education), and check their own order/booking status.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || "I'm here to assist you with Obby Tech products and services. How can I help you today?";
      res.json({ reply });
    } catch (err) {
      console.error('Error calling Gemini API in Obby Ai:', err);
      res.json({
        reply: `I am currently updating store information. Please contact Obby Tech directly at ${db.settings.contactSettings.phone} or try again in a moment.`,
      });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OBBY TECH Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
