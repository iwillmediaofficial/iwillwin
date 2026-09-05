import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import {
  Sparkles,
  MessageCircle,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const DEMO_WHATSAPP_NUMBER = '918129654111';
const DEMO_WHATSAPP_URL = `https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi IWILLWIN! I'd like to book a free demo for my brand."
)}`;

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* Background Decorative Ambient Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-amber-500/10 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-0 w-96 h-96 bg-pink-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-emerald-500/5 blur-[120px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="IWILLWIN"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        <div className="flex items-center space-x-3">
          <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <Button
              variant="whatsapp"
              size="sm"
              className="text-xs sm:text-sm font-bold shadow-glow-emerald"
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              <span>Book Free Demo</span>
            </Button>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16 flex flex-col items-center flex-1">
        {/* HERO SECTION */}
        <section className="w-full flex flex-col items-center text-center max-w-4xl pt-4 sm:pt-8 pb-12 sm:pb-20">
          {/* Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide mb-6 shadow-glow-sm animate-fadeIn">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Gamified Lead Generation & Brand Engagement Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display text-white tracking-tight leading-[1.15] mb-6">
            Turn Instagram Followers Into{' '}
            <span className="text-gold-gradient">Paying Customers</span> with Interactive Scratch Cards
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-8 sm:mb-10">
            Create high-converting, viral promotional campaigns. Engage your audience with instant
            win scratch games, grow verified social followers, and automate WhatsApp prize claims in minutes.
          </p>

          {/* Primary CTA Group */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href={DEMO_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="whatsapp"
                size="xl"
                className="w-full sm:w-auto font-black text-base shadow-glow-emerald px-8 py-4"
                leftIcon={<MessageCircle className="w-5 h-5 text-white" />}
                rightIcon={<ArrowRight className="w-4 h-4 text-white" />}
              >
                <span>Book a Free Live Demo</span>
              </Button>
            </a>

            <Link to="/c/grand-launch" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="xl"
                className="w-full sm:w-auto text-sm font-bold border-slate-700 hover:border-amber-400/40 px-6 py-4"
                leftIcon={<Trophy className="w-4 h-4 text-amber-400" />}
              >
                <span>Experience Sample Game</span>
              </Button>
            </Link>
          </div>

          {/* Social Proof Counters */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 pt-8 border-t border-slate-800/80 w-full max-w-2xl text-center">
            <div>
              <div className="text-xl sm:text-3xl font-black text-amber-300 font-display">10x</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                Higher Engagement
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black text-emerald-400 font-display">100%</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                Verified WhatsApp Leads
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black text-pink-400 font-display">300%+</div>
              <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                Viral Follower Growth
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES 3-COLUMN HIGHLIGHT */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
          <div className="p-6 sm:p-7 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">
                Instant Scratch & Win Excitement
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Realistic touch-scratch mechanics with genuine sound effects that trigger psychological anticipation and delight.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-amber-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Configurable Odds & Limits</span>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-xl hover:border-pink-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-5 group-hover:scale-110 transition-transform">
              <InstagramIcon className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">
                Mandatory Instagram Follow Gate
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Unlock the scratch card only after participants follow your official Instagram page, ensuring high viral account growth.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-pink-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Seamless App-Switch Follow</span>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col justify-between shadow-xl hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">
                Automated WhatsApp Prize Claims
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Winners get unique verification codes (`WIN-XXXXXXXX`) with 1-tap pre-filled WhatsApp messages to redeem with your team.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Direct Customer Relationship</span>
            </div>
          </div>
        </section>

        {/* BOOK FREE DEMO SECTION */}
        <section className="w-full mt-12 sm:mt-20">
          <div className="w-full bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            {/* Background Aura */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col text-center lg:text-left space-y-3 max-w-xl z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center lg:justify-start space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Custom Brand Solutions</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white font-display">
                Book a Free 1-on-1 Walkthrough
              </h2>
              <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
                Discover how IWILLWIN can be tailored for your festival promotions, grand store launches,
                e-commerce sales, and brand influencer campaigns.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3 z-10 w-full sm:w-auto">
              <a
                href={DEMO_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  variant="whatsapp"
                  size="xl"
                  className="w-full sm:w-auto font-black text-base shadow-glow-emerald px-8 py-4"
                  leftIcon={<MessageCircle className="w-5 h-5 text-white" />}
                >
                  <span>Chat with Us on WhatsApp</span>
                </Button>
              </a>
              <span className="text-[11px] text-slate-400 font-mono">
                Direct WhatsApp: <strong className="text-slate-200">+91 8129654111</strong>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80 z-10">
        <div className="flex items-center space-x-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>IWILLWIN – Enterprise Promotional Gaming Platform</span>
        </div>

        <div className="flex items-center space-x-4 text-slate-400">
          <a
            href={DEMO_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition-colors"
          >
            WhatsApp Support
          </a>
          <span>•</span>
          <span>© {new Date().getFullYear()} IWILLWIN. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};
