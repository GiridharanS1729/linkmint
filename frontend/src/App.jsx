import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthModal from './components/auth/AuthModal';
import { FullPageSkeleton } from './components/ui/skeleton';
import { API_URL } from './api';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const ApiKey = lazy(() => import('./pages/ApiKey'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function GoogleCallbackPage() {
  return <FullPageSkeleton />;
}

function Transition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function ProtectedRoute({ children, admin = false }) {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageSkeleton />;
  }

  if (!auth) {
    return <Navigate to={`/?auth=1&next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (admin && auth.role !== 'GAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const { openAuthModal, auth, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === '1') {
      openAuthModal();
    }
  }, [location.search, openAuthModal]);

  useEffect(() => {
    function applyTheme(theme) {
      const parse = (hex, fallback) => {
        const safe = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex) : fallback;
        return `${parseInt(safe.slice(1, 3), 16)}, ${parseInt(safe.slice(3, 5), 16)}, ${parseInt(safe.slice(5, 7), 16)}`;
      };
      const root = document.documentElement;
      root.style.setProperty('--ui-primary-rgb', parse(theme?.primary, '#d946ef'));
      root.style.setProperty('--ui-secondary-rgb', parse(theme?.secondary, '#3b82f6'));
    }

    fetch(`${API_URL}/api/public/theme`)
      .then((r) => r.json())
      .then(applyTheme)
      .catch(() => applyTheme({}));
  }, []);

  return (
    <>
      <Suspense fallback={<FullPageSkeleton />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname + location.search}>
            <Route path="/" element={<Transition><LandingPage /></Transition>} />
            <Route path="/login" element={<Navigate to="/?auth=1" replace />} />
            <Route path="/signup" element={<Navigate to="/?auth=1" replace />} />
            <Route path="/api/auth/google/callback" element={<Transition><GoogleCallbackPage /></Transition>} />
            <Route path="/dashboard" element={<ProtectedRoute><Transition><Dashboard /></Transition></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Transition><Analytics /></Transition></ProtectedRoute>} />
            <Route path="/api-key" element={<ProtectedRoute><Transition><ApiKey /></Transition></ProtectedRoute>} />
            <Route
              path="/api/docs"
              element={loading ? (
                <FullPageSkeleton />
              ) : auth ? (
                <ProtectedRoute><Transition><ApiDocs /></Transition></ProtectedRoute>
              ) : (
                <Transition><NotFound /></Transition>
              )}
            />
            <Route path="/settings" element={<ProtectedRoute><Transition><Settings /></Transition></ProtectedRoute>} />
            <Route path="/all" element={<ProtectedRoute admin><Transition><Admin /></Transition></ProtectedRoute>} />
            <Route path="*" element={<Transition><NotFound /></Transition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>

      <AuthModal />
    </>
  );
}
