import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../components/DashboardLayout';
import UrlTable from '../components/UrlTable';
import { api, shortUrl } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const PAGE_SIZE = 5;

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [longUrl, setLongUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  async function loadUrls() {
    const data = await api('/api/myurls');
    setUrls(data);
  }

  useEffect(() => {
    loadUrls().catch((err) => setError(err.message));
  }, []);

  async function onCreate(event) {
    event.preventDefault();
    setError('');
    try {
      const body = { long_url: longUrl };
      if (alias.trim()) body.custom_alias = alias.trim();
      if (expiryMinutes.trim()) body.expires_in_minutes = Number(expiryMinutes);
      const data = await api('/api/url', { method: 'POST', body: JSON.stringify(body) });
      setCreated(data);
      setLongUrl('');
      setAlias('');
      setExpiryMinutes('');
      await loadUrls();
    } catch (err) {
      const suggestions = err?.payload?.suggestions ? ` Suggestions: ${err.payload.suggestions.join(', ')}` : '';
      setError(`${err.message}${suggestions}`);
    }
  }

  async function onDelete(id) {
    await api(`/api/url/${id}`, { method: 'DELETE' });
    await loadUrls();
  }

  async function onEdit(item) {
    const nextLong = window.prompt('New long URL', item.long_url);
    if (!nextLong) return;
    const nextAlias = window.prompt('New alias (optional)', item.short_code);
    await api(`/api/url/${item.id}`, { method: 'PUT', body: JSON.stringify({ long_url: nextLong, custom_alias: nextAlias || undefined }) });
    await loadUrls();
  }

  const filtered = useMemo(() => urls.filter((item) => `${item.short_code} ${item.long_url}`.toLowerCase().includes(search.toLowerCase())), [urls, search]);
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const createdCode = created?.code || created?.short_code || null;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <h2 className="mb-3 text-lg font-semibold text-white">Create URL</h2>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_180px_150px]" onSubmit={onCreate}>
            <Input value={longUrl} onChange={(event) => setLongUrl(event.target.value)} placeholder="https://example.com/long/path" required aria-label="Long URL" />
            <Input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Optional alias" aria-label="Alias" />
            <Input value={expiryMinutes} onChange={(event) => setExpiryMinutes(event.target.value)} placeholder="Expiry (minutes)" type="number" min="1" aria-label="Expiry minutes" />
            <Button type="submit">Generate</Button>
          </form>
          {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}

          {created && createdCode && (
            <div className="mt-4 grid gap-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 md:grid-cols-[1fr_140px]">
              <div>
                <p className="text-sm text-emerald-100">Created short URL</p>
                <p className="mt-1 text-base font-medium text-white">{shortUrl(createdCode)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(shortUrl(createdCode))}>Copy</Button>
                  <a href={shortUrl(createdCode)} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><ExternalLink className="mr-1 h-4 w-4" />Open</Button></a>
                </div>
                {created.expires_at && <p className="mt-2 text-xs text-emerald-100/80">Expires: {new Date(created.expires_at).toLocaleString()}</p>}
              </div>
              <div className="flex items-center justify-center rounded-xl bg-white p-3">
                <QrCode className="mr-2 h-4 w-4 text-slate-400" />
                <QRCodeSVG value={shortUrl(createdCode)} size={108} />
              </div>
            </div>
          )}
        </section>

        <UrlTable
          rows={rows}
          query={search}
          onQuery={(value) => { setSearch(value); setPage(1); }}
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </DashboardLayout>
  );
}
