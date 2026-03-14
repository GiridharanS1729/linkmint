import { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function EmailLoginForm({ mode, onContinue, loading }) {
  const [email, setEmail] = useState('');
  const [authMethod, setAuthMethod] = useState('otp');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  function submit(event) {
    event.preventDefault();
    onContinue({ email, authMethod, password, username });
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className="block text-sm text-slate-300">Email</label>
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <Input
          type="email"
          className="pl-10"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 rounded-xl border border-white/15 bg-slate-900/40 p-1">
        <button
          type="button"
          onClick={() => setAuthMethod('otp')}
          className={`rounded-lg px-3 py-2 text-sm ${authMethod === 'otp' ? 'bg-white/20 text-white' : 'text-slate-300'}`}
        >
          Email OTP
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('password')}
          className={`rounded-lg px-3 py-2 text-sm ${authMethod === 'password' ? 'bg-white/20 text-white' : 'text-slate-300'}`}
        >
          Password
        </button>
      </div>

      {authMethod === 'password' && (
        <div className="space-y-2">
          {mode === 'signup' && (
            <>
              <label className="block text-xs text-slate-400">Username (optional)</label>
              <Input
                type="text"
                placeholder="yourname"
                value={username}
                maxLength={40}
                onChange={(event) => setUsername(event.target.value)}
              />
            </>
          )}
          <label className="block text-xs text-slate-400">Password</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="password"
              className="pl-10"
              placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Enter password'}
              value={password}
              minLength={mode === 'signup' ? 6 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required={authMethod === 'password'}
            />
          </div>
        </div>
      )}

      <Button className="w-full" disabled={loading}>
        {loading
          ? 'Please wait...'
          : authMethod === 'otp'
            ? 'Continue with OTP'
            : mode === 'signup'
              ? 'Signup with Password'
              : 'Login with Password'}
      </Button>
    </form>
  );
}
