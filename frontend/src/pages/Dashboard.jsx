import { useEffect, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import UrlTable from '../components/UrlTable';
import { api } from '../api';
import { Button } from '../components/ui/button';

const PAGE_SIZE = 5;

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  async function loadUrls() {
    const data = await api('/api/myurls');
    setUrls(data);
  }

  useEffect(() => {
    loadUrls().catch((err) => setError(err.message));
  }, []);

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

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Action</h2>
              <p className="text-sm text-slate-300">Create short URLs from dedicated builder page.</p>
            </div>
            <a href="/create"><Button><Link2 className="mr-2 h-4 w-4" />Create Short URL</Button></a>
          </div>
          {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}
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

