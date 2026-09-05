import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AllocatedPrizeData } from '@/types/database';
import { playScratchSound } from '@/lib/audio';
import { Sparkles, Gift } from 'lucide-react';

interface ScratchCardProps {
  prize: AllocatedPrizeData | null;
  scratchTitle?: string;
  onReveal: () => void;
  isRevealed: boolean;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  prize,
  scratchTitle = 'Scratch to Reveal Your Prize',
  onReveal,
  isRevealed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const hasRevealedRef = useRef(isRevealed);
  const lastSoundTimeRef = useRef(0);

  // Initialize Canvas Scratch Layer
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // 1. Rich Metallic Gold Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#F59E0B');
    gradient.addColorStop(0.3, '#FDE047');
    gradient.addColorStop(0.5, '#D97706');
    gradient.addColorStop(0.7, '#FEF08A');
    gradient.addColorStop(1, '#B45309');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Texture & Sparkles Pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Border Trim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // 4. Center Holographic Badge Graphic
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 22px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ IWILLWIN ✨', width / 2, height / 2 - 25);

    ctx.fillStyle = '#1E293B';
    ctx.font = '800 16px Inter, sans-serif';
    ctx.fillText('🪙 SCRATCH HERE 🪙', width / 2, height / 2 + 10);

    ctx.fillStyle = '#854D0E';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('Swipe across card to reveal', width / 2, height / 2 + 35);
  }, []);

  // Check scratch completion percentage (~38% threshold)
  const calculateScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealedRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const step = 8;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let transparentPixels = 0;
    let totalSampled = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha < 128) {
          transparentPixels++;
        }
        totalSampled++;
      }
    }

    const percentage = (transparentPixels / totalSampled) * 100;

    if (percentage > 38 && !hasRevealedRef.current) {
      hasRevealedRef.current = true;
      // Auto clear remaining scratch foil
      canvas.style.opacity = '0';
      setTimeout(() => {
        onReveal();
      }, 400);
    }
  }, [onReveal]);

  // Handle Scratching Action
  const scratchAt = useCallback(
    (clientX: number, clientY: number) => {
      if (hasRevealedRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fill();

      // Trigger scratch audio
      const now = Date.now();
      if (now - lastSoundTimeRef.current > 70) {
        playScratchSound();
        lastSoundTimeRef.current = now;
      }

      calculateScratchPercentage();
    },
    [calculateScratchPercentage]
  );

  // Setup Touch and Mouse Handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initCanvas();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setIsScratching(true);
      if (e.touches[0]) {
        scratchAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) {
        scratchAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setIsScratching(false);
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsScratching(true);
      scratchAt(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isScratching) return;
      scratchAt(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsScratching(false);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [initCanvas, isScratching, scratchAt]);

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center select-none relative z-10">
      {/* Scratch Title Banner */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center space-x-1.5 text-xs font-black text-[#92400e] uppercase tracking-wider bg-[#fef3c7] px-4 py-1 rounded-full border border-[#fde68a] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{scratchTitle}</span>
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
          Your Lucky Card is Ready!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Use your finger or mouse to scratch the gold foil.
        </p>
      </div>

      {/* Card Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] max-w-[340px] sm:max-w-[380px] rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-300 ring-4 ring-amber-100 bg-white"
      >
        {/* UNDERNEATH LAYER: The Revealed Prize */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-amber-50/70 via-white to-amber-50/50">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-amber-200 shadow-md flex items-center justify-center mb-3 overflow-hidden">
            {prize?.image_url ? (
              <img
                src={prize.image_url}
                alt={prize.name}
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Gift className="w-10 h-10 text-amber-500 animate-bounce" />
            )}
          </div>

          <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
            🎉 PRIZE UNLOCKED!
          </span>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-snug">
            {prize ? prize.name : 'Exclusive Promotional Reward'}
          </h3>

          {prize?.description && (
            <p className="text-xs text-slate-500 mt-1 max-w-[260px] line-clamp-2">
              {prize.description}
            </p>
          )}
        </div>

        {/* TOP LAYER: Interactive Scratch Canvas */}
        {!isRevealed && (
          <canvas
            ref={canvasRef}
            width={380}
            height={285}
            className="absolute inset-0 w-full h-full scratch-canvas z-10 transition-opacity duration-300 cursor-pointer"
          />
        )}
      </div>
    </div>
  );
};
