import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL, configureApiAuth } from '../api';

const AuthContext = createContext(null);

async function hmacSha256Hex(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    accessToken: null,
    user: null,
    loading: true,
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const applySession = useCallback((payload) => {
    setSession({
      accessToken: payload.access_token,
      user: payload.user,
      loading: false,
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession({ accessToken: null, user: null, loading: false });
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const payload = await response.json();
      applySession(payload);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applySession, clearSession]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const finishGoogleRedirect = useCallback(async () => {
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return false;

    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    if (!idToken) return false;

    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      applySession(payload);

      // Clear token hash from URL after successful login.
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return true;
    } catch {
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    finishGoogleRedirect().then((handled) => {
      if (handled) return;
      return refreshAuth();
    }).finally(() => {
      setSession((prev) => ({ ...prev, loading: false }));
    });
  }, [refreshAuth, finishGoogleRedirect]);

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => session.accessToken,
      getApiKey: () => session.user?.api_key || null,
      refreshAuth,
      onUnauthorized: () => {
        clearSession();
        setAuthModalOpen(true);
      },
      getAdminHeaders: async (path) => {
        if (session.user?.role !== 'GAdmin') return {};

        const key = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
        if (!key) return {};

        const timestamp = String(Date.now());
        const signature = await hmacSha256Hex(`${timestamp}${path}`, key);

        return {
          'X-Timestamp': timestamp,
          'X-Admin-Signature': signature,
          'X-API-Key': session.user.api_key,
        };
      },
    });
  }, [session.accessToken, session.user, refreshAuth, clearSession]);

  const value = useMemo(() => ({
    accessToken: session.accessToken,
    auth: session.user,
    loading: session.loading,
    setSession: applySession,
    clearSession,
    refreshAuth,
    logout,
    authModalOpen,
    openAuthModal: () => setAuthModalOpen(true),
    closeAuthModal: () => setAuthModalOpen(false),
  }), [session, applySession, clearSession, refreshAuth, logout, authModalOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
