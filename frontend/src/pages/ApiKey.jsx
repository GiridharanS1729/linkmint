import { Copy, RotateCcw } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { api } from '../api';
import { useState } from 'react';

export default function ApiKeyPage() {
  const { auth, setSession } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    setLoading(true);
    setMessage('');
    try {
      const payload = await api('/api/me/apikey/regenerate', { method: 'POST' });
      setSession(payload);
      setMessage('API key regenerated successfully.');
    } catch (error) {
      setMessage(error.message || 'Failed to regenerate API key');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="API Key">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <p className="text-sm text-slate-400">Your API key</p>
        <p className="mt-2 break-all rounded-xl border border-white/15 bg-slate-900/60 p-3 font-mono text-sm text-fuchsia-200">{auth?.api_key || 'Not available'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(auth?.api_key || '')}><Copy className="mr-1 h-4 w-4" />Copy API key</Button>
          <Button variant="secondary" onClick={regenerate} disabled={loading}><RotateCcw className="mr-1 h-4 w-4" />Regenerate API key</Button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-200">{message}</p>}

        <div className="mt-6 rounded-xl border border-white/15 bg-slate-950/80 p-4">
          <p className="mb-2 text-sm font-medium text-white">Usage Example</p>
          <pre className="overflow-auto text-xs text-slate-300"><code>{`curl -X POST http://localhost:3000/api/url \\
  -H "Authorization: Bearer <JWT>" \\
  -H "X-API-Key: ${auth?.api_key || '<API_KEY>'}" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url":"https://example.com"}'`}</code></pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
