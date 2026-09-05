import React from 'react';

export const CelebrationDecorations: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Soft Pastel Corner Ambient Blobs */}
      <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-sky-100/40 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-amber-100/50 blur-3xl" />

      {/* Floating Gift Box - TOP LEFT */}
      <div className="hidden sm:block absolute top-12 left-4 md:left-12 lg:left-24 w-28 h-32 md:w-36 md:h-40 transform -rotate-12 animate-float">
        <svg viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Gift Box Lid */}
          <rect x="25" y="42" width="110" height="28" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          {/* Gift Box Body */}
          <rect x="32" y="68" width="96" height="85" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
          {/* Gold Ribbons Body */}
          <rect x="70" y="68" width="20" height="85" fill="url(#goldGrad)" />
          {/* Gold Ribbons Lid */}
          <rect x="70" y="42" width="20" height="28" fill="url(#goldGrad)" />
          {/* Gold Bow Left */}
          <path
            d="M80 44 C65 20, 30 16, 42 36 C50 48, 75 44, 80 44 Z"
            fill="url(#goldGradLight)"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Gold Bow Right */}
          <path
            d="M80 44 C95 20, 130 16, 118 36 C110 48, 85 44, 80 44 Z"
            fill="url(#goldGradLight)"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Bow Knot */}
          <circle cx="80" cy="43" r="8" fill="url(#goldGrad)" stroke="#B45309" strokeWidth="1.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="goldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Confetti near left box */}
        <span className="absolute -top-3 -right-2 w-3 h-6 bg-blue-500 rounded-sm transform rotate-45 opacity-85" />
        <span className="absolute top-16 -left-3 w-4 h-2 bg-amber-400 rounded-sm transform -rotate-12 opacity-85" />
        <span className="absolute -bottom-2 right-4 w-3 h-5 bg-blue-400 rounded-sm transform rotate-12 opacity-75" />
      </div>

      {/* Floating Gift Box - TOP RIGHT */}
      <div className="hidden sm:block absolute top-12 right-4 md:right-12 lg:right-24 w-28 h-32 md:w-36 md:h-40 transform rotate-12 animate-float-delayed">
        <svg viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Gift Box Lid */}
          <rect x="25" y="42" width="110" height="28" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          {/* Gift Box Body */}
          <rect x="32" y="68" width="96" height="85" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
          {/* Gold Ribbons Body */}
          <rect x="70" y="68" width="20" height="85" fill="url(#goldGrad2)" />
          {/* Gold Ribbons Lid */}
          <rect x="70" y="42" width="20" height="28" fill="url(#goldGrad2)" />
          {/* Gold Bow Left */}
          <path
            d="M80 44 C65 20, 30 16, 42 36 C50 48, 75 44, 80 44 Z"
            fill="url(#goldGradLight2)"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Gold Bow Right */}
          <path
            d="M80 44 C95 20, 130 16, 118 36 C110 48, 85 44, 80 44 Z"
            fill="url(#goldGradLight2)"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          {/* Bow Knot */}
          <circle cx="80" cy="43" r="8" fill="url(#goldGrad2)" stroke="#B45309" strokeWidth="1.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="goldGradLight2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Confetti near right box */}
        <span className="absolute -top-2 -left-3 w-3 h-6 bg-blue-500 rounded-sm transform -rotate-45 opacity-85" />
        <span className="absolute top-20 -right-2 w-4 h-2 bg-amber-400 rounded-sm transform rotate-45 opacity-85" />
        <span className="absolute -bottom-3 left-4 w-3 h-5 bg-amber-500 rounded-sm transform -rotate-12 opacity-75" />
      </div>

      {/* Floating Confetti Scatter across screen */}
      <div className="absolute top-28 left-1/4 w-2.5 h-6 bg-blue-400 rounded-full transform rotate-45 opacity-60" />
      <div className="absolute top-44 left-1/6 w-3 h-3 rounded-full bg-amber-400 opacity-60" />
      <div className="absolute top-36 right-1/4 w-3 h-5 bg-blue-500 rounded-full transform -rotate-30 opacity-60" />
      <div className="absolute top-52 right-1/6 w-2.5 h-5 bg-amber-400 rounded-sm transform rotate-12 opacity-60" />
    </div>
  );
};
