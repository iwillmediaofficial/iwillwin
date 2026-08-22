import React, { useState, useEffect, useRef } from 'react';
import type { Campaign } from '@/types/database';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { User, Phone, Mail, CheckCircle2, Sparkles, ArrowDown, Lock, Calendar } from 'lucide-react';
import { animateShake, animateButtonReady } from '@/lib/gsap';

interface ParticipantFormProps {
  campaign: Campaign;
  onSubmit: (data: { name: string; mobile: string; email: string; dob?: string }) => Promise<void>;
  isSubmitting: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  fieldRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  instaRef?: React.RefObject<HTMLDivElement>;
  submitRef?: React.RefObject<HTMLDivElement>;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');

  const [errors, setErrors] = useState<{ name?: string; mobile?: string; email?: string }>({});

  // Flow States
  const [hasFollowedInstagram, setHasFollowedInstagram] = useState(false);
  const [showReadyBadge, setShowReadyBadge] = useState(false);

  const instaBtnRef = useRef<HTMLButtonElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const wasValidRef = useRef(false);

  // Check if all required inputs are filled & valid
  const checkIsFormFilled = () => {
    if (campaign.require_name && !name.trim()) return false;
    if (campaign.require_mobile) {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      if (!cleanMobile || cleanMobile.length < 10) return false;
    }
    if (campaign.require_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim() || !emailRegex.test(email.trim())) return false;
    }
    return true;
  };

  const isFormFilled = checkIsFormFilled();

  // Animate Instagram button when form fields become completely filled
  useEffect(() => {
    if (isFormFilled && !wasValidRef.current) {
      wasValidRef.current = true;
      if (instaBtnRef.current && !hasFollowedInstagram) {
        animateButtonReady(instaBtnRef.current);
      }
    } else if (!isFormFilled) {
      wasValidRef.current = false;
    }
  }, [isFormFilled, hasFollowedInstagram]);

  // Handle Instagram Follow CTA Click
  const handleInstagramClick = () => {
    if (!isFormFilled) {
      validate();
      if (formRef?.current) {
        animateShake(formRef.current);
      }
      return;
    }

    if (campaign.instagram_url) {
      window.open(campaign.instagram_url, '_blank', 'noopener,noreferrer');
    }

    setHasFollowedInstagram(true);
    setShowReadyBadge(true);

    if (submitBtnRef.current) {
      animateButtonReady(submitBtnRef.current);
    }

    setTimeout(() => {
      setShowReadyBadge(false);
    }, 2500);
  };

  const validate = () => {
    const errs: { name?: string; mobile?: string; email?: string } = {};

    if (campaign.require_name && !name.trim()) {
      errs.name = 'Please enter your name';
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

    if (!isFormFilled) {
      validate();
      if (formRef?.current) {
        animateShake(formRef.current);
      }
      return;
    }

    if (!hasFollowedInstagram) {
      if (instaRef?.current) {
        animateShake(instaRef.current);
      }
      return;
    }

    if (!validate()) {
      if (formRef?.current) {
        animateShake(formRef.current);
      }
      return;
    }

    const formattedDob =
      birthDay && birthMonth ? `${birthDay.padStart(2, '0')} ${birthMonth}` : undefined;

    await onSubmit({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      dob: formattedDob,
    });
  };

  return (
    <form
      ref={formRef as any}
      onSubmit={handleSubmit}
      className="w-full max-w-sm sm:max-w-md mx-auto bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md flex flex-col space-y-4"
    >
      {/* Form Fields Header */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Step 1: Enter Your Details
        </span>
        {isFormFilled ? (
          <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Details Completed</span>
          </span>
        ) : (
          <span className="text-[11px] text-amber-400/90 font-medium">Required</span>
        )}
      </div>

      {/* Name Input */}
      {campaign.require_name && (
        <div
          ref={(el) => {
            if (fieldRefs?.current) fieldRefs.current[0] = el;
          }}
        >
          <Input
            label="Your Name"
            placeholder="Enter name"
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

      {/* Mobile Input */}
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

      {/* Email Input */}
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

      {/* Date of Birth (Day & Month only - Optional) */}
      <div className="w-full flex flex-col space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Date of Birth</span>
          </span>
          <span className="text-[11px] font-normal text-slate-500 lowercase">(optional)</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Day Selector */}
          <select
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            className="w-full bg-slate-900/90 text-slate-100 font-medium rounded-xl border border-slate-700/80 px-3.5 py-3 text-sm min-h-[48px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 hover:border-slate-600 cursor-pointer"
          >
            <option value="">Select Day</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={String(d)}>
                {d}
              </option>
            ))}
          </select>

          {/* Month Selector */}
          <select
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            className="w-full bg-slate-900/90 text-slate-100 font-medium rounded-xl border border-slate-700/80 px-3.5 py-3 text-sm min-h-[48px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 hover:border-slate-600 cursor-pointer"
          >
            <option value="">Select Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2: Instagram Follow Action */}
      <div
        ref={instaRef as any}
        className="pt-3 pb-1 border-t border-slate-800/80 flex flex-col space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <InstagramIcon className="w-4 h-4 text-pink-500" />
            <span>Step 2: Follow on Instagram</span>
          </span>
          {hasFollowedInstagram ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </span>
          ) : isFormFilled ? (
            <span className="text-[11px] font-semibold text-pink-400 animate-pulse">
              Ready to Follow
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Fill fields first</span>
            </span>
          )}
        </div>

        {/* Instagram Action Button */}
        <Button
          ref={instaBtnRef}
          type="button"
          onClick={handleInstagramClick}
          disabled={!isFormFilled}
          variant={hasFollowedInstagram ? 'secondary' : isFormFilled ? 'instagram' : 'secondary'}
          size="lg"
          className={`w-full flex items-center justify-center space-x-2 font-bold transition-all duration-200 ${
            !isFormFilled
              ? 'opacity-40 cursor-not-allowed bg-slate-800/50 border-slate-800 text-slate-500'
              : hasFollowedInstagram
              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
              : 'shadow-glow-insta hover:scale-[1.01]'
          }`}
          leftIcon={
            hasFollowedInstagram ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <InstagramIcon className="w-5 h-5" />
            )
          }
        >
          <span>
            {hasFollowedInstagram
              ? '✓ Following on Instagram'
              : isFormFilled
              ? 'Follow on Instagram to Unlock'
              : 'Fill Details Above to Unlock'}
          </span>
        </Button>

        {/* Helper Hint */}
        {!isFormFilled && (
          <p className="text-[11px] text-center text-slate-500">
            Please fill in your contact details above to enable the Instagram step.
          </p>
        )}

        {isFormFilled && !hasFollowedInstagram && (
          <p className="text-[11px] text-center text-pink-300 flex items-center justify-center space-x-1 animate-fadeIn">
            <ArrowDown className="w-3 h-3 text-pink-400 animate-bounce" />
            <span>Tap above to follow and activate your scratch card instantly</span>
          </p>
        )}
      </div>

      {/* Step 3: Main Submit & Scratch Button */}
      <div ref={submitRef as any} className="pt-2">
        <Button
          ref={submitBtnRef}
          type="submit"
          disabled={!hasFollowedInstagram || isSubmitting}
          isLoading={isSubmitting}
          variant="gold"
          size="xl"
          className="w-full text-base sm:text-lg font-black tracking-wide shadow-glow-md"
          leftIcon={
            hasFollowedInstagram && !isSubmitting ? (
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            ) : undefined
          }
        >
          {isSubmitting
            ? 'Preparing your Scratch Card...'
            : showReadyBadge
            ? '✓ READY TO PLAY'
            : 'SUBMIT & SCRATCH'}
        </Button>
      </div>
    </form>
  );
};
