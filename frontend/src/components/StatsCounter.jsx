import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function useCount(target, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

function Stat({ label, value, suffix = '' }) {
  const count = useCount(value);
  return (
    <motion.div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <p className="text-4xl font-semibold text-white">{count.toLocaleString()}{suffix}</p>
      <p className="mt-2 text-sm text-slate-300">{label}</p>
    </motion.div>
  );
}

export default function StatsCounter({ stats }) {
  const totalUrls = Number(stats?.total_urls || 0);
  const totalClicks = Number(stats?.total_clicks || 0);
  const avgRedirect = Number(stats?.avg_redirect_speed_ms || 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20">
      <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-fuchsia-500/15 via-transparent to-blue-500/20 p-6 sm:p-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total URLs created" value={totalUrls} />
          <Stat label="Total clicks tracked" value={totalClicks} />
          <Stat label="Average redirect speed" value={avgRedirect} suffix="ms" />
        </div>
      </div>
    </section>
  );
}
