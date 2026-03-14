import { useEffect, useState } from 'react';
import { Menu, X, Rocket, UserCircle2, KeyRound, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '#features' },
  { label: 'API', href: '#api' },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { auth, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 px-4 transition-all duration-300 ${scrolled ? 'pt-2' : 'pt-4'}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/20 px-4 transition-all duration-300 ${scrolled ? 'h-14 bg-slate-900/70 backdrop-blur-2xl' : 'h-16 bg-slate-900/45 backdrop-blur-xl'}`}>
        <Link to="/" className="flex items-center gap-2 text-white" aria-label="linkmint home">
          <Rocket className="h-5 w-5 text-fuchsia-300" />
          <span className="font-semibold tracking-wide">linkmint</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-200 md:flex">
          {links.map((link) => (
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href} className="hover:text-white">{link.label}</a>
            ) : (
              <Link key={link.label} to={link.href} className="hover:text-white">{link.label}</Link>
            )
          ))}
          {auth?.role === 'GAdmin' && <Link to="/all" className="hover:text-white">Admin</Link>}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!auth ? (
            <Button size="sm" onClick={openAuthModal}>Login</Button>
          ) : (
            <div className="relative">
              <button className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" onClick={() => setProfileOpen((v) => !v)} aria-label="Open profile menu">
                <UserCircle2 className="h-4 w-4" />
                {auth.email}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/20 bg-slate-900/95 p-3 shadow-xl">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="mb-2 text-sm text-white">{auth.email}</p>
                    <p className="text-xs text-slate-400">API Key</p>
                    <p className="truncate text-xs text-fuchsia-200">{auth.api_key}</p>
                    <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/20" onClick={logout}>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <button className="rounded-lg p-2 text-slate-200 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mx-auto mt-2 max-w-7xl rounded-2xl border border-white/20 bg-slate-900/90 p-4 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                link.href.startsWith('#') ? (
                  <a key={link.label} href={link.href} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)}>{link.label}</a>
                ) : (
                  <Link key={link.label} to={link.href} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10" onClick={() => setOpen(false)}>{link.label}</Link>
                )
              ))}
              {!auth ? (
                <button className="rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-white/10" onClick={() => { openAuthModal(); setOpen(false); }}>
                  Login
                </button>
              ) : (
                <>
                  <p className="rounded-lg px-3 py-2 text-xs text-slate-400">{auth.email}</p>
                  <p className="rounded-lg px-3 py-2 text-xs text-fuchsia-200"><KeyRound className="mr-1 inline h-3 w-3" />{auth.api_key}</p>
                  <button className="rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-white/10" onClick={logout}>Logout</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
