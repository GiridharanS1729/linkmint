import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-200">
      <h1 className="text-4xl font-semibold text-white">Page not found</h1>
      <p className="mt-2">The page you requested does not exist.</p>
      <Link to="/" className="mt-4 rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20">Go Home</Link>
    </div>
  );
}
