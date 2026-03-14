import { lazy, Suspense, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import { API_URL } from '../api';

const FeaturesGrid = lazy(() => import('../components/FeaturesGrid'));
const StatsCounter = lazy(() => import('../components/StatsCounter'));
const DeveloperAPI = lazy(() => import('../components/DeveloperAPI'));
const PricingSection = lazy(() => import('../components/PricingSection'));
const Footer = lazy(() => import('../components/Footer'));

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [stats, setStats] = useState({
    total_views: 0,
    total_urls: 0,
    total_clicks: 0,
    avg_redirect_speed_ms: 0,
  });
  useEffect(() => {
    const heroAnim = gsap.fromTo('.hero-headline span', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' });
    const cards = gsap.utils.toArray('.reveal-card');
    cards.forEach((card) => {
      gsap.fromTo(card, { y: 40, opacity: 0 }, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    return () => {
      heroAnim.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/public/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setStats(data);
      })
      .catch(() => {
        if (!active) return;
        setStats({
          total_views: 0,
          total_urls: 0,
          total_clicks: 0,
          avg_redirect_speed_ms: 0,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="theme-bg relative min-h-screen overflow-hidden">
      <Navbar />
      <div className="px-4 pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-slate-200 backdrop-blur">
            Total views: {(Number(stats?.total_views || 0)).toLocaleString()}
          </div>
        </div>
      </div>
      <HeroSection />
      <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading features...</div>}>
        <FeaturesGrid />
      </Suspense>
      <div className="h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading stats...</div>}>
        <StatsCounter stats={stats} />
      </Suspense>
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading API section...</div>}>
        <DeveloperAPI />
      </Suspense>
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading pricing...</div>}>
        <PricingSection />
      </Suspense>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
