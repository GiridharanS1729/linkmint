import { Chrome } from 'lucide-react';
import { Button } from '../ui/button';

const GOOGLE_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '72506720950-ba7kuthias0sg58mkv9gosnsf6cc9apn.apps.googleusercontent.com'
).replace(/\s+/g, '');

function createNonce() {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return Array.from(arr).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default function GoogleLoginButton() {
  function handleGoogle() {
    const nonce = createNonce();
    const state = btoa(JSON.stringify({
      next: window.location.pathname + window.location.search,
      t: Date.now(),
    }));

    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
      state,
      prompt: 'select_account',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  return (
    <Button type="button" variant="secondary" className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100" onClick={handleGoogle}>
      <Chrome className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  );
}
