import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import GoogleLoginButton from './GoogleLoginButton';
import EmailLoginForm from './EmailLoginForm';
import OtpVerification from './OtpVerification';

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('entry');
  const [emailState, setEmailState] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onAuthSuccess(payload) {
    setSession(payload);
    closeAuthModal();
    setStep('entry');

    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    if (next) {
      navigate(next, { replace: true });
    }
  }

  async function handleEmailContinue({ email, authMethod, password, username }) {
    setLoading(true);
    setError('');
    setEmailState(email);

    try {
      if (authMethod === 'password') {
        if (!password?.trim()) {
          throw new Error('Password is required');
        }

        const endpoint = tab === 'signup' ? '/api/signup' : '/api/login';
        const body = { email, password };
        if (tab === 'signup' && username?.trim()) body.username = username.trim();
        const payload = await api(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        onAuthSuccess(payload);
        return;
      }

      await api('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp({ email, otp, mode }) {
    setLoading(true);
    setError('');

    try {
      const payload = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp, mode }),
      });
      onAuthSuccess(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setError('');

    try {
      await api('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email: emailState }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {authModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/85 px-4 py-10 backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(217,70,239,.25),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,.3),transparent_32%)]" />

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <button className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 hover:bg-white/10" onClick={closeAuthModal} aria-label="Close auth modal">
              <X className="h-4 w-4" />
            </button>

            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Secure authentication
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Welcome to linkvio</h2>
            <p className="mt-1 text-sm text-slate-300">Continue with Google or email OTP verification.</p>

            <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/15 bg-slate-900/40 p-1">
              <button onClick={() => setTab('login')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'login' ? 'bg-white/20 text-white' : 'text-slate-300'}`}>Login</button>
              <button onClick={() => setTab('signup')} className={`rounded-lg px-3 py-2 text-sm ${tab === 'signup' ? 'bg-white/20 text-white' : 'text-slate-300'}`}>Signup</button>
            </div>

            <div className="mt-4 space-y-3">
              {step === 'entry' ? (
                <>
                  <GoogleLoginButton />
                  <div className="relative py-1 text-center text-xs text-slate-400">
                    <span className="bg-transparent px-2">or continue with email</span>
                  </div>
                  <EmailLoginForm mode={tab} onContinue={handleEmailContinue} loading={loading} />
                </>
              ) : (
                <OtpVerification
                  email={emailState}
                  mode={tab}
                  onVerify={verifyOtp}
                  onResend={resendOtp}
                  loading={loading}
                />
              )}

              {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
