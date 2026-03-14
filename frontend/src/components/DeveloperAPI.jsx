import { Copy, Terminal } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

const snippet = `curl -X POST http://localhost:3000/api/url \\
  -H "Authorization: Bearer <JWT>" \\
  -H "X-API-Key: <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"long_url":"https://example.com","custom_alias":"mint1"}'`;

export default function DeveloperAPI() {
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section id="api" className="mx-auto max-w-7xl px-4 py-20">
      <div className="grid gap-6 rounded-3xl border border-white/15 bg-slate-900/60 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">
            <Terminal className="h-4 w-4" />
            Developer API
          </p>
          <h3 className="mt-4 text-3xl font-semibold text-white">Ship integrations in minutes</h3>
          <p className="mt-3 text-slate-300">Use the existing API to create, manage, and track URLs from any service.</p>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/15 bg-slate-950/80 p-3 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>POST /api/url</span>
            <Button variant="secondary" size="sm" onClick={copySnippet} aria-label="Copy curl snippet">
              <Copy className="mr-1 h-4 w-4" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-200 sm:text-xs sm:leading-6"><code>{snippet}</code></pre>
        </div>
      </div>
    </section>
  );
}
