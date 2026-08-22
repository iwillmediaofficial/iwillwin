import React, { useEffect, useRef } from 'react';
import type { AllocatedPrizeData } from '@/types/database';
import { Button } from '@/components/common/Button';
import { Sparkles, Trophy, ExternalLink, Share2, CheckCircle } from 'lucide-react';
import { animatePrizeReveal } from '@/lib/gsap';
import { playWinCelebrationSound } from '@/lib/audio';
import { triggerConfettiBurst } from './CelebrationConfetti';

interface PrizeRevealCardProps {
  prize: AllocatedPrizeData | null;
  successMessage?: string;
  resultMessage?: string;
  ctaText?: string;
  ctaUrl?: string;
  isDuplicate?: boolean;
}

export const PrizeRevealCard: React.FC<PrizeRevealCardProps> = ({
  prize,
  successMessage = '🎉 CONGRATULATIONS!',
  resultMessage = 'Show this screen to our store / support team to claim your reward.',
  ctaText = 'CLAIM PRIZE',
  ctaUrl,
  isDuplicate = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prizeBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Play celebratory victory sound
    playWinCelebrationSound();

    // Trigger confetti burst
    triggerConfettiBurst();

    // GSAP prize reveal animation
    if (cardRef.current && prizeBoxRef.current) {
      animatePrizeReveal(cardRef.current, prizeBoxRef.current);
    }
  }, []);

  const handleCtaClick = () => {
    if (ctaUrl) {
      window.open(ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'I Won on IWILLWIN!',
          text: `I just won ${prize?.name || 'an exclusive prize'} on IWILLWIN Scratch & Win!`,
          url: window.location.href,
        });
      } catch {
        // Share cancelled or unavailable
      }
    }
  };

  return (
    <div
      ref={cardRef}
      className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-lg flex flex-col items-center text-center relative overflow-hidden"
    >
      {/* Background Radiance */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Duplicate notice if applicable */}
      {isDuplicate && (
        <div className="w-full mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 flex items-center justify-center space-x-1.5">
          <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>You have already scratched your card for this campaign.</span>
        </div>
      )}

      {/* Hero Badge */}
      <div className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black tracking-widest uppercase mb-3 shadow-glow-sm">
        <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
        <span>{successMessage}</span>
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
        YOU WON
      </p>

      {/* Prize Box with GSAP Animation */}
      <div
        ref={prizeBoxRef}
        className="w-full my-4 py-4 px-4 bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-400/30 rounded-2xl flex flex-col items-center justify-center shadow-lg"
      >
        {prize?.image_url ? (
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-amber-400/40 mb-3 shadow-md">
            <img
              src={prize.image_url}
              alt={prize.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-3">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-black text-gold-gradient font-display tracking-tight leading-tight">
          {prize ? prize.name : 'Exclusive Reward'}
        </h2>

        {prize?.description && (
          <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium max-w-xs">
            {prize.description}
          </p>
        )}
      </div>

      {/* Result instructions */}
      <p className="text-xs text-slate-400 max-w-xs mb-5 font-normal leading-relaxed">
        {resultMessage}
      </p>

      {/* Action Buttons */}
      <div className="w-full flex flex-col space-y-2.5">
        {ctaUrl ? (
          <Button
            onClick={handleCtaClick}
            variant="gold"
            size="xl"
            className="w-full font-black text-base shadow-glow-md"
            rightIcon={<ExternalLink className="w-4 h-4" />}
          >
            {ctaText}
          </Button>
        ) : null}

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button
            onClick={handleShare}
            variant="secondary"
            size="md"
            className="w-full text-xs font-bold"
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Share Your Win
          </Button>
        )}
      </div>

      {/* Bottom Footer */}
      <p className="text-[11px] text-slate-500 mt-5">
        Thank you for playing with <span className="text-amber-400 font-semibold">IWILLWIN</span>!
      </p>
    </div>
  );
};
