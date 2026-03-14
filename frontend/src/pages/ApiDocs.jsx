import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Globe, Lock } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';

function methodColor(method) {
  const m = String(method || '').toUpperCase();
  if (m === 'GET') return 'text-emerald-300';
  if (m === 'POST') return 'text-blue-300';
  if (m === 'PUT') return 'text-amber-300';
  if (m === 'DELETE') return 'text-rose-300';
  return 'text-slate-300';
}

function isPublic(auth) {
  return String(auth || '').toLowerCase().includes('public') || String(auth || '').toLowerCase().includes('guest');
}

export default function ApiDocsPage() {
  const [docs, setDocs] = useState({ role: 'user', endpoints: [] });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [openMap, setOpenMap] = useState({});

  useEffect(() => {
    api('/api/docs')
      .then(setDocs)
      .catch((err) => setError(err.message));
  }, []);

  const endpoints = useMemo(() => {
    return (docs.endpoints || []).filter((e) => `${e.method} ${e.path} ${e.auth} ${e.description}`.toLowerCase().includes(query.toLowerCase()));
  }, [docs.endpoints, query]);

  function toggle(key) {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <DashboardLayout title="API Docs">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Role: <span className="font-semibold text-white">{docs.role || 'user'}</span></p>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter APIs" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}

        <div className="grid gap-3">
          {endpoints.map((e) => {
            const key = `${e.method}:${e.path}`;
            const open = !!openMap[key];
            const pub = isPublic(e.auth);
            return (
              <article key={key} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                <button onClick={() => toggle(key)} className="flex w-full items-start justify-between gap-3 text-left" aria-label={`Toggle ${key}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${methodColor(e.method)}`}>{e.method}</p>
                    <p className="mt-1 break-all font-mono text-sm text-white">{e.path}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                      {pub ? <Globe className="h-3.5 w-3.5 text-emerald-300" /> : <Lock className="h-3.5 w-3.5 text-amber-300" />}
                      <span>{pub ? 'Public' : 'Private'}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{e.description}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2 text-slate-200">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                </button>

                {open && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="mb-2 text-xs text-slate-400">Sample Request</p>
                      <pre className="overflow-auto text-[11px] text-slate-200"><code>{JSON.stringify(e.sample?.request_body ?? { note: 'No sample' }, null, 2)}</code></pre>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="mb-2 text-xs text-slate-400">Sample Response</p>
                      <pre className="overflow-auto text-[11px] text-slate-200"><code>{JSON.stringify(e.sample?.response_body ?? { note: docs.role === 'GAdmin' ? 'No sample' : 'Visible for admin only' }, null, 2)}</code></pre>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </DashboardLayout>
  );
}

