import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AllocatedPrizeData } from '@/types/database';
import { playScratchSound } from '@/lib/audio';
import { Sparkles, Gift, Wand2 } from 'lucide-react';
import { Button } from '@/components/common/Button';

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

  // Trigger smooth complete reveal
  const triggerInstantReveal = useCallback(() => {
    if (hasRevealedRef.current) return;
    hasRevealedRef.current = true;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      canvas.style.opacity = '0';
    }

    setTimeout(() => {
      onReveal();
    }, 150);
  }, [onReveal]);

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
    canvas.style.opacity = '1';

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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2.5 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Border Trim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
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
    ctx.fillText('Swipe once across card to unlock', width / 2, height / 2 + 36);
  }, []);

  // Check scratch completion with instant low threshold (15%)
  const calculateScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealedRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const step = 10;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let transparentPixels = 0;
    let totalSampled = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        totalSampled++;
        if (alpha < 128) {
          transparentPixels++;
        }
      }
    }

    const percent = Math.round((transparentPixels / totalSampled) * 100);

    // Instant reveal on initial quick swipe (>= 15%)
    if (percent >= 15 && !hasRevealedRef.current) {
      triggerInstantReveal();
    }
  }, [triggerInstantReveal]);

  // Scratch action
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

      // Generous smooth brush stroke for instant feel
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 42, 0, Math.PI * 2);
      ctx.fill();

      // Trigger scratch audio
      const now = Date.now();
      if (now - lastSoundTimeRef.current > 60) {
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
      if (isScratching) {
        scratchAt(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsScratching(false);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
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
    <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center select-none">
      {/* Scratch Title Banner */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{scratchTitle}</span>
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white font-display mt-2">
          Your Lucky Card is Ready!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
          Swipe once across the card to reveal your reward.
        </p>
      </div>

      {/* Card Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] max-w-[340px] sm:max-w-[380px] rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
      >
        {/* UNDERNEATH LAYER: The Revealed Prize */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-radial-gradient">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-3 shadow-glow-sm overflow-hidden">
            {prize?.image_url ? (
              <img
                src={prize.image_url}
                alt={prize.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Gift className="w-10 h-10 text-amber-400 animate-bounce" />
            )}
          </div>

          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            🎉 PRIZE UNLOCKED!
          </span>

          <h3 className="text-lg sm:text-xl font-extrabold text-white font-display mt-1 leading-snug">
            {prize ? prize.name : 'Exclusive Promotional Reward'}
          </h3>

          {prize?.description && (
            <p className="text-xs text-slate-300 mt-1 max-w-[260px] line-clamp-2">
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
            className="absolute inset-0 w-full h-full scratch-canvas z-10 transition-opacity duration-300"
          />
        )}
      </div>

      {/* Quick Instant Reveal Button */}
      {!isRevealed && (
        <div className="w-full max-w-[340px] sm:max-w-[380px] mt-4 flex items-center justify-center">
          <Button
            type="button"
            onClick={triggerInstantReveal}
            variant="outline"
            size="sm"
            className="w-full text-xs font-bold flex items-center justify-center space-x-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            leftIcon={<Wand2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
          >
            <span>Tap to Reveal Instantly</span>
          </Button>
        </div>
      )}
    </div>
  );
};
