import React, { useState, useEffect } from 'react';
import {
  User,
  Info,
  PhoneCall,
  Truck,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Save,
  Loader2,
  Bell,
  ChevronDown,
  Smartphone,
} from 'lucide-react';
import { AdminSettings, CustomerProfile } from '../types';
import { AuthModal } from './AuthModal';
import { api, isOfficialAdminEmail } from '../services/api';
import { OBBY_SOCIAL_LINKS, ObbyTechWordmark } from './ObbyTechBrand';

interface MyAppexViewProps {
  settings: AdminSettings;
  profile: CustomerProfile;
  onSaveProfile: (profile: CustomerProfile) => void;
  language: 'en' | 'sw';
  setLanguage: (lang: 'en' | 'sw') => void;
  onOpenAdmin: () => void;
  onSignOut?: () => void;
}

function formatWhatsAppTarget(rawNumber?: string): string {
  const digits = (rawNumber || '+255713340900').replace(/[^\d]/g, '');
  if (digits.startsWith('0') && digits.length >= 10) {
    return `255${digits.slice(1)}`;
  }
  return digits || '255713340900';
}

const ObbyTechProfileFooter: React.FC<{ settings: AdminSettings }> = ({ settings }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [appGuideTarget, setAppGuideTarget] = useState<'android' | 'ios' | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newsletterEmail.trim();
    if (!cleaned || !cleaned.includes('@')) {
      setNewsletterFeedback({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (!agreedTerms) {
      setNewsletterFeedback({
        type: 'error',
        text: 'Please accept the Obby Tech Terms of use and Privacy Policy.',
      });
      return;
    }
    setNewsletterFeedback({
      type: 'success',
      text: `Subscribed! Exclusive Obby Tech deals and updates will be sent to ${cleaned}.`,
    });
    setNewsletterEmail('');
  };

  const handleGetAppClick = async (platform: 'android' | 'ios') => {
    if (platform === 'android' && deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        setDeferredInstallPrompt(null);
        return;
      } catch {
        // Fall back to inline guide
      }
    }
    setAppGuideTarget((prev) => (prev === platform ? null : platform));
  };

  const phone = settings.contactSettings?.phone || '+255779594321';
  const whatsapp = settings.contactSettings?.whatsapp || '+255713340900';

  const accordionSections = [
    {
      id: 'service',
      title: 'Customer Service:::',
      content: (
        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Need help with an order, warranty, or device repair? Reach our Dodoma support desk from
            09:00 AM to 06:00 PM.
          </p>
          <p className="text-white font-semibold">
            Call: {phone} · WhatsApp: {whatsapp}
          </p>
        </div>
      ),
    },
    {
      id: 'about',
      title: 'About Obby Tech:::',
      content: (
        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p>
            {settings.contactSettings?.aboutText ||
              'Obby Tech Solutions is Dodoma’s trusted studio and store for smartphones, laptops, CCTV systems, accessories, device repairs, graphic design, video & photo shooting, and digital consultation.'}
          </p>
        </div>
      ),
    },
    {
      id: 'terms',
      title: 'Terms:::',
      content: (
        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p>
            All customer accounts, bookings, and orders are kept private and linked exclusively to
            your verified profile. Dodoma orders enjoy express delivery; outside-Dodoma orders
            incur the regional bus courier transport fee shown at checkout.
          </p>
        </div>
      ),
    },
    {
      id: 'help',
      title: 'Get Help:::',
      content: (
        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Use <strong>Orders</strong> to track deliveries and service bookings, or tap the{' '}
            <strong>Obby Ai</strong> button anytime for instant guidance on products, prices, and
            bookings.
          </p>
        </div>
      ),
    },
  ];

  return (
    <footer className="bg-[#050508] text-white rounded-2xl overflow-hidden border border-slate-800/80 shadow-xl mt-4">
      <div className="px-5 py-6 space-y-6">
        {/* Top Row: Official White Social Icons */}
        <div className="flex items-center gap-5">
          {/* Instagram */}
          <a
            href={OBBY_SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Obby Tech Instagram"
            title="Instagram @obby_tech"
            className="text-white hover:text-[#29C5F6] transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>

          {/* Facebook */}
          <a
            href={OBBY_SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Obby Tech Facebook"
            title="Facebook @obby_tech"
            className="text-white hover:text-[#29C5F6] transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>

          {/* TikTok */}
          <a
            href={OBBY_SOCIAL_LINKS.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Obby Tech TikTok"
            title="TikTok @obby_tech"
            className="text-white hover:text-[#24D164] transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.52-.04 2.87-1.12 3.13-2.61.12-.58.12-1.18.12-1.77V.02z" />
            </svg>
          </a>

          {/* YouTube */}
          <a
            href={OBBY_SOCIAL_LINKS.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Obby Tech YouTube"
            title="YouTube @obby_tech"
            className="text-white hover:text-[#29C5F6] transition-colors"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        {/* Subscribe & Deals Form */}
        <form onSubmit={handleSubscribe} className="space-y-3 text-center">
          <div className="space-y-1">
            <h3 className="text-[17px] sm:text-lg font-extrabold tracking-tight text-white">
              Subscribe now and get Obby Tech updates!
            </h3>
            <p className="text-xs text-slate-300">
              Get the Latest Obby Tech News and Giveaways
            </p>
          </div>

          <div className="flex items-stretch max-w-md mx-auto rounded-lg overflow-hidden border border-white/25 bg-white">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => {
                setNewsletterEmail(e.target.value);
                if (newsletterFeedback) setNewsletterFeedback(null);
              }}
              placeholder="Enter your email address"
              className="flex-1 bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-[13px] px-3.5 py-2.5 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Subscribe for Obby Tech updates"
              className="bg-[#0C0826] hover:bg-slate-900 text-white px-4 flex items-center justify-center border-l border-white/15 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#29C5F6]" />
            </button>
          </div>

          <label className="flex items-start gap-2.5 text-left max-w-md mx-auto text-[11px] text-slate-300 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setAgreedTerms((prev) => !prev)}
              aria-pressed={agreedTerms}
              className={`w-4 h-4 mt-0.5 rounded-full border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                agreedTerms
                  ? 'bg-[#24D164] border-[#24D164] text-[#050508]'
                  : 'bg-white border-white/80'
              }`}
            >
              {agreedTerms && <span className="w-1.5 h-1.5 rounded-full bg-[#050508]" />}
            </button>
            <span className="leading-snug">
              I have read and agree to the Obby Tech{' '}
              <button
                type="button"
                onClick={() => setOpenAccordion('terms')}
                className="underline text-white hover:text-[#29C5F6] cursor-pointer"
              >
                Terms of use
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setOpenAccordion('terms')}
                className="underline text-white hover:text-[#29C5F6] cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>

          {newsletterFeedback && (
            <div
              className={`max-w-md mx-auto text-[11.5px] font-semibold px-3 py-2 rounded-lg ${
                newsletterFeedback.type === 'success'
                  ? 'bg-[#24D164]/15 text-[#24D164] border border-[#24D164]/30'
                  : 'bg-red-500/15 text-red-300 border border-red-400/30'
              }`}
            >
              {newsletterFeedback.text}
            </div>
          )}
        </form>

        {/* Expandable Accordion Links (:::) */}
        <div className="divide-y divide-white/10 border-t border-b border-white/10">
          {accordionSections.map((sec) => {
            const isExpanded = openAccordion === sec.id;
            return (
              <div key={sec.id}>
                <button
                  type="button"
                  onClick={() => setOpenAccordion(isExpanded ? null : sec.id)}
                  className="w-full py-3.5 flex items-center justify-between text-left text-[13.5px] font-bold text-white hover:text-[#29C5F6] transition-colors cursor-pointer"
                >
                  <span>{sec.title}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-white/80 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-[#29C5F6]' : ''
                    }`}
                  />
                </button>
                {isExpanded && <div className="pb-3.5 pr-2 animate-fade-in">{sec.content}</div>}
              </div>
            );
          })}
        </div>

        {/* Get Obby Tech App Section */}
        <div className="text-center space-y-3 pt-1">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Get Obby Tech App
            </h3>
            <p className="text-xs text-slate-300">
              Get access to app exclusive offer!
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* Google Play Badge */}
            <button
              type="button"
              onClick={() => handleGetAppClick('android')}
              className="inline-flex items-center gap-2.5 bg-black hover:bg-slate-900 border border-white/45 rounded-lg px-3.5 py-2 text-left transition-colors cursor-pointer min-w-[144px]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#00E5FF" d="M3.2 2.3C3 2.5 2.9 2.9 2.9 3.4v17.2c0 .5.1.9.3 1.1l.1.1 9.6-9.6v-.2L3.3 2.2l-.1.1z" />
                <path fill="#00E676" d="M16.1 15.4l-3.2-3.2v-.4l3.2-3.2.1.1 3.8 2.2c1.1.6 1.1 1.6 0 2.2l-3.8 2.2-.1.1z" />
                <path fill="#FF3D00" d="M16.2 15.3L12.9 12 3.2 21.7c.4.4 1 .4 1.7 0l11.3-6.4z" />
                <path fill="#FFC400" d="M16.2 8.7L4.9 2.3C4.2 1.9 3.6 1.9 3.2 2.3L12.9 12l3.3-3.3z" />
              </svg>
              <div className="leading-none">
                <div className="text-[8.5px] uppercase tracking-wider text-slate-300 font-semibold">
                  GET IT ON
                </div>
                <div className="text-[13px] font-bold text-white mt-0.5">Google Play</div>
              </div>
            </button>

            {/* App Store Badge */}
            <button
              type="button"
              onClick={() => handleGetAppClick('ios')}
              className="inline-flex items-center gap-2.5 bg-black hover:bg-slate-900 border border-white/45 rounded-lg px-3.5 py-2 text-left transition-colors cursor-pointer min-w-[144px]"
            >
              <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3z" />
              </svg>
              <div className="leading-none">
                <div className="text-[8.5px] tracking-wide text-slate-300 font-semibold">
                  Download on the
                </div>
                <div className="text-[13px] font-bold text-white mt-0.5">App Store</div>
              </div>
            </button>
          </div>

          {appGuideTarget && (
            <div className="max-w-md mx-auto bg-[#0C0826] border border-[#29C5F6]/40 rounded-xl p-3 text-left text-[11.5px] text-slate-200 flex items-start gap-2.5 animate-fade-in">
              <Smartphone className="w-4 h-4 text-[#29C5F6] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-white">
                  {appGuideTarget === 'android'
                    ? 'Install Obby Tech App on Android'
                    : 'Install Obby Tech App on iPhone / iPad'}
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {appGuideTarget === 'android'
                    ? 'Open Chrome browser menu (⋮) and tap "Install app" or "Add to Home screen" for instant one-tap access.'
                    : 'Tap the Share icon in Safari and choose "Add to Home Screen" to use Obby Tech like a native iOS app.'}
                </p>
              </div>
            </div>
          )}

          {/* Centered Official Wordmark Logo & Copyright */}
          <div className="pt-4 space-y-2 flex flex-col items-center">
            <ObbyTechWordmark variant="dark" size="lg" />
            <p className="text-[11px] text-slate-400">
              © 2026 OBBY TECH SOLUTIONS Copyright.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const MyAppexView: React.FC<MyAppexViewProps> = ({
  settings,
  profile,
  onSaveProfile,
  onOpenAdmin,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState<'info' | 'about' | 'contact' | 'delivery'>('info');
  const [formData, setFormData] = useState<CustomerProfile>(profile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState('');

  // Sync profile prop to local state when updated
  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const isAuthenticated = Boolean(profile && profile.id && profile.email);

  const handleAuthSuccess = (user: CustomerProfile) => {
    onSaveProfile(user);
    setFormData(user);
  };

  const handleUpdatePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSavedMsg('');
    try {
      const res = await api.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        region: formData.region,
        street: formData.street,
      });
      onSaveProfile(res.user);
      setFormData(res.user);
      setProfileSavedMsg('Profile saved securely!');
      setTimeout(() => setProfileSavedMsg(''), 2500);
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.logout();
    } catch {
      // ignore network error during logout
    }
    if (onSignOut) {
      onSignOut();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#F2F6FC] min-h-[85vh] pb-24 p-3 max-w-md mx-auto space-y-4 animate-fade-in">
        <AuthModal
          isOpen={true}
          isModal={false}
          title="obby tech"
          subtitle="Sign in or create an account to manage your orders, bookings & profile"
          websiteLogo={settings.websiteLogo}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  const contactPhone = settings.contactSettings?.phone || '+255779594321';
  const contactWhatsapp = settings.contactSettings?.whatsapp || '+255713340900';
  const whatsappLink = `https://wa.me/${formatWhatsAppTarget(contactWhatsapp)}`;

  return (
    <div className="bg-[#F2F6FC] min-h-[85vh] pb-24 p-3 max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Account Profile Banner Header (Midnight Navy matching Obby Tech logo) */}
      <div className="bg-[#0C0826] text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={formData.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={formData.fullName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#29C5F6]/80 shadow-xs"
          />
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
              <span>{formData.fullName}</span>
              <CheckCircle2 className="w-4 h-4 text-[#24D164]" />
            </h1>
            <p className="text-[11px] text-slate-300 truncate max-w-[220px] sm:max-w-xs">{formData.email}</p>
            <span className="inline-block text-[10px] bg-white/10 text-[#24D164] px-2 py-0.5 rounded-md font-bold mt-0.5">
              {formData.role === 'admin' || isOfficialAdminEmail(formData.email)
                ? 'Obby Tech Administrator Account'
                : 'Obby Tech Customer Account'}
            </span>
          </div>
        </div>
      </div>

      {/* Authorized Administrator Dashboard Access */}
      {(formData.role === 'admin' || isOfficialAdminEmail(formData.email)) && (
        <div className="bg-[#0C0826] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-xs border border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#24D164]" />
            <div>
              <div className="text-xs font-black">Admin Management</div>
              <div className="text-[10px] text-slate-300">Authorized official administrator access</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="bg-[#24D164] hover:bg-[#1fb857] text-[#0C0826] font-black text-xs px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Open Dashboard
          </button>
        </div>
      )}

      {/* 4 Main Account Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('info')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'info'
              ? 'bg-[#0C0826] text-white border-[#0C0826] shadow-xs'
              : 'bg-white text-slate-700 border-[#DCE7F7] hover:bg-[#EAF2FF]/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="truncate">1. My Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('about')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'about'
              ? 'bg-[#0C0826] text-white border-[#0C0826] shadow-xs'
              : 'bg-white text-slate-700 border-[#DCE7F7] hover:bg-[#EAF2FF]/60'
          }`}
        >
          <Info className="w-4 h-4" />
          <span className="truncate">2. About Obby Tech</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('contact')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'contact'
              ? 'bg-[#0C0826] text-white border-[#0C0826] shadow-xs'
              : 'bg-white text-slate-700 border-[#DCE7F7] hover:bg-[#EAF2FF]/60'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span className="truncate">3. Contact Us</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('delivery')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'delivery'
              ? 'bg-[#0C0826] text-white border-[#0C0826] shadow-xs'
              : 'bg-white text-slate-700 border-[#DCE7F7] hover:bg-[#EAF2FF]/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span className="truncate">4. Delivery Info</span>
        </button>
      </div>

      {/* Dynamic Content Card */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCE7F7] space-y-4 shadow-2xs">
        {/* 1. My Information */}
        {activeSection === 'info' && (
          <form onSubmit={handleUpdatePersonalInfo} className="space-y-3">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              1. My Information
            </h2>
            {profileSavedMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold p-2.5 rounded-xl">
                {profileSavedMsg}
              </div>
            )}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C0826]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="text-xs font-black text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                  {formData.email}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 0713340900"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C0826]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    placeholder="Dodoma"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C0826]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 bg-[#0C0826] hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. About OBBY TECH */}
        {activeSection === 'about' && (
          <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              2. About OBBY TECH
            </h2>
            <p className="font-semibold text-gray-900">
              {settings.contactSettings?.aboutText ||
                'Obby Tech is a premier, trusted technology company operating in Dodoma, Tanzania.'}
            </p>
            <div className="bg-white p-3 rounded-xl border border-gray-200 font-medium space-y-1">
              <div className="font-bold text-[#24D164]">Core Products &amp; Services:</div>
              <div>📱 Phones (iPhone, Samsung, Tecno, Xiaomi, etc.)</div>
              <div>💻 PC &amp; Laptops (Lenovo, HP, Dell, Microsoft Surface)</div>
              <div>📹 CCTV Security Systems (Hikvision, Dahua)</div>
              <div>🔌 Chargers, Cables, Powerbanks &amp; Audio Accessories</div>
              <div>🛠️ Mobile &amp; Laptop Repairs, Graphic Design, Video &amp; Photo Shooting, Business Ads &amp; Tech Consultation</div>
            </div>
          </div>
        )}

        {/* 3. Contact Us */}
        {activeSection === 'contact' && (
          <div className="space-y-3 text-xs">
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              3. Contact Us
            </h2>
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-200 font-medium">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <span className="text-gray-500 block text-[11px] font-bold">Call:</span>
                  <span className="font-black text-gray-900 text-xs">{contactPhone}</span>
                </div>
                <a
                  href={`tel:${contactPhone}`}
                  className="bg-[#0C0826] hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#24D164]" />
                  Call Now
                </a>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <span className="text-gray-500 block text-[11px] font-bold">WhatsApp:</span>
                  <span className="font-black text-emerald-700 text-xs">{contactWhatsapp}</span>
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title={`WhatsApp ${contactWhatsapp}`}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.438-.516.078-1.188.109-1.906-.125-.438-.141-1-.328-1.719-.641-3.031-1.313-5-4.375-5.156-4.578-.156-.203-1.234-1.641-1.234-3.125s.781-2.219 1.063-2.516c.281-.297.609-.375.813-.375s.406 0 .578.016c.188.016.438-.078.688.531.25.609.859 2.094.938 2.25.078.156.125.344.016.547-.109.203-.156.328-.313.516-.156.188-.328.422-.469.563-.156.156-.313.328-.141.625.172.297.781 1.281 1.672 2.078 1.156 1.031 2.125 1.344 2.422 1.5.297.156.469.125.641-.078.172-.203.75-.875.953-1.172.203-.297.406-.25.672-.156.266.094 1.719.813 2.016.953.297.156.5.219.578.344.078.125.078.734-.172 1.438z" />
                  </svg>
                </a>
              </div>

              <div className="pt-2">
                <span className="text-gray-500 block text-[11px] font-extrabold uppercase tracking-wider mb-2">
                  Social Media
                </span>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-center gap-3">
                    <a
                      href={OBBY_SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2]/20 flex items-center justify-center shadow-2xs transition-colors"
                      title="Facebook @obby_tech"
                    >
                      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href={OBBY_SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-[#E4405F]/10 border border-[#E4405F]/20 hover:bg-[#E4405F]/20 flex items-center justify-center shadow-2xs transition-colors"
                      title="Instagram @obby_tech"
                    >
                      <svg className="w-5 h-5 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                    <a
                      href={OBBY_SOCIAL_LINKS.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-black/10 border border-black/20 hover:bg-black/20 flex items-center justify-center shadow-2xs transition-colors"
                      title="TikTok @obby_tech"
                    >
                      <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.52-.04 2.87-1.12 3.13-2.61.12-.58.12-1.18.12-1.77V.02z" />
                      </svg>
                    </a>
                    <a
                      href={OBBY_SOCIAL_LINKS.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-xl bg-[#FF0000]/10 border border-[#FF0000]/20 hover:bg-[#FF0000]/20 flex items-center justify-center shadow-2xs transition-colors"
                      title="YouTube @obby_tech"
                    >
                      <svg className="w-5 h-5 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  </div>
                  <div className="w-full text-center text-xs font-bold text-slate-900 pt-0.5">
                    @obby_tech
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Delivery Info */}
        {activeSection === 'delivery' && (
          <div className="space-y-3 text-xs text-gray-800">
            <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              DELIVERY INFORMATION
            </h2>

            <div className="space-y-2.5">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                <div className="font-black text-gray-900 flex items-center gap-1.5 text-xs">
                  <span className="text-sm">📍</span>
                  <span>DODOMA</span>
                </div>
                <p className="text-gray-600 font-medium text-[11px] pl-5">
                  Delivery usually takes 1–2 days.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                <div className="font-black text-gray-900 flex items-center gap-1.5 text-xs">
                  <span className="text-sm">📦</span>
                  <span>OUTSIDE DODOMA</span>
                </div>
                <p className="text-gray-600 font-medium text-[11px] pl-5">
                  Delivery to other regions usually takes 3–5 days.
                </p>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                <div className="font-black text-emerald-950 flex items-center gap-1.5 text-xs">
                  <span className="text-sm">💰</span>
                  <span>TRANSPORT FEE</span>
                </div>
                <p className="text-emerald-900 font-extrabold text-xs pl-5">
                  Customers outside Dodoma must pay TSh {(settings.deliverySettings?.outsideDarFee || 10000).toLocaleString()} for transportation after placing an order.
                </p>
                <div className="pt-1.5 border-t border-emerald-200/70 pl-5 text-[11px] space-y-1 text-emerald-800 font-medium leading-tight">
                  <p>• The TSh {(settings.deliverySettings?.outsideDarFee || 10000).toLocaleString()} transportation fee applies <span className="font-extrabold text-emerald-950 underline">ONLY</span> to customers outside Dodoma.</p>
                  <p>• Customers in Dodoma do <span className="font-extrabold text-emerald-950">NOT</span> pay the transportation fee.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Account Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-colors border border-red-200 shadow-2xs cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Account</span>
        </button>
      </div>

      {/* Sleek Dark Profile Details Footer: Socials, Subscribe, Accordion Links, Get Obby Tech App & Official Wordmark */}
      <ObbyTechProfileFooter settings={settings} />
    </div>
  );
};
