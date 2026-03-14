import { Check } from 'lucide-react';
import { Button } from './ui/button';

export default function PricingSection() {
  const items = [
    'Unlimited short links',
    'Custom aliases',
    'Real-time click analytics',
    'JWT + API key support',
    'Admin visibility for teams',
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-fuchsia-500/15 via-blue-500/10 to-pink-500/15 p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h3 className="text-3xl font-semibold text-white">Free tier, premium quality</h3>
            <p className="mt-3 text-slate-300">Start at no cost with full shortening capabilities. Upgrade path can be layered later without changing integrations.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-200">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/20 bg-slate-900/60 p-6">
            <p className="text-sm uppercase tracking-wide text-slate-300">Starter</p>
            <p className="mt-2 text-4xl font-semibold text-white">$0</p>
            <p className="text-sm text-slate-400">Perfect for individual builders and prototypes.</p>
            <a href="/signup"><Button className="mt-6 w-full">Get Started Free</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
}
