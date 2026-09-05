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
    // Split campaign name into brand prefix and "Scratch & Win" highlight
    const parseTitle = (title: string) => {
      const match = title.match(/^(.*?)(?:\s+(?:–|-|:)?\s*)?(scratch\s*(?:&|and)\s*win.*)$/i);
      if (match && match[1]?.trim() && match[2]?.trim()) {
        return {
          brand: match[1].trim(),
          highlight: match[2].trim(),
        };
      }
      return {
        brand: title,
        highlight: 'Scratch & Win',
      };
    };

    const { brand, highlight } = parseTitle(campaign.name);

    return (
      <div ref={ref} className="w-full text-center flex flex-col items-center pt-0 pb-4 px-2 relative z-10">
        {/* Campaign / Client Brand Logo with Radiating Celebration Rays */}
        <div ref={logoRef as any} className="relative mb-3 flex items-center justify-center">
          {/* Radiating Sunburst Celebration Dashes */}
          <div className="absolute -inset-6 pointer-events-none flex items-center justify-center">
            {/* Top Left Ray */}
            <span className="absolute -top-1 -left-4 w-5 h-1 bg-amber-400 rounded-full transform -rotate-45" />
            <span className="absolute -top-3 left-1 w-4 h-1 bg-amber-400 rounded-full transform -rotate-60" />
            {/* Top Right Ray */}
            <span className="absolute -top-1 -right-4 w-5 h-1 bg-amber-400 rounded-full transform rotate-45" />
            <span className="absolute -top-3 right-1 w-4 h-1 bg-amber-400 rounded-full transform rotate-60" />
            {/* Left Ray */}
            <span className="absolute top-1/2 -left-6 w-4 h-1 bg-amber-400 rounded-full transform -translate-y-1/2" />
            {/* Right Ray */}
            <span className="absolute top-1/2 -right-6 w-4 h-1 bg-amber-400 rounded-full transform -translate-y-1/2" />
            {/* Floating Blue Confetti */}
            <span className="absolute -top-4 -right-6 w-2.5 h-4 bg-blue-500 rounded-sm transform rotate-30 opacity-80" />
            <span className="absolute -bottom-2 -left-5 w-2.5 h-4 bg-blue-500 rounded-sm transform -rotate-30 opacity-80" />
          </div>

          {/* Logo Card Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-2 bg-white shadow-lg border-2 border-amber-300 ring-4 ring-amber-100 flex items-center justify-center overflow-hidden">
            {campaign.logo_url ? (
              <img
                src={campaign.logo_url}
                alt={campaign.name}
                className="w-full h-full object-contain rounded-xl"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-tr from-amber-50 to-amber-100 flex flex-col items-center justify-center text-amber-500">
                <Trophy className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        {/* Official Pill Badge */}
        <div ref={badgeRef as any} className="mb-2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-[#fef3c7] text-[#92400e] border border-[#fde68a] shadow-sm">
            OFFICIAL SCRATCH & WIN
          </span>
        </div>

        {/* Dual-Tone Campaign Title (Navy Brand + Red "Scratch & Win") */}
        <h1
          ref={headingRef as any}
          className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-[1.15] text-center max-w-sm sm:max-w-md mb-1"
        >
          <span className="text-[#0f172a] block">{brand}</span>
          <span className="text-[#dc2626] block">{highlight}</span>
        </h1>

        {/* Subtitle / Description */}
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
