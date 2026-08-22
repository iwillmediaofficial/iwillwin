import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type { Campaign, ParticipationResponse, AllocatedPrizeData } from '@/types/database';
import { getPublicCampaign, participateAndScratch, markScratchRevealed, supabase } from '@/lib/supabase';
import { CampaignHero } from '@/components/public/CampaignHero';
import { ParticipantForm } from '@/components/public/ParticipantForm';
import { ScratchCard } from '@/components/public/ScratchCard';
import { PrizeRevealCard } from '@/components/public/PrizeRevealCard';
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
  const handleFormSubmit = async (formData: { name: string; mobile: string; email: string }) => {
    if (!campaign) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    const result: ParticipationResponse = await participateAndScratch({
      campaignSlug: campaign.slug,
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
    });

    setIsSubmitting(false);

    if (result.success && result.lead_id) {
      setLeadId(result.lead_id);
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-amber-400 animate-spin-slow" />
          </div>
          <p className="text-sm font-semibold text-amber-300 tracking-wide">
            Loading Campaign...
          </p>
        </div>
      </div>
    );
  }

  // Inactive or Not Found State
  if (notFound || !campaign) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Campaign Not Available</h1>
          <p className="text-sm text-slate-400 mb-2">
            This promotional campaign has either ended or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-slate-100 flex flex-col items-center justify-between relative overflow-x-hidden selection:bg-amber-400 selection:text-slate-950"
    >
      {/* Background Decorative Ambient Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-amber-500/10 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-pink-500/5 blur-[100px] pointer-events-none -z-10" />

      {/* Clean Top Header (No Sound / Admin Icons) */}
      <header className="w-full max-w-2xl px-4 py-3.5 flex items-center justify-center z-20">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-lg sm:text-xl tracking-wider font-display text-gold-gradient">
            IWILLWIN
          </span>
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-slate-800 text-amber-300 rounded-md border border-slate-700 font-semibold">
            PROMO
          </span>
        </div>
      </header>

      {/* Main Campaign Container */}
      <main className="w-full max-w-md px-4 py-4 flex-1 flex flex-col items-center justify-center">
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
              <div className="w-full max-w-sm sm:max-w-md mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center font-medium animate-fadeIn">
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
      <footer className="w-full max-w-md px-4 py-4 text-center text-xs text-slate-500 flex flex-col items-center space-y-1 z-10">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Promotional Game</span>
        </div>
        <p className="text-[11px] text-slate-600">
          © {new Date().getFullYear()} IWILLWIN. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
