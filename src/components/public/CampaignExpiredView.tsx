import React from 'react';
import type { Campaign } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { CelebrationDecorations } from '@/components/public/CelebrationDecorations';
import { Clock, ShieldCheck, Trophy, ExternalLink, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface CampaignExpiredViewProps {
  campaign: Campaign;
}

export const CampaignExpiredView: React.FC<CampaignExpiredViewProps> = ({ campaign }) => {
  // 1. Resolve brand logo & company name
  const brandLogo = campaign.logo_url || campaign.customer_logo_url || campaign.customer?.logo_url;
  
  // Cleanly extract brand name from campaign title or customer record
  const parseTitle = (title: string) => {
    const regex = /^(.*?)(?:\s+(?:–|-|:)?\s*)?(?:scratch\s*(?:&|and)\s*win.*)$/i;
    const match = title.match(regex);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
    return title;
  };

  const brandName = campaign.customer_name || campaign.customer?.company_name || parseTitle(campaign.name);

  // 2. Prepare WhatsApp Claim URL if phone number is provided
  const cleanWhatsappNumber = campaign.whatsapp_claim_number
    ? campaign.whatsapp_claim_number.replace(/[^0-9]/g, '')
    : null;

  const whatsappSupportUrl = cleanWhatsappNumber
    ? `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(
        `Hi ${brandName}! I participated in "${campaign.name}" before it ended and have a winning verification code to redeem.`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8faff] via-[#fffdf9] to-[#fffbeb] text-slate-900 flex flex-col items-center justify-between relative overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* Background Celebration Elements */}
      <CelebrationDecorations />

      {/* Top Official IWILLWIN Brand Logo & Tagline */}
      <header className="w-full max-w-md px-4 pt-6 pb-2 flex flex-col items-center justify-center z-20 select-none">
        <img
          src="/logo.png"
          alt="IWILLWIN"
          className="h-12 sm:h-15 w-auto object-contain drop-shadow-sm"
          loading="eager"
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-[0.26em] text-[#1e293b] uppercase mt-1">
          PLAY MORE • WIN MORE
        </span>
      </header>

      {/* Main Expired Content */}
      <main className="w-full max-w-md px-4 py-4 flex-1 flex flex-col items-center justify-center z-10">
        <div className="w-full bg-white border-2 border-amber-200/80 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden animate-fadeIn">
          {/* Subtle gold glow behind card */}
          <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-yellow-200/30 rounded-full blur-2xl pointer-events-none" />

          {/* Brand Logo with Festive Yellow Border & Rays */}
          <div className="relative mb-4 flex items-center justify-center">
            {/* Top-Left Rays */}
            <div className="absolute -top-1 -left-5 flex flex-col items-center space-y-1 transform -rotate-45 pointer-events-none">
              <span className="w-4 h-1 bg-[#facc15] rounded-full" />
              <span className="w-3.5 h-1 bg-[#facc15] rounded-full" />
            </div>

            {/* Top-Right Rays */}
            <div className="absolute -top-1 -right-5 flex flex-col items-center space-y-1 transform rotate-45 pointer-events-none">
              <span className="w-4 h-1 bg-[#facc15] rounded-full" />
              <span className="w-3.5 h-1 bg-[#facc15] rounded-full" />
            </div>

            {/* Side Dashes */}
            <span className="absolute top-1/2 -left-6 -translate-y-1/2 w-4 h-1.5 bg-[#facc15] rounded-full pointer-events-none" />
            <span className="absolute top-1/2 -right-6 -translate-y-1/2 w-4 h-1.5 bg-[#facc15] rounded-full pointer-events-none" />

            {/* Festive Ribbon Accents */}
            <div className="absolute -bottom-1 -left-6 w-3 h-5 bg-[#3b82f6] rounded-full transform -rotate-25 shadow-xs pointer-events-none" />
            <div className="absolute -bottom-1 -right-6 w-3 h-5 bg-[#3b82f6] rounded-full transform rotate-25 shadow-xs pointer-events-none" />

            {/* Logo Container */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#facc15] p-2 border-2 border-[#fef08a] shadow-lg flex items-center justify-center overflow-hidden">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="w-full h-full object-contain rounded-xl shadow-xs"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-amber-500 flex flex-col items-center justify-center text-white">
                  <Trophy className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>

          {/* Official Concluded Pill Badge */}
          <div className="mb-3">
            <span className="inline-flex items-center space-x-1.5 px-4 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a] shadow-xs">
              <Clock className="w-3.5 h-3.5 text-[#b45309] flex-shrink-0" />
              <span>CAMPAIGN CONCLUDED</span>
            </span>
          </div>

          {/* Campaign / Brand Heading */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug mb-1">
            {campaign.name}
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-4">
            by <span className="text-amber-600 font-bold">{brandName}</span>
          </p>

          {/* Expiration Notice Box */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 text-center">
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              This promotional scratch & win event officially concluded on:
            </p>
            <div className="mt-1.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 shadow-xs">
              <span>{formatDate(campaign.end_date)}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Thank you to all participants for your enthusiasm, participation, and overwhelming response!
            </p>
          </div>

          {/* Instagram Follow CTA (Keep Customer Connected) */}
          {campaign.instagram_url && (
            <div className="w-full mt-1 pt-4 border-t border-slate-100 flex flex-col items-center">
              <div className="flex items-center space-x-1 text-slate-600 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Stay Tuned For Upcoming Offers
                </span>
              </div>
              <a
                href={campaign.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <InstagramIcon className="w-5 h-5 flex-shrink-0" />
                <span>Follow {brandName} on Instagram</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-80 flex-shrink-0" />
              </a>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Follow our official page to be first to know when new rewards & contests go live!
              </p>
            </div>
          )}

          {/* Winner Assistance / Code Claim Info */}
          <div className="w-full mt-4 pt-4 border-t border-slate-100 flex flex-col items-center text-left bg-amber-50/50 rounded-2xl p-4 border border-amber-200/50">
            <div className="w-full flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-900">
                Already won before this campaign ended?
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
              Your Winning Verification Code remains valid for redemption according to the store's offer terms.
            </p>

            {whatsappSupportUrl && (
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white flex-shrink-0" />
                <span>Contact Store on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full max-w-md px-4 py-4 text-center text-xs text-slate-400 flex flex-col items-center space-y-1 z-10 select-none">
        <div className="flex items-center space-x-1.5 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Verified Promotional Game</span>
        </div>
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} IWILLWIN. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
