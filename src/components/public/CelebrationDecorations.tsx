import React from 'react';

export const CelebrationDecorations: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Corner Ambient Pastel Blobs (matching screenshot corners) */}
      <div className="absolute -top-10 -left-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-sky-100/50 blur-3xl" />
      <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-amber-100/60 blur-3xl" />

      {/* Floating 3D Gift Box - LEFT (Visible on mobile & desktop, clipped to left edge) */}
      <div className="absolute top-28 sm:top-32 -left-5 sm:left-2 md:left-8 lg:left-20 w-24 h-28 sm:w-32 sm:h-36 transform -rotate-12 z-0">
        <svg viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Box Shadow */}
          <ellipse cx="80" cy="165" rx="55" ry="12" fill="#CBD5E1" fillOpacity="0.4" />
          {/* Gift Box Lid */}
          <rect x="22" y="40" width="116" height="30" rx="7" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2.5" />
          {/* Gift Box Body */}
          <rect x="30" y="68" width="100" height="90" rx="7" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2.5" />
          {/* Gold Ribbons Body */}
          <rect x="68" y="68" width="24" height="90" fill="url(#leftGoldGrad)" />
          {/* Gold Ribbons Lid */}
          <rect x="68" y="40" width="24" height="30" fill="url(#leftGoldGrad)" />
          {/* Gold Bow Left Wing */}
          <path
            d="M80 42 C62 14, 25 10, 38 34 C48 48, 74 44, 80 42 Z"
            fill="url(#leftGoldGradLight)"
            stroke="#D97706"
            strokeWidth="2"
          />
          {/* Gold Bow Right Wing */}
          <path
            d="M80 42 C98 14, 135 10, 122 34 C112 48, 86 44, 80 42 Z"
            fill="url(#leftGoldGradLight)"
            stroke="#D97706"
            strokeWidth="2"
          />
          {/* Bow Knot */}
          <circle cx="80" cy="42" r="9" fill="url(#leftGoldGrad)" stroke="#B45309" strokeWidth="2" />

          {/* Gradients */}
          <defs>
            <linearGradient id="leftGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="35%" stopColor="#FBBF24" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="leftGoldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Confetti streamers near left gift box */}
        <span className="absolute -top-3 right-1 w-2.5 h-6 bg-blue-500 rounded-full transform rotate-45 opacity-90 shadow-sm" />
        <span className="absolute top-12 -left-2 w-3.5 h-2 bg-amber-400 rounded-full transform -rotate-12 opacity-90 shadow-sm" />
        <span className="absolute -bottom-2 right-6 w-2.5 h-4 bg-blue-400 rounded-full transform rotate-12 opacity-80" />
      </div>

      {/* Floating 3D Gift Box - RIGHT (Visible on mobile & desktop, clipped to right edge) */}
      <div className="absolute top-28 sm:top-32 -right-5 sm:right-2 md:right-8 lg:right-20 w-24 h-28 sm:w-32 sm:h-36 transform rotate-12 z-0">
        <svg viewBox="0 0 160 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          {/* Box Shadow */}
          <ellipse cx="80" cy="165" rx="55" ry="12" fill="#CBD5E1" fillOpacity="0.4" />
          {/* Gift Box Lid */}
          <rect x="22" y="40" width="116" height="30" rx="7" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2.5" />
          {/* Gift Box Body */}
          <rect x="30" y="68" width="100" height="90" rx="7" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2.5" />
          {/* Gold Ribbons Body */}
          <rect x="68" y="68" width="24" height="90" fill="url(#rightGoldGrad)" />
          {/* Gold Ribbons Lid */}
          <rect x="68" y="40" width="24" height="30" fill="url(#rightGoldGrad)" />
          {/* Gold Bow Left Wing */}
          <path
            d="M80 42 C62 14, 25 10, 38 34 C48 48, 74 44, 80 42 Z"
            fill="url(#rightGoldGradLight)"
            stroke="#D97706"
            strokeWidth="2"
          />
          {/* Gold Bow Right Wing */}
          <path
            d="M80 42 C98 14, 135 10, 122 34 C112 48, 86 44, 80 42 Z"
            fill="url(#rightGoldGradLight)"
            stroke="#D97706"
            strokeWidth="2"
          />
          {/* Bow Knot */}
          <circle cx="80" cy="42" r="9" fill="url(#rightGoldGrad)" stroke="#B45309" strokeWidth="2" />

          {/* Gradients */}
          <defs>
            <linearGradient id="rightGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="35%" stopColor="#FBBF24" />
              <stop offset="70%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="rightGoldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Confetti streamers near right gift box */}
        <span className="absolute -top-3 left-1 w-2.5 h-6 bg-blue-500 rounded-full transform -rotate-45 opacity-90 shadow-sm" />
        <span className="absolute top-14 -right-2 w-3.5 h-2 bg-amber-400 rounded-full transform rotate-12 opacity-90 shadow-sm" />
        <span className="absolute -bottom-2 left-6 w-2.5 h-4 bg-amber-500 rounded-full transform -rotate-12 opacity-80" />
      </div>
    </div>
  );
};
