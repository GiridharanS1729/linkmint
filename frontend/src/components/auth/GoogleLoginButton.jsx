import { useEffect, useRef } from 'react';
import { Chrome } from 'lucide-react';
import { Button } from '../ui/button';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '72506720950-ba7kuthias0sg58mkv9gosnsf6cc9apn.apps.googleusercontent.com';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

export default function GoogleLoginButton({ onSuccess, onError }) {
  const readyRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    loadGoogleScript()
      .then(() => {
        if (!mounted) return;
        readyRef.current = true;
      })
      .catch((error) => {
        onError?.(error.message);
      });

    return () => {
      mounted = false;
    };
  }, [onError]);

  function handleGoogle() {
    if (!readyRef.current || !window.google?.accounts?.id) {
      onError?.('Google auth script not ready');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) onSuccess(response.credential);
          else onError?.('Google credential not provided');
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onError?.('Google sign-in was dismissed. Try again.');
        }
      });
    } catch (error) {
      onError?.(error.message || 'Google sign-in failed');
    }
  }

  return (
    <Button type="button" variant="secondary" className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100" onClick={handleGoogle}>
      <Chrome className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  );
}
