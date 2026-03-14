import { useState } from 'react';
import Swal from 'sweetalert2';
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { shortUrl } from '../api';
import { formatDate, truncateUrl } from '../lib/utils';

export default function UrlTable({ rows, query, onQuery, page, totalPages, onPage, onEdit, onDelete }) {
  const [copiedId, setCopiedId] = useState(null);

  async function confirmDelete(id) {
    const result = await Swal.fire({
      title: 'Delete this URL?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#e11d48',
    });
    if (result.isConfirmed) {
      await onDelete(id);
      Swal.fire({
        title: 'Deleted',
        text: 'URL removed successfully.',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#e2e8f0',
      });
    }
  }

  function copyWithFeedback(id, code) {
    navigator.clipboard.writeText(shortUrl(code));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  return (
    <div id="urls" className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">My URLs</h2>
        <input
          className="h-10 w-full max-w-sm rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white placeholder:text-slate-400"
          placeholder="Search by short or long URL"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          aria-label="Search URLs"
        />
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm text-slate-200">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="pb-2">Short URL</th>
              <th className="pb-2">Original URL</th>
              <th className="pb-2">Clicks</th>
              <th className="pb-2">Expiry</th>
              <th className="pb-2">Created Date</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="py-3 font-medium text-fuchsia-200">{item.short_code}</td>
                <td className="py-3" title={item.long_url}>{truncateUrl(item.long_url, 56)}</td>
                <td className="py-3">{item.click_count}</td>
                <td className="py-3">{item.expires_at ? formatDate(item.expires_at) : 'Never'}</td>
                <td className="py-3">{formatDate(item.created_at)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg bg-white/10 p-2 hover:bg-white/20" onClick={() => onEdit(item)} aria-label="Edit URL"><Pencil className="h-4 w-4" /></button>
                    <button className="rounded-lg bg-white/10 p-2 hover:bg-white/20" onClick={() => confirmDelete(item.id)} aria-label="Delete URL"><Trash2 className="h-4 w-4" /></button>
                    <button className="rounded-lg bg-white/10 p-2 hover:bg-white/20" onClick={() => copyWithFeedback(item.id, item.short_code)} aria-label="Copy short URL">
                      {copiedId === item.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a className="rounded-lg bg-white/10 p-2 hover:bg-white/20" href={shortUrl(item.short_code)} target="_blank" rel="noreferrer" aria-label="Open short URL"><ExternalLink className="h-4 w-4" /></a>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-6 text-slate-400" colSpan={6}>No URLs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="rounded-lg border border-white/20 p-2 text-slate-200 disabled:opacity-40" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm text-slate-300">Page {page} of {totalPages}</span>
        <button className="rounded-lg border border-white/20 p-2 text-slate-200 disabled:opacity-40" disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

