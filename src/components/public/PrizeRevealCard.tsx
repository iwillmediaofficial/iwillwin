import React, { useEffect, useRef, useState } from 'react';
import type { AllocatedPrizeData } from '@/types/database';
import { Button } from '@/components/common/Button';
import {
  Sparkles,
  Trophy,
  ExternalLink,
  Share2,
  CheckCircle,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { animatePrizeReveal } from '@/lib/gsap';
import { playWinCelebrationSound } from '@/lib/audio';
import { triggerConfettiBurst } from './CelebrationConfetti';

interface PrizeRevealCardProps {
  prize: AllocatedPrizeData | null;
  claimCode?: string;
  playerMobile?: string;
  playerName?: string;
  whatsappNumber?: string | null;
  whatsappMessageTemplate?: string | null;
  successMessage?: string;
  resultMessage?: string;
  ctaText?: string;
  ctaUrl?: string;
  isDuplicate?: boolean;
}

const DEFAULT_MESSAGE_TEMPLATE = `Hi! I won *{prize}* on IWILLWIN! 🎉\nWinning Verification Code: *{code}*\nRegistered Mobile: *{mobile}*\nPlease guide me on how to claim my reward.`;

export const PrizeRevealCard: React.FC<PrizeRevealCardProps> = ({
  prize,
  claimCode,
  playerMobile,
  playerName,
  whatsappNumber,
  whatsappMessageTemplate,
  successMessage = '🎉 CONGRATULATIONS!',
  resultMessage = 'Show this card or click the button below to redeem with our team.',
  ctaText = 'Claim on WhatsApp',
  ctaUrl,
  isDuplicate = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prizeBoxRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Build automated WhatsApp Claim URL using custom template
  const getClaimUrl = () => {
    if (whatsappNumber && whatsappNumber.trim() !== '') {
      const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
      const prizeName = prize ? prize.name : 'Exclusive Reward';
      const codeStr = claimCode || 'WIN-VERIFIED';
      const phoneStr = playerMobile || 'Registered Number';
      const nameStr = playerName || 'Winner';

      let template = whatsappMessageTemplate?.trim() || DEFAULT_MESSAGE_TEMPLATE;

      // Ensure all escaped \n strings and real line breaks are converted to actual newlines
      template = template
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n');

      const formattedMsg = template
        .replace(/\{prize\}|\{\{prize\}\}|\{\{prize_name\}\}/gi, prizeName)
        .replace(/\{code\}|\{\{code\}\}|\{\{claim_code\}\}/gi, codeStr)
        .replace(/\{mobile\}|\{\{mobile\}\}|\{\{phone\}\}/gi, phoneStr)
        .replace(/\{name\}|\{\{name\}\}/gi, nameStr);

      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;
    }

    return ctaUrl || '';
  };

  const finalClaimUrl = getClaimUrl();
  const isWhatsAppClaim = Boolean(whatsappNumber && whatsappNumber.trim() !== '');

  const handleCtaClick = () => {
    if (finalClaimUrl) {
      window.open(finalClaimUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyCode = () => {
    if (claimCode) {
      navigator.clipboard.writeText(claimCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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

      <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">YOU WON</p>

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

      {/* Unique Winning Verification Code Card */}
      {claimCode && (
        <div className="w-full mb-4 p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 flex items-center justify-between shadow-inner">
          <div className="flex flex-col text-left pl-1">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Winning Verification Code</span>
            </span>
            <span className="font-mono font-black text-white text-base tracking-widest mt-0.5">
              {claimCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1 text-xs font-semibold"
            title="Copy Code"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Result instructions */}
      <p className="text-xs text-slate-400 max-w-xs mb-5 font-normal leading-relaxed">
        {resultMessage}
      </p>

      {/* Action Buttons */}
      <div className="w-full flex flex-col space-y-2.5">
        {finalClaimUrl ? (
          <Button
            onClick={handleCtaClick}
            variant={isWhatsAppClaim ? 'whatsapp' : 'gold'}
            size="xl"
            className="w-full font-black text-base shadow-glow-md flex items-center justify-center space-x-2"
            leftIcon={
              isWhatsAppClaim ? (
                <MessageCircle className="w-5 h-5 text-white" />
              ) : undefined
            }
            rightIcon={
              !isWhatsAppClaim ? <ExternalLink className="w-4 h-4" /> : undefined
            }
          >
            <span>{ctaText || (isWhatsAppClaim ? 'Claim on WhatsApp' : 'Claim Reward')}</span>
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
