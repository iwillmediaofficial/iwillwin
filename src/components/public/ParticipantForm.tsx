import React, { useState, useEffect, useRef } from 'react';
import type { Campaign } from '@/types/database';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { User, Phone, Mail, CheckCircle2, Sparkles, ArrowDown } from 'lucide-react';
import { animateShake, animateCountdownDigit, animateButtonReady } from '@/lib/gsap';

interface ParticipantFormProps {
  campaign: Campaign;
  onSubmit: (data: { name: string; mobile: string; email: string }) => Promise<void>;
  isSubmitting: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  fieldRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  instaRef?: React.RefObject<HTMLDivElement>;
  submitRef?: React.RefObject<HTMLDivElement>;
}

export const ParticipantForm: React.FC<ParticipantFormProps> = ({
  campaign,
  onSubmit,
  isSubmitting,
  formRef,
  fieldRefs,
  instaRef,
  submitRef,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const [errors, setErrors] = useState<{ name?: string; mobile?: string; email?: string }>({});

  // Instagram Flow State
  const [instagramClicked, setInstagramClicked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActivated, setIsActivated] = useState(false);
  const [showReadyBadge, setShowReadyBadge] = useState(false);

  const countdownNumberRef = useRef<HTMLSpanElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Handle Instagram CTA click
  const handleInstagramClick = () => {
    if (campaign.instagram_url) {
      window.open(campaign.instagram_url, '_blank', 'noopener,noreferrer');
    }

    if (!isActivated && !instagramClicked) {
      setInstagramClicked(true);
      setCountdown(5);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      if (countdownNumberRef.current) {
        animateCountdownDigit(countdownNumberRef.current);
      }

      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setIsActivated(true);
      setShowReadyBadge(true);
      setCountdown(null);

      if (submitBtnRef.current) {
        animateButtonReady(submitBtnRef.current);
      }

      setTimeout(() => {
        setShowReadyBadge(false);
      }, 2000);
    }
  }, [countdown]);

  const validate = () => {
    const errs: { name?: string; mobile?: string; email?: string } = {};

    if (campaign.require_name && !name.trim()) {
      errs.name = 'Please enter your full name';
    }

    if (campaign.require_mobile) {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      if (!cleanMobile || cleanMobile.length < 10) {
        errs.mobile = 'Please enter a valid 10-digit mobile number';
      }
    }

    if (campaign.require_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isActivated) {
      if (formRef?.current) {
        animateShake(formRef.current);
      }
      return;
    }

    if (!validate()) {
      if (formRef?.current) {
        animateShake(formRef.current);
      }
      return;
    }

    await onSubmit({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
    });
  };

  return (
    <form
      ref={formRef as any}
      onSubmit={handleSubmit}
      className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md flex flex-col space-y-4"
    >
      {/* Form Fields */}
      {campaign.require_name && (
        <div
          ref={(el) => {
            if (fieldRefs?.current) fieldRefs.current[0] = el;
          }}
        >
          <Input
            label="Your Full Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            leftIcon={<User className="w-4 h-4 text-slate-400" />}
            required
            autoComplete="name"
          />
        </div>
      )}

      {campaign.require_mobile && (
        <div
          ref={(el) => {
            if (fieldRefs?.current) fieldRefs.current[1] = el;
          }}
        >
          <Input
            label="Mobile Number"
            type="tel"
            placeholder="e.g. 9876543210"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
            }}
            error={errors.mobile}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            required
            autoComplete="tel"
          />
        </div>
      )}

      {campaign.require_email && (
        <div
          ref={(el) => {
            if (fieldRefs?.current) fieldRefs.current[2] = el;
          }}
        >
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. rahul@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            required
            autoComplete="email"
          />
        </div>
      )}

      {/* Instagram Step */}
      <div
        ref={instaRef as any}
        className="pt-2 pb-1 border-t border-slate-800/80 flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <InstagramIcon className="w-4 h-4 text-pink-500" />
            <span>Step 2: Follow on Instagram</span>
          </span>
          {isActivated ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activated</span>
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-400/90">Required</span>
          )}
        </div>

        {/* Instagram Action Button */}
        <Button
          type="button"
          onClick={handleInstagramClick}
          variant={isActivated ? 'secondary' : 'instagram'}
          size="lg"
          className="w-full flex items-center justify-center space-x-2 font-bold shadow-glow-insta"
          leftIcon={<InstagramIcon className="w-5 h-5" />}
        >
          <span>{isActivated ? '✓ Following on Instagram' : 'Follow us on Instagram'}</span>
        </Button>

        {/* Countdown / Activation Status Banner */}
        {countdown !== null && countdown > 0 && (
          <div className="bg-slate-950/80 border border-pink-500/30 rounded-xl p-3 text-center flex flex-col items-center justify-center space-y-1 animate-fadeIn">
            <p className="text-xs text-slate-300">
              Please follow our account to activate your scratch card.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs font-semibold text-pink-400 uppercase tracking-wide">
                Activating in
              </span>
              <span
                ref={countdownNumberRef}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/20 border border-pink-500/50 text-pink-300 font-extrabold text-base"
              >
                {countdown}
              </span>
            </div>
          </div>
        )}

        {!isActivated && countdown === null && (
          <p className="text-[11px] text-center text-slate-400 flex items-center justify-center space-x-1">
            <ArrowDown className="w-3 h-3 text-amber-400 animate-bounce" />
            <span>Tap the button above to unlock your scratch card</span>
          </p>
        )}
      </div>

      {/* Main Submit & Scratch Button */}
      <div ref={submitRef as any} className="pt-2">
        <Button
          ref={submitBtnRef}
          type="submit"
          disabled={!isActivated || isSubmitting}
          isLoading={isSubmitting}
          variant="gold"
          size="xl"
          className="w-full text-base sm:text-lg font-black tracking-wide shadow-glow-md"
          leftIcon={isActivated && !isSubmitting ? <Sparkles className="w-5 h-5 animate-spin-slow" /> : undefined}
        >
          {isSubmitting
            ? 'Preparing your Scratch Card...'
            : showReadyBadge
            ? '✓ READY TO PLAY'
            : 'SUBMIT & SCRATCH'}
        </Button>
      </div>

      {/* Trust notice */}
      <p className="text-[11px] text-center text-slate-500 pt-1">
        🔒 100% Free promotional game. No purchase necessary.
      </p>
    </form>
  );
};
