import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, AlertCircle, X, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfile } from '../types';
import { auth, googleProvider, signInWithPopup, signInWithRedirect } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { ObbyTechLogoEmblem, ObbyTechWordmark } from './ObbyTechBrand';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: CustomerProfile, token: string) => void;
  title?: string;
  subtitle?: string;
  isModal?: boolean;
  websiteLogo?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'OBBY TECH',
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

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [needsOAuthRetry, setNeedsOAuthRetry] = useState(false);

  const tokenClientRef = useRef<any>(null);

  useEffect(() => {
    const initGoogleServices = () => {
      if (!window.google?.accounts?.oauth2 || tokenClientRef.current) return;

      const clientId =
        firebaseConfig.oAuthClientId ||
        '546440312673-d3nm3b57e644uh9jdclfpd59k9phuna3.apps.googleusercontent.com';

      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setIsLoading(false);
              if (tokenResponse.error === 'popup_closed_by_user') {
                setErrorMsg('Google sign-in was cancelled.');
              } else {
                setErrorMsg('Unable to complete Google OAuth sign-in. Please try again.');
              }
              return;
            }
            if (!tokenResponse?.access_token) {
              setIsLoading(false);
              setErrorMsg('No Google access token received.');
              return;
            }
            try {
              const authRes = await api.googleAuth({
                accessToken: tokenResponse.access_token,
              });
              onSuccess(authRes.user, authRes.token);
            } catch (e: any) {
              setErrorMsg(e.message || 'Unable to verify Google account.');
            } finally {
              setIsLoading(false);
            }
          },
          error_callback: () => {
            setIsLoading(false);
            setErrorMsg('Google popup was closed or blocked by your browser.');
          },
        });
      } catch (e) {
        console.warn('Google Identity Services setup note:', e);
      }
    };

    const existingScript = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.accounts) {
        initGoogleServices();
      } else {
        existingScript.addEventListener('load', initGoogleServices);
        return () => existingScript.removeEventListener('load', initGoogleServices);
      }
    } else {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogleServices;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Synchronous Google OAuth trigger (preserves user-click activation so browsers never block popup)
  const handleDirectGoogleOAuth = () => {
    setErrorMsg('');
    setInfoMsg('');
    if (tokenClientRef.current) {
      setIsLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      return;
    }

    if (window.google?.accounts?.oauth2) {
      const clientId =
        firebaseConfig.oAuthClientId ||
        '546440312673-d3nm3b57e644uh9jdclfpd59k9phuna3.apps.googleusercontent.com';
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            setIsLoading(false);
            setErrorMsg('Google sign-in was cancelled or failed.');
            return;
          }
          try {
            const authRes = await api.googleAuth({ accessToken: tokenResponse.access_token });
            onSuccess(authRes.user, authRes.token);
          } catch (e: any) {
            setErrorMsg(e.message || 'Unable to verify Google account.');
          } finally {
            setIsLoading(false);
          }
        },
        error_callback: () => {
          setIsLoading(false);
          setErrorMsg('Google sign-in popup was closed or blocked.');
        },
      });
      tokenClientRef.current = client;
      setIsLoading(true);
      client.requestAccessToken({ prompt: 'select_account' });
    } else {
      setErrorMsg('Google Sign-In service is still loading. Please allow popups and try again.');
    }
  };

  // Real Google Authentication Flow
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    setNeedsOAuthRetry(false);

    try {
      // 1. Primary: Firebase Google Auth Popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user || !user.email) {
        throw new Error('No email address provided by Google account.');
      }

      const idToken = await user.getIdToken();
      const authRes = await api.googleAuth({ idToken });

      onSuccess(authRes.user, authRes.token);
    } catch (err: any) {
      console.warn('Firebase signInWithPopup failed:', err?.code || err?.message || err);

      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/user-cancelled'
      ) {
        setIsLoading(false);
        setErrorMsg('Google sign-in was cancelled.');
        return;
      }

      // Inside an iframe (such as AI Studio preview), NEVER call signInWithRedirect (Google blocks iframes).
      // Instead, offer a clean synchronous OAuth popup button so the browser keeps user activation!
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (!isInIframe && err.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          // fall through to OAuth retry button
        }
      }

      setIsLoading(false);
      setNeedsOAuthRetry(true);
      if (err.code === 'auth/unauthorized-domain') {
        setInfoMsg(
          'Click "Sign in with Google Account (OAuth)" below to choose your Google email.'
        );
      } else {
        setInfoMsg(
          'Popup was interrupted. Click "Sign in with Google Account (OAuth)" below or sign in with Email & Password.'
        );
      }
    }
  };

  // Facebook Auth Click Handler
  const handleFacebookAuth = () => {
    setErrorMsg('');
    setInfoMsg('Facebook Authentication is currently unavailable. Please sign in using Google or Email.');
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
        });
        onSuccess(res.user, res.token);
      } else {
        const res = await api.emailLogin({ email, password });
        onSuccess(res.user, res.token);
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
        {/* Google Sign In */}
        <button
          type="button"
          onClick={needsOAuthRetry ? handleDirectGoogleOAuth : handleGoogleAuth}
          disabled={isLoading}
          className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition-all shadow-2xs active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
          ) : (
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
          )}
          <span>
            {isLoading
              ? 'Signing in with Google...'
              : needsOAuthRetry
              ? 'Sign in with Google Account (OAuth)'
              : 'Continue with Google'}
          </span>
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

      {/* Divider */}
      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Or with Email
        </span>
      </div>

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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1565C0] hover:bg-[#0d47a1] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
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
