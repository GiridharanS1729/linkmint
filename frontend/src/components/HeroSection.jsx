import { motion } from 'framer-motion';
import { ArrowRight, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { api, shortUrl } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/30"
          style={{
            width: `${(i % 4) + 4}px`,
            height: `${(i % 4) + 4}px`,
            left: `${(i * 11) % 100}%`,
            top: `${(i * 17) % 100}%`,
            animation: `float ${6 + (i % 6)}s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection() {
  const [longUrl, setLongUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function createShort(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { long_url: longUrl };
      if (alias.trim()) payload.custom_alias = alias.trim();
      const data = await api('/api/url', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(data);
    } catch (err) {
      const suggestions = err?.payload?.suggestions ? ` Suggestions: ${err.payload.suggestions.join(', ')}` : '';
      setError(`${err.message || 'Unable to create URL.'}${suggestions}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative isolate overflow-hidden px-4 pb-28 pt-36 sm:pt-40">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_20%,rgba(217,70,239,.32),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,.35),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(244,114,182,.28),transparent_35%)]" />
      <FloatingParticles />

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs text-fuchsia-100 backdrop-blur">
            Built for creators, teams, and APIs
          </p>
          <h1 className="hero-headline text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Mint beautiful short links with
            <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-blue-300 bg-clip-text text-transparent"> enterprise-grade speed.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-200 sm:text-lg">
            Linkvio combines instant redirects, secure APIs, and analytics in one polished URL platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/create"><Button>Create Short URL</Button></a>
            <a href="/dashboard"><Button variant="secondary">View Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button></a>
          </div>
        </motion.div>

        <Card id="shorten" className="border-white/25 bg-slate-900/50">
          <CardContent className="pt-6">
            <form className="space-y-3" onSubmit={createShort}>
              <Input value={longUrl} onChange={(event) => setLongUrl(event.target.value)} placeholder="Paste your long URL" aria-label="Long URL" required />
              <Input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Custom alias (optional)" aria-label="Custom alias" />
              <Button className="w-full" disabled={loading}>{loading ? 'Generating...' : 'Create Short URL'}</Button>
            </form>

            {error && <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}

            {result && (
              (() => {
                const code = result.code || result.short_code;
                const finalUrl = result.url || (code ? shortUrl(code) : '');
                if (!finalUrl) return null;
                return (
              <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <p className="font-medium">Short URL ready</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a href={finalUrl} target="_blank" rel="noreferrer" className="break-all underline">
                    {finalUrl}
                  </a>
                  <button className="rounded bg-white/20 p-2" onClick={() => navigator.clipboard.writeText(finalUrl)} aria-label="Copy short URL">
                    <Copy className="h-4 w-4" />
                  </button>
                  <a href={finalUrl} target="_blank" rel="noreferrer" className="rounded bg-white/20 p-2" aria-label="Open short URL">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
