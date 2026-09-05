import React, { forwardRef } from 'react';
import type { Campaign } from '@/types/database';
import { Trophy } from 'lucide-react';

interface CampaignHeroProps {
  campaign: Campaign;
  logoRef?: React.RefObject<HTMLDivElement>;
  badgeRef?: React.RefObject<HTMLDivElement>;
  headingRef?: React.RefObject<HTMLHeadingElement>;
  descRef?: React.RefObject<HTMLParagraphElement>;
}

export const CampaignHero = forwardRef<HTMLDivElement, CampaignHeroProps>(
  ({ campaign, logoRef, badgeRef, headingRef, descRef }, ref) => {
    // Cleanly split campaign name into Brand Name and "Scratch & Win"
    const parseTitle = (title: string) => {
      // If title contains "scratch & win" or "scratch and win" (case insensitive)
      const regex = /^(.*?)(?:\s+(?:–|-|:)?\s*)?(?:scratch\s*(?:&|and)\s*win.*)$/i;
      const match = title.match(regex);
      if (match && match[1]?.trim()) {
        return {
          brand: match[1].trim(),
          highlight: 'Scratch & Win',
        };
      }
      return {
        brand: title,
        highlight: 'Scratch & Win',
      };
    };

    const { brand, highlight } = parseTitle(campaign.name);

    return (
      <div ref={ref} className="w-full text-center flex flex-col items-center pt-2 pb-5 px-2 relative z-10 select-none">
        {/* Campaign Brand Logo with Radiating Celebration Elements */}
        <div ref={logoRef as any} className="relative mb-3 flex items-center justify-center">
          {/* Confetti & Burst Rays Around Box (Precisely styled to match screenshot) */}
          {/* Top-Left Angled Rays */}
          <div className="absolute -top-1 -left-5 flex flex-col items-center space-y-1 transform -rotate-45 pointer-events-none">
            <span className="w-4 h-1 bg-[#facc15] rounded-full" />
            <span className="w-3.5 h-1 bg-[#facc15] rounded-full" />
          </div>

          {/* Top-Right Angled Rays */}
          <div className="absolute -top-1 -right-5 flex flex-col items-center space-y-1 transform rotate-45 pointer-events-none">
            <span className="w-4 h-1 bg-[#facc15] rounded-full" />
            <span className="w-3.5 h-1 bg-[#facc15] rounded-full" />
          </div>

          {/* Left Horizontal Dash */}
          <span className="absolute top-1/2 -left-6 -translate-y-1/2 w-4 h-1.5 bg-[#facc15] rounded-full pointer-events-none" />

          {/* Right Horizontal Dash */}
          <span className="absolute top-1/2 -right-6 -translate-y-1/2 w-4 h-1.5 bg-[#facc15] rounded-full pointer-events-none" />

          {/* Left Blue Curved Confetti Ribbon */}
          <div className="absolute -bottom-1 -left-6 w-3 h-5 bg-[#3b82f6] rounded-full transform -rotate-25 shadow-xs pointer-events-none" />

          {/* Right Blue Curved Confetti Ribbon */}
          <div className="absolute -bottom-1 -right-6 w-3 h-5 bg-[#3b82f6] rounded-full transform rotate-25 shadow-xs pointer-events-none" />

          {/* Yellow Bounded Logo Container (Matches Screenshot) */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#facc15] p-2 border-2 border-[#fef08a] shadow-lg flex items-center justify-center overflow-hidden">
            {campaign.logo_url ? (
              <img
                src={campaign.logo_url}
                alt={campaign.name}
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

        {/* Official Pill Badge */}
        <div ref={badgeRef as any} className="mb-2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a] shadow-xs">
            OFFICIAL SCRATCH & WIN
          </span>
        </div>

        {/* Dual-Tone Campaign Title: Navy Brand + Red "Scratch & Win" */}
        <h1
          ref={headingRef as any}
          className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-[1.12] text-center max-w-sm sm:max-w-md mb-1"
        >
          <span className="text-[#0f172a] block">{brand}</span>
          <span className="text-[#dc2626] block">{highlight}</span>
        </h1>

        {/* Subtitle */}
        <p
          ref={descRef as any}
          className="text-xs sm:text-sm text-slate-500 max-w-sm font-medium leading-relaxed"
        >
          {campaign.description || 'Scratch, win & claim your offer via WhatsApp.'}
        </p>
      </div>
    );
  }
);

CampaignHero.displayName = 'CampaignHero';
