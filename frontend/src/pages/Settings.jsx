import DashboardLayout from '../components/DashboardLayout';

export default function Settings() {
  return (
    <DashboardLayout title="Settings">
      <div id="settings" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <h2 className="text-lg font-semibold text-white">Account settings</h2>
        <p className="mt-2 text-sm text-slate-300">Advanced profile and security controls can be layered here without changing current URL APIs.</p>
      </div>
    </DashboardLayout>
  );
}
