import { Wrench } from 'lucide-react';
import { useSiteConfig } from '../hooks/useSiteConfig';

export default function Maintenance() {
  const { siteConfig } = useSiteConfig();

  return (
    <div className="theme-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/10 p-8 text-center text-slate-100 backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-white">{siteConfig.site_name} is under maintenance</h1>
        <p className="mt-3 text-sm text-slate-200">{siteConfig.maintenance_message}</p>
      </div>
    </div>
  );
}

