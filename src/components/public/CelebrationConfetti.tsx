import confetti from 'canvas-confetti';
import { isReducedMotion } from '@/lib/gsap';

export function triggerConfettiBurst() {
  if (isReducedMotion()) return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#F59E0B', '#FCD34D', '#10B981'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#833AB4', '#FD1D1D', '#FCB045'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ['#FDE047', '#EAB308', '#FFFFFF'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}
