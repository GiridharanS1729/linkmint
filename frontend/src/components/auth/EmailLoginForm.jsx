import { useState } from 'react';
import { Mail, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function EmailLoginForm({ mode, onContinue, loading }) {
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  function submit(event) {
    event.preventDefault();
    onContinue({ email, adminPassword });
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

      <details className="rounded-xl border border-white/15 bg-white/5 p-3">
        <summary className="cursor-pointer text-xs text-slate-300">Admin login (email + password)</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-slate-400">Admin password (only for GAdmin credential)</label>
          <div className="relative">
            <Shield className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="password"
              className="pl-10"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
          </div>
        </div>
      </details>

      <Button className="w-full" disabled={loading}>
        {loading ? 'Please wait...' : mode === 'signup' ? 'Continue to Signup' : 'Continue to Login'}
      </Button>
    </form>
  );
}
