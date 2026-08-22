import gsap from 'gsap';

/**
 * Check if the user has requested reduced motion
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate Page Load Hero & Form
 */
export function animatePageLoad(
  targets: {
    logo?: HTMLElement | null;
    badge?: HTMLElement | null;
    heading?: HTMLElement | null;
    description?: HTMLElement | null;
    formFields?: HTMLElement[];
    instagramCta?: HTMLElement | null;
    submitButton?: HTMLElement | null;
  }
) {
  if (isReducedMotion()) {
    gsap.set(
      [
        targets.logo,
        targets.badge,
        targets.heading,
        targets.description,
        ...(targets.formFields || []),
        targets.instagramCta,
        targets.submitButton,
      ].filter(Boolean),
      { opacity: 1, y: 0, scale: 1 }
    );
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (targets.logo) {
    tl.fromTo(
      targets.logo,
      { opacity: 0, scale: 0.7, y: -10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.5)' }
    );
  }

  if (targets.badge) {
    tl.fromTo(
      targets.badge,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 0.4 },
      '-=0.4'
    );
  }

  if (targets.heading) {
    tl.fromTo(
      targets.heading,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.3'
    );
  }

  if (targets.description) {
    tl.fromTo(
      targets.description,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5 },
      '-=0.3'
    );
  }

  if (targets.formFields && targets.formFields.length > 0) {
    tl.fromTo(
      targets.formFields,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 },
      '-=0.2'
    );
  }

  if (targets.instagramCta) {
    tl.fromTo(
      targets.instagramCta,
      { opacity: 0, scale: 0.94 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' },
      '-=0.1'
    );
  }

  if (targets.submitButton) {
    tl.fromTo(
      targets.submitButton,
      { opacity: 0, y: 15, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5 },
      '-=0.2'
    );
  }

  return tl;
}

/**
 * Shake animation on form validation failure
 */
export function animateShake(element: HTMLElement | null) {
  if (!element || isReducedMotion()) return;
  gsap.fromTo(
    element,
    { x: -7 },
    {
      x: 7,
      duration: 0.08,
      repeat: 3,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(element, { x: 0 });
      },
    }
  );
}

/**
 * Animate countdown digit on Instagram step
 */
export function animateCountdownDigit(element: HTMLElement | null) {
  if (!element) return;
  if (isReducedMotion()) {
    gsap.set(element, { opacity: 1, scale: 1 });
    return;
  }

  gsap.fromTo(
    element,
    {
      scale: 1.45,
      opacity: 0,
      rotate: -10,
    },
    {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 0.4,
      ease: 'back.out(1.8)',
    }
  );
}

/**
 * Animate button activation from disabled to active
 */
export function animateButtonReady(element: HTMLElement | null) {
  if (!element) return;
  if (isReducedMotion()) {
    gsap.set(element, { opacity: 1, scale: 1 });
    return;
  }

  gsap.fromTo(
    element,
    { scale: 0.96, opacity: 0.7 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.45,
      ease: 'back.out(1.6)',
    }
  );
}

/**
 * Smooth transition from form to scratch card
 */
export function animateTransitionToScratch(
  formElement: HTMLElement | null,
  scratchContainer: HTMLElement | null,
  onComplete?: () => void
) {
  if (isReducedMotion()) {
    if (formElement) formElement.style.display = 'none';
    if (scratchContainer) {
      scratchContainer.style.display = 'block';
      scratchContainer.style.opacity = '1';
    }
    if (onComplete) onComplete();
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      if (onComplete) onComplete();
    },
  });

  if (formElement) {
    tl.to(formElement, {
      opacity: 0,
      scale: 0.92,
      y: -20,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        formElement.style.display = 'none';
      },
    });
  }

  if (scratchContainer) {
    tl.fromTo(
      scratchContainer,
      {
        opacity: 0,
        scale: 0.82,
        rotateX: 12,
        y: 35,
      },
      {
        opacity: 1,
        scale: 1,
        rotateX: 0,
        y: 0,
        duration: 0.75,
        ease: 'back.out(1.4)',
      }
    );
  }
}

/**
 * Animate prize reveal celebration
 */
export function animatePrizeReveal(cardElement: HTMLElement | null, prizeContent: HTMLElement | null) {
  if (isReducedMotion()) {
    if (cardElement) gsap.set(cardElement, { scale: 1, opacity: 1 });
    if (prizeContent) gsap.set(prizeContent, { scale: 1, opacity: 1 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } });

  if (cardElement) {
    tl.to(cardElement, {
      scale: 1.04,
      duration: 0.35,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
    });
  }

  if (prizeContent) {
    tl.fromTo(
      prizeContent,
      {
        scale: 0.6,
        opacity: 0,
        y: 20,
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'back.out(2)',
      },
      '-=0.2'
    );
  }
}

/**
 * Animate Staggered Cards
 */
export function animateCardStagger(elements: (HTMLElement | null)[]) {
  const validElements = elements.filter(Boolean) as HTMLElement[];
  if (validElements.length === 0 || isReducedMotion()) return;

  gsap.fromTo(
    validElements,
    { opacity: 0, y: 16, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    }
  );
}

export { gsap };
