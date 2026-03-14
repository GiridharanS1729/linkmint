import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

function minutesFromPreset(unit, amount) {
  const n = Number(amount || 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'days') return n * 24 * 60;
  if (unit === 'weeks') return n * 7 * 24 * 60;
  if (unit === 'months') return n * 30 * 24 * 60;
  return null;
}

export default function CreateUrlPage() {
  const [longUrl, setLongUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiryMode, setExpiryMode] = useState('none');
  const [specificExpiry, setSpecificExpiry] = useState('');
  const [durationUnit, setDurationUnit] = useState('days');
  const [durationValue, setDurationValue] = useState('1');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const finalUrl = useMemo(() => {
    if (!result) return '';
    return result.url || '';
  }, [result]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const payload = { long_url: longUrl };
      if (alias.trim()) payload.custom_alias = alias.trim();

      if (expiryMode === 'specific' && specificExpiry) {
        payload.expires_at = new Date(specificExpiry).toISOString();
      } else if (expiryMode === 'duration') {
        const mins = minutesFromPreset(durationUnit, durationValue);
        if (!mins) {
          setError('Enter a valid duration value.');
          return;
        }
        payload.expires_in_minutes = mins;
      }

      const data = await api('/api/url', { method: 'POST', body: JSON.stringify(payload) });
      setResult(data);
    } catch (err) {
      const suggestions = err?.payload?.suggestions ? ` Suggestions: ${err.payload.suggestions.join(', ')}` : '';
      setError(`${err.message || 'Unable to create URL.'}${suggestions}`);
    }
  }

  function copyUrl() {
    if (!finalUrl) return;
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="theme-bg min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold text-white">Create Short URL</h1>
          <p className="mt-2 text-sm text-slate-300">Set custom alias and optional expiry time.</p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <Input value={longUrl} onChange={(e) => setLongUrl(e.target.value)} placeholder="https://example.com/very/long" required />
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Custom alias (optional)" />

            <div className="grid gap-2 sm:grid-cols-3">
              <select value={expiryMode} onChange={(e) => setExpiryMode(e.target.value)} className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white">
                <option value="none">No expiry</option>
                <option value="specific">Specific time</option>
                <option value="duration">Days/Weeks/Months</option>
              </select>

              {expiryMode === 'specific' && (
                <Input type="datetime-local" value={specificExpiry} onChange={(e) => setSpecificExpiry(e.target.value)} />
              )}

              {expiryMode === 'duration' && (
                <>
                  <Input type="number" min="1" value={durationValue} onChange={(e) => setDurationValue(e.target.value)} placeholder="Value" />
                  <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white">
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </>
              )}
            </div>

            <Button type="submit">Generate</Button>
          </form>

          {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}

          {result && finalUrl && (
            <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-medium text-emerald-100">Short URL created</p>
              <a href={finalUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-white underline">{finalUrl}</a>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" onClick={copyUrl}>
                  {copied ? <Check className="mr-1 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1 h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <a href={finalUrl} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="mr-1 h-4 w-4" />Open</Button></a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

