import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { api } from '../api';

function groupByDay(clicks) {
  const map = new Map();
  clicks.forEach((click) => {
    const day = new Date(click.clickedAt).toLocaleDateString();
    map.set(day, (map.get(day) || 0) + 1);
  });
  return [...map.entries()].map(([day, count]) => ({ day, clicks: count }));
}

function topGroup(clicks, field, fallback = 'direct') {
  const map = new Map();
  clicks.forEach((click) => {
    const key = click[field] || fallback;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    async function load() {
      const myurls = await api('/api/myurls');
      const allClicks = [];
      for (const url of myurls) {
        const detail = await api(`/api/url/${url.id}/analytics`);
        detail.clicks.forEach((c) => allClicks.push(c));
      }
      setClicks(allClicks);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, []);

  const clickSeries = useMemo(() => groupByDay(clicks), [clicks]);
  const referrers = useMemo(() => topGroup(clicks, 'referrer'), [clicks]);
  const countries = useMemo(() => topGroup(clicks, 'country', 'Unknown'), [clicks]);
  const summary = useMemo(() => {
    const totalClicks = clicks.length;
    const activeUrls = new Set(clicks.map((item) => item.urlId)).size;
    const avgClicks = activeUrls ? (totalClicks / activeUrls).toFixed(1) : 0;
    return { totalClicks, activeUrls, avgClicks };
  }, [clicks]);

  return (
    <DashboardLayout title="Analytics">
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">Loading analytics...</div>
      ) : (
        <AnalyticsCharts
          clickSeries={clickSeries}
          referrers={referrers}
          countries={countries}
          summary={summary}
        />
      )}
    </DashboardLayout>
  );
}
