import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle, X, Shield, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { api, setAuthToken } from '../services/api';
import {
  auth,
  googleProvider,
  setGooglePopupActive,
  signInWithPopup,
} from '../lib/firebase';
import {
  fetchUserProfileFromFirestore,
  upsertUserProfileInFirestore,
} from '../lib/firestoreStore';
import { CustomerProfile } from '../types';
import { ObbyTechLogoEmblem, ObbyTechWordmark } from './ObbyTechBrand';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: CustomerProfile, token: string, rememberMe?: boolean) => void;
  title?: string;
  subtitle?: string;
  isModal?: boolean;
  websiteLogo?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subtitle = 'Sign in or create an account to continue',
  isModal = true,
  websiteLogo,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  // Continue with Google — Real Firebase Auth Sign-In + Cloud Firestore Profile Sync
  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);
    setGooglePopupActive(true);

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      const authRes = await api.googleAuth({ idToken });
      setAuthToken(authRes.token, rememberMe);

      const existingCloudProfile = await fetchUserProfileFromFirestore().catch(() => null);
      const mergedProfile: CustomerProfile = existingCloudProfile
        ? {
            ...authRes.user,
            fullName: existingCloudProfile.fullName || authRes.user.fullName,
            phone: existingCloudProfile.phone || authRes.user.phone || '',
            region: existingCloudProfile.region || authRes.user.region || 'Dodoma',
            street: existingCloudProfile.street || authRes.user.street || '',
            address: existingCloudProfile.address || authRes.user.address || '',
            photo: existingCloudProfile.photo || authRes.user.photo || '',
          }
        : authRes.user;

      if (!existingCloudProfile) {
        await upsertUserProfileInFirestore(mergedProfile).catch(() => {});
      }

      onSuccess(mergedProfile, authRes.token, rememberMe);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User dismissed Google popup
      } else if (
        err?.code === 'auth/unauthorized-domain' ||
        String(err?.message || '').includes('unauthorized-domain')
      ) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorMsg(
          `Domain "${host}" is not yet authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.`
        );
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setErrorMsg(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGooglePopupActive(false);
      setIsLoading(false);
    }
  };

  // Facebook Auth Click Handler
  const handleFacebookAuth = () => {
    setErrorMsg('');
    setInfoMsg('Facebook Authentication is currently unavailable. Please sign in using Email & Password below.');
  };

  // Email Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.emailRegister({
          email,
          password,
          fullName: fullName || email.split('@')[0],
          rememberMe,
        });
        onSuccess(res.user, res.token, rememberMe);
      } else {
        const res = await api.emailLogin({ email, password, rememberMe });
        onSuccess(res.user, res.token, rememberMe);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xl space-y-4 max-w-md w-full mx-auto relative animate-fade-in">
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header Banner */}
      <div className="w-full flex flex-col items-center justify-center text-center space-y-2 pt-1">
        <ObbyTechLogoEmblem customLogoUrl={websiteLogo} size="md" />
        <ObbyTechWordmark variant="light" size="md" />
        <p className="text-xs text-slate-500 font-medium text-center w-full">{subtitle}</p>
      </div>

      {/* Error & Info Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {infoMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{infoMsg}</div>
        </div>
      )}

      {/* Auth Provider Buttons */}
      <div className="space-y-2.5">
        {/* Google Sign In — Real Firebase Auth */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Facebook Sign In */}
        <button
          type="button"
          onClick={handleFacebookAuth}
          disabled={isLoading}
          className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Continue with Facebook</span>
        </button>
      </div>

      {/* Subtle Clean Divider */}
      <div className="border-t border-slate-200/80 my-1" />

      {/* Mode Switch Tabs */}
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg('');
          }}
          className={`py-1.5 rounded-lg transition-all cursor-pointer ${
            mode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setErrorMsg('');
          }}
          className={`py-1.5 rounded-lg transition-all cursor-pointer ${
            mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleEmailSubmit} className="space-y-2.5 pt-1">
        {mode === 'register' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required={mode === 'register'}
                placeholder="Obby IT Masters"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              placeholder="customer@obbytech.co.tz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword((prev) => !prev);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirmPassword((prev) => !prev);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>
        )}

        {/* Remember Me Tick Checkbox — Neatly Aligned for Both Create Account & Sign In */}
        <div className="pt-1">
          <label className="flex items-center gap-2.5 bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-3 py-2.5 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                rememberMe
                  ? 'bg-[#1565C0] border-[#1565C0] text-white shadow-2xs'
                  : 'bg-white border-slate-300 text-transparent'
              }`}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <div className="flex-1 min-w-0 leading-tight">
              <span className="block text-[11.5px] font-bold text-slate-800">
                Remember me
              </span>
              <span className="block text-[10px] text-slate-500">
                Keep my account signed in automatically on this device
              </span>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1565C0] hover:bg-[#0d47a1] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-1 disabled:opacity-50 cursor-pointer"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {isLoading
              ? mode === 'register'
                ? 'Creating Account...'
                : 'Signing In...'
              : mode === 'register'
              ? 'Create Account'
              : 'Sign In'}
          </span>
        </button>
      </form>

      {/* Bottom Helpful Guidance Message */}
      <div className="pt-2 border-t border-slate-100 text-center">
        <p className="text-[11.5px] text-slate-600 leading-relaxed">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg('');
            }}
            className="font-bold text-[#1565C0] hover:underline cursor-pointer"
          >
            Sign in
          </button>{' '}
          to continue. If this is your first time here, please{' '}
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className="font-bold text-[#1565C0] hover:underline cursor-pointer"
          >
            create an account
          </button>{' '}
          to get started.
        </p>
      </div>
    </div>
  );

  if (!isModal) {
    return modalContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      {modalContent}
    </div>
  );
};
