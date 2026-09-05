import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { Campaign, ParticipationResponse, AllocatedPrizeData } from '@/types/database';
import { getPublicCampaign, participateAndScratch, markScratchRevealed, supabase } from '@/lib/supabase';
import { CampaignHero } from '@/components/public/CampaignHero';
import { ParticipantForm } from '@/components/public/ParticipantForm';
import { ScratchCard } from '@/components/public/ScratchCard';
import { PrizeRevealCard } from '@/components/public/PrizeRevealCard';
import { CelebrationDecorations } from '@/components/public/CelebrationDecorations';
import { animatePageLoad, animateTransitionToScratch } from '@/lib/gsap';
import { Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

export const CampaignPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const activeSlug = slug || 'grand-launch';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Phase State: 'form' | 'scratch' | 'revealed'
  const [phase, setPhase] = useState<'form' | 'scratch' | 'revealed'>('form');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState<string | undefined>(undefined);
  const [playerMobile, setPlayerMobile] = useState<string | undefined>(undefined);
  const [playerName, setPlayerName] = useState<string | undefined>(undefined);
  const [allocatedPrize, setAllocatedPrize] = useState<AllocatedPrizeData | null>(null);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // GSAP Animation Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);
  const instaRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  const formWrapperRef = useRef<HTMLDivElement>(null);
  const scratchWrapperRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Campaign Data
  useEffect(() => {
    let isMounted = true;
    async function loadCampaign() {
      setLoading(true);
      setNotFound(false);

      let data = await getPublicCampaign(activeSlug);

      // Fallback: If slug not found, query any active campaign
      if (!data) {
        const { data: firstCamp } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'Active')
          .limit(1)
          .maybeSingle();

        if (firstCamp) {
          data = firstCamp as Campaign;
        }
      }

      if (isMounted) {
        if (data) {
          setCampaign(data);
          document.title = `${data.name} – IWILLWIN`;
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    }

    loadCampaign();
    return () => {
      isMounted = false;
    };
  }, [activeSlug]);

  // 2. Trigger GSAP Entrance Animation on load
  useEffect(() => {
    if (!loading && campaign && phase === 'form') {
      const timer = setTimeout(() => {
        animatePageLoad({
          logo: logoRef.current,
          badge: badgeRef.current,
          heading: headingRef.current,
          description: descRef.current,
          formFields: fieldRefs.current.filter(Boolean) as HTMLElement[],
          instagramCta: instaRef.current,
          submitButton: submitRef.current,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading, campaign, phase]);

  // 3. Handle Form Submission & Server RPC Call
  const handleFormSubmit = async (formData: {
    name: string;
    mobile: string;
    email: string;
    dob?: string;
  }) => {
    if (!campaign) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    setPlayerName(formData.name);

    const result: ParticipationResponse = await participateAndScratch({
      campaignSlug: campaign.slug,
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      dob: formData.dob,
    });

    setIsSubmitting(false);

    if (result.success && result.lead_id) {
      setLeadId(result.lead_id);
      setClaimCode(result.claim_code);
      setPlayerMobile(result.player_mobile || formData.mobile);
      setAllocatedPrize(result.prize || null);
      setIsDuplicate(false);

      // Smooth GSAP Transition from Form to Scratch Card
      animateTransitionToScratch(formWrapperRef.current, scratchWrapperRef.current, () => {
        setPhase('scratch');
      });
    } else if (result.code === 'DUPLICATE_MOBILE' || result.code === 'DUPLICATE_EMAIL') {
      // User has already played
      if (result.lead_id && result.prize) {
        setLeadId(result.lead_id);
        setClaimCode(result.claim_code);
        setPlayerMobile(result.player_mobile || formData.mobile);
        setAllocatedPrize(result.prize);
        setIsDuplicate(true);

        if (result.scratch_status === 'Revealed') {
          setPhase('revealed');
        } else {
          animateTransitionToScratch(formWrapperRef.current, scratchWrapperRef.current, () => {
            setPhase('scratch');
          });
        }
      } else {
        setSubmissionError(result.message || 'You have already participated in this campaign.');
      }
    } else {
      setSubmissionError(result.message || 'Unable to process your participation. Please try again.');
    }
  };

  // 4. Handle Scratch Reveal
  const handleScratchReveal = async () => {
    if (leadId) {
      markScratchRevealed(leadId);
    }
    setPhase('revealed');
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8faff] via-[#fffdf9] to-[#fffbeb] flex flex-col items-center justify-center p-4">
        <CelebrationDecorations />
        <div className="relative flex flex-col items-center space-y-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-8 h-8 text-amber-500 animate-spin-slow" />
          </div>
          <p className="text-sm font-bold text-slate-700 tracking-wide">
            Loading Campaign...
          </p>
        </div>
      </div>
    );
  }

  // Inactive or Not Found State
  if (notFound || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8faff] via-[#fffdf9] to-[#fffbeb] flex flex-col items-center justify-center p-4 text-center">
        <CelebrationDecorations />
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl flex flex-col items-center z-10">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Campaign Not Available</h1>
          <p className="text-sm text-slate-500 mb-2">
            This promotional campaign has either ended or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-b from-[#f8faff] via-[#fffdf9] to-[#fffbeb] text-slate-900 flex flex-col items-center justify-between relative overflow-x-hidden selection:bg-amber-400 selection:text-slate-950"
    >
      {/* Background Celebration Elements (Floating Gift Boxes, Pastel Glows, Confetti) */}
      <CelebrationDecorations />

      {/* Top Official IWILLWIN Brand Logo & Tagline */}
      <header className="w-full max-w-md px-4 pt-4 pb-1 flex flex-col items-center justify-center z-20 select-none">
        <img
          src="/logo.png"
          alt="IWILLWIN"
          className="h-12 sm:h-14 w-auto object-contain drop-shadow-sm"
          loading="eager"
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-[0.28em] text-[#1e293b] uppercase mt-1">
          PLAY MORE • WIN MORE
        </span>
      </header>

      {/* Main Campaign Container */}
      <main className="w-full max-w-md px-4 py-2 flex-1 flex flex-col items-center justify-center z-10">
        {/* Step 1: Form Phase */}
        {phase === 'form' && (
          <div ref={formWrapperRef} className="w-full flex flex-col items-center">
            <CampaignHero
              campaign={campaign}
              logoRef={logoRef}
              badgeRef={badgeRef}
              headingRef={headingRef}
              descRef={descRef}
            />

            {submissionError && (
              <div className="w-full max-w-sm sm:max-w-md mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center font-semibold animate-fadeIn shadow-sm">
                {submissionError}
              </div>
            )}

            <ParticipantForm
              campaign={campaign}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
              formRef={formRef}
              fieldRefs={fieldRefs}
              instaRef={instaRef}
              submitRef={submitRef}
            />
          </div>
        )}

        {/* Step 2: Scratch Interaction Phase */}
        {phase === 'scratch' && (
          <div ref={scratchWrapperRef} className="w-full animate-scaleUp">
            <ScratchCard
              prize={allocatedPrize}
              scratchTitle={campaign.scratch_title}
              onReveal={handleScratchReveal}
              isRevealed={false}
            />
          </div>
        )}

        {/* Step 3: Win Celebration & Claim Phase */}
        {phase === 'revealed' && (
          <div className="w-full animate-scaleUp">
            <PrizeRevealCard
              prize={allocatedPrize}
              claimCode={claimCode}
              playerMobile={playerMobile}
              playerName={playerName}
              whatsappNumber={campaign.whatsapp_claim_number}
              whatsappMessageTemplate={campaign.whatsapp_message_template}
              successMessage={campaign.success_message}
              resultMessage={campaign.result_message}
              ctaText={campaign.cta_text}
              ctaUrl={campaign.cta_url}
              isDuplicate={isDuplicate}
            />
          </div>
        )}
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
