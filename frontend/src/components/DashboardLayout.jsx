import { Bell, KeyRound, LayoutDashboard, Link2, LogOut, Settings, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { useSiteConfig } from '../hooks/useSiteConfig';

const items = [
  { label: 'Create URL', icon: Link2, to: '/create' },
  { label: 'My URLs', icon: LayoutDashboard, to: '/dashboard#urls' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'API Docs', icon: LayoutDashboard, to: '/api/docs' },
  { label: 'API Key', icon: KeyRound, to: '/api-key' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export default function DashboardLayout({ title, children }) {
  const { auth, logout } = useAuth();
  const { siteConfig } = useSiteConfig();
  const location = useLocation();

  return (
    <div className="theme-bg min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <p className="mb-4 text-xl font-semibold text-white">{siteConfig.site_name}</p>
          <nav className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${location.pathname === item.to ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {auth?.role === 'GAdmin' && (
              <Link to="/all" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
                <LayoutDashboard className="h-4 w-4" />
                Admin Console
              </Link>
            )}
          </nav>
        </aside>

        <main>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <div className="flex items-center gap-2">
              <button aria-label="Notifications" className="rounded-xl border border-white/20 bg-white/10 p-2 text-slate-200"><Bell className="h-4 w-4" /></button>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-200">{auth?.username || auth?.email || 'Guest'}</div>
              <Button variant="secondary" size="sm" onClick={logout}><LogOut className="mr-1 h-4 w-4" />Logout</Button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
