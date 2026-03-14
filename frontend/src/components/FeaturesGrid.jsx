import { Shield, Gauge, BarChart3, Link2, Code2, UsersRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const items = [
  { icon: Gauge, title: 'Fast redirects under 100ms', text: 'Redis-cached lookups deliver near instant redirects for hot links.' },
  { icon: Shield, title: 'Secure API access', text: 'JWT + API key validation with origin checks and role restrictions.' },
  { icon: BarChart3, title: 'Analytics dashboard', text: 'Observe clicks, referrers, and countries with real-time trend visuals.' },
  { icon: Link2, title: 'Custom aliases', text: 'Create branded aliases and get smart alternatives when conflicts happen.' },
  { icon: Code2, title: 'Developer API', text: 'Integrate with simple REST endpoints and predictable JSON responses.' },
  { icon: UsersRound, title: 'Role-based management', text: 'Guest, user, admin, and GAdmin flows for controlled access.' },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Everything needed for modern link infrastructure</h2>
        <p className="mt-3 text-slate-300">Built for growth teams and product engineers who need reliability and style.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="reveal-card group border-white/15 bg-white/[0.06] transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/40 hover:bg-white/[0.12]">
            <CardHeader>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/50 to-blue-500/50">
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
