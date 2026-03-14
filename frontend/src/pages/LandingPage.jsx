import { lazy, Suspense, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';

const FeaturesGrid = lazy(() => import('../components/FeaturesGrid'));
const StatsCounter = lazy(() => import('../components/StatsCounter'));
const DeveloperAPI = lazy(() => import('../components/DeveloperAPI'));
const PricingSection = lazy(() => import('../components/PricingSection'));
const Footer = lazy(() => import('../components/Footer'));

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      <Navbar />
      <HeroSection />
      <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-400/60 to-transparent" />
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading features...</div>}>
        <FeaturesGrid />
      </Suspense>
      <div className="h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      <Suspense fallback={<div className="py-20 text-center text-slate-300">Loading stats...</div>}>
        <StatsCounter />
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
