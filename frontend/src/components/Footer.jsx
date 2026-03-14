import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/15 bg-slate-950/70 px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="text-lg font-semibold text-white">linkmint</h4>
          <p className="mt-2 text-sm text-slate-300">Premium URL infrastructure with smooth analytics and secure API workflows.</p>
        </div>
        <div>
          <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Product</h5>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#api" className="hover:text-white">API docs</a></li>
            <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Company</h5>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a></li>
            <li><Link to="/login" className="hover:text-white">Login</Link></li>
            <li><Link to="/signup" className="hover:text-white">Signup</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Free Tier</h5>
          <p className="mt-3 text-sm text-slate-300">Start free with URL shortening, dashboard insights, and API access for personal projects.</p>
        </div>
      </div>
    </footer>
  );
}
