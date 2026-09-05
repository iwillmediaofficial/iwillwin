import React, { useState, useEffect, useRef } from 'react';
import type { Campaign } from '@/types/database';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import {
  User,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
  Calendar,
  ChevronDown,
  Gift,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
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

  const [errors, setErrors] = useState<{
    name?: string;
    mobile?: string;
    email?: string;
    dob?: string;
  }>({});

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
    if (campaign.collect_dob && campaign.require_dob) {
      if (!birthDay || !birthMonth) return false;
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
    const errs: { name?: string; mobile?: string; email?: string; dob?: string } = {};

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

    if (campaign.collect_dob && campaign.require_dob) {
      if (!birthDay || !birthMonth) {
        errs.dob = 'Please select your Date of Birth';
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
    <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center space-y-5">
      {/* Floating White Main Card */}
      <form
        ref={formRef as any}
        onSubmit={handleSubmit}
        className="w-full bg-white border border-slate-100 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/60 flex flex-col space-y-4 text-left transition-all"
      >
        {/* Step 1 Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#facc15] text-slate-950 font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              1
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Enter Your Details</h3>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
            All fields are required *
          </span>
        </div>

        {/* Name Input */}
        {campaign.require_name && (
          <div
            ref={(el) => {
              if (fieldRefs?.current) fieldRefs.current[0] = el;
            }}
            className="flex flex-col space-y-1.5"
          >
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>
                Your Name <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-xl border ${
                  errors.name ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'
                } pl-10 pr-3.5 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 hover:border-slate-300 transition-all`}
                required
                autoComplete="name"
              />
            </div>
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>
        )}

        {/* Mobile Input */}
        {campaign.require_mobile && (
          <div
            ref={(el) => {
              if (fieldRefs?.current) fieldRefs.current[1] = el;
            }}
            className="flex flex-col space-y-1.5"
          >
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>
                Mobile Number <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
                }}
                className={`w-full bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-xl border ${
                  errors.mobile ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'
                } pl-10 pr-3.5 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 hover:border-slate-300 transition-all`}
                required
                autoComplete="tel"
              />
            </div>
            {errors.mobile && <p className="text-xs text-red-500 font-medium">{errors.mobile}</p>}
          </div>
        )}

        {/* Email Input (if enabled) */}
        {campaign.require_email && (
          <div
            ref={(el) => {
              if (fieldRefs?.current) fieldRefs.current[2] = el;
            }}
            className="flex flex-col space-y-1.5"
          >
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>
                Email Address <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full bg-white text-slate-900 placeholder:text-slate-400 font-medium rounded-xl border ${
                  errors.email ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'
                } pl-10 pr-3.5 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 hover:border-slate-300 transition-all`}
                required
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
          </div>
        )}

        {/* Date of Birth (Rendered only when collect_dob is enabled) */}
        {campaign.collect_dob && (
          <div
            ref={(el) => {
              if (fieldRefs?.current) fieldRefs.current[3] = el;
            }}
            className="w-full flex flex-col space-y-1.5"
          >
            <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>
                Date of Birth {campaign.require_dob ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal text-xs">(optional)</span>}
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Day Selector */}
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <select
                  value={birthDay}
                  onChange={(e) => {
                    setBirthDay(e.target.value);
                    if (errors.dob) setErrors((prev) => ({ ...prev, dob: undefined }));
                  }}
                  className="w-full bg-white text-slate-800 font-medium rounded-xl border border-slate-200 pl-10 pr-8 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 hover:border-slate-300 cursor-pointer appearance-none transition-all"
                >
                  <option value="">Select Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>

              {/* Month Selector */}
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <select
                  value={birthMonth}
                  onChange={(e) => {
                    setBirthMonth(e.target.value);
                    if (errors.dob) setErrors((prev) => ({ ...prev, dob: undefined }));
                  }}
                  className="w-full bg-white text-slate-800 font-medium rounded-xl border border-slate-200 pl-10 pr-8 py-3 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 hover:border-slate-300 cursor-pointer appearance-none transition-all"
                >
                  <option value="">Select Month</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>

            {errors.dob && <p className="text-xs text-red-500 font-medium">{errors.dob}</p>}
          </div>
        )}

        {/* Divider Line */}
        <div className="border-t border-slate-100 my-1" />

        {/* Step 2: Follow on Instagram */}
        <div
          ref={instaRef as any}
          className="flex flex-col space-y-2 pt-0.5"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#facc15] text-slate-950 font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
              2
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Follow on Instagram</h3>
          </div>

          {/* Instagram CTA Button */}
          <button
            ref={instaBtnRef}
            type="button"
            onClick={handleInstagramClick}
            disabled={!isFormFilled}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center space-x-2.5 font-bold text-sm transition-all duration-200 min-h-[50px] ${
              !isFormFilled
                ? 'bg-[#f8fafc] border border-slate-200 text-slate-500 cursor-not-allowed'
                : hasFollowedInstagram
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                : 'bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 hover:opacity-95 text-white shadow-md hover:scale-[1.01]'
            }`}
          >
            {hasFollowedInstagram ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>✓ Following on Instagram</span>
              </>
            ) : isFormFilled ? (
              <>
                <InstagramIcon className="w-5 h-5" />
                <span>Follow on Instagram to Unlock</span>
              </>
            ) : (
              <>
                <InstagramIcon className="w-5 h-5 opacity-70" />
                <span className="text-slate-600 font-semibold">Fill Details Above to Unlock</span>
              </>
            )}
          </button>

          {/* Instagram Helper Subtext */}
          {!isFormFilled && (
            <p className="text-[11px] text-center text-slate-400">
              Please fill in your details above to enable the Instagram step.
            </p>
          )}

          {isFormFilled && !hasFollowedInstagram && (
            <p className="text-[11px] text-center text-pink-600 font-semibold animate-pulse">
              Tap above to follow on Instagram and unlock your scratch card!
            </p>
          )}
        </div>

        {/* Step 3: Main Submit & Scratch Button */}
        <div ref={submitRef as any} className="pt-2">
          <button
            ref={submitBtnRef}
            type="submit"
            disabled={!hasFollowedInstagram || isSubmitting}
            className="w-full bg-[#facc15] hover:bg-[#eab308] active:scale-[0.99] text-slate-950 font-black tracking-wide text-sm sm:text-base py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 uppercase disabled:opacity-40 disabled:cursor-not-allowed min-h-[50px]"
          >
            {isSubmitting ? (
              <span>Preparing your Scratch Card...</span>
            ) : showReadyBadge ? (
              <span>✓ READY TO PLAY</span>
            ) : (
              <span>SUBMIT & SCRATCH →</span>
            )}
          </button>
        </div>
      </form>

      {/* Trust & Verification Badges (Below White Card) */}
      <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center space-y-3 pt-1">
        {/* 3 Badges Row with vertical dividers */}
        <div className="w-full bg-white/90 backdrop-blur-sm border border-slate-100 rounded-2xl py-3 px-4 shadow-sm flex items-center justify-around">
          {/* Badge 1: Exciting Offers */}
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-[11px] font-bold text-slate-800 leading-tight text-left">
              Exciting<br />Offers
            </div>
          </div>

          {/* Divider */}
          <div className="h-7 w-[1px] bg-slate-200" />

          {/* Badge 2: 100% Genuine */}
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="text-[11px] font-bold text-slate-800 leading-tight text-left">
              100%<br />Genuine
            </div>
          </div>

          {/* Divider */}
          <div className="h-7 w-[1px] bg-slate-200" />

          {/* Badge 3: Instant via WhatsApp */}
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="text-[11px] font-bold text-slate-800 leading-tight text-left">
              Instant via<br />WhatsApp
            </div>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="flex items-center justify-center space-x-1.5 text-slate-400 text-xs">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Your information is secure with us.</span>
        </div>
      </div>
    </div>
  );
};
