import React, { forwardRef } from 'react';
import type { Campaign } from '@/types/database';
import { Sparkles, Trophy } from 'lucide-react';

interface CampaignHeroProps {
  campaign: Campaign;
  logoRef?: React.RefObject<HTMLDivElement>;
  badgeRef?: React.RefObject<HTMLDivElement>;
  headingRef?: React.RefObject<HTMLHeadingElement>;
  descRef?: React.RefObject<HTMLParagraphElement>;
}

export const CampaignHero = forwardRef<HTMLDivElement, CampaignHeroProps>(
  ({ campaign, logoRef, badgeRef, headingRef, descRef }, ref) => {
    return (
      <div ref={ref} className="w-full text-center flex flex-col items-center pt-2 pb-6 px-4">
        {/* Campaign / Brand Logo */}
        <div ref={logoRef as any} className="relative mb-4 group">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-glow-md flex items-center justify-center overflow-hidden">
            {campaign.logo_url ? (
              <img
                src={campaign.logo_url}
                alt={campaign.name}
                className="w-full h-full object-cover rounded-xl bg-slate-900"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center text-amber-400">
                <Trophy className="w-9 h-9 animate-pulse" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-1 bg-amber-400 text-slate-950 rounded-full p-1 shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Campaign Badge */}
        <div ref={badgeRef as any} className="mb-3">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>OFFICIAL SCRATCH & WIN</span>
          </span>
        </div>

        {/* Campaign Title */}
        <h1
          ref={headingRef as any}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-display text-white max-w-md leading-tight mb-2.5"
        >
          <span className="text-gold-gradient">{campaign.name}</span>
        </h1>

        {/* Campaign Description */}
        {campaign.description && (
          <p
            ref={descRef as any}
            className="text-sm sm:text-base text-slate-300 max-w-sm sm:max-w-md leading-relaxed font-normal"
          >
            {campaign.description}
          </p>
        )}
      </div>
    );
  }
);

CampaignHero.displayName = 'CampaignHero';
