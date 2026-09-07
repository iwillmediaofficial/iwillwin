import React, { useEffect, useRef, useState, useCallback } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
  siteKey?: string;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
          retry?: 'auto' | 'never';
          'retry-interval'?: number;
          'refresh-expired'?: 'auto' | 'manual' | 'never';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const DEFAULT_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAErAa3FFirE-Nr11';

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onExpire,
  onError,
  siteKey = DEFAULT_SITE_KEY,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Store callbacks in stable refs so parent re-renders never tear down the Turnstile widget
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // If widget is already mounted and rendered, clean up cleanly
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    try {
      setStatus('loading');
      setErrorCode(null);

      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setStatus('verified');
          onVerifyRef.current?.(token);
        },
        'error-callback': (code?: string) => {
          console.warn('[Cloudflare Turnstile] Challenge error code:', code);
          setStatus('error');
          setErrorCode(code || 'error');
          onErrorRef.current?.(code);
        },
        'expired-callback': () => {
          setStatus('ready');
          onExpireRef.current?.();
        },
        theme: 'light',
        size: 'normal',
        retry: 'auto',
        'retry-interval': 3000,
        'refresh-expired': 'auto',
      });

      widgetIdRef.current = id;
      setStatus('ready');
    } catch (err: any) {
      console.error('[Cloudflare Turnstile] Render failed:', err);
      setStatus('error');
      setErrorCode(err?.message || 'render_failed');
    }
  }, [siteKey]);

  useEffect(() => {
    let isCancelled = false;

    const initTurnstile = () => {
      if (isCancelled) return;
      if (window.turnstile) {
        renderWidget();
      }
    };

    if (window.turnstile) {
      initTurnstile();
    } else {
      const existingScript = document.getElementById('cf-turnstile-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'cf-turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (!isCancelled) initTurnstile();
        };
        script.onerror = () => {
          if (!isCancelled) {
            setStatus('error');
            setErrorCode('script_blocked');
          }
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            if (!isCancelled) initTurnstile();
          }
        }, 100);
        return () => {
          isCancelled = true;
          clearInterval(interval);
        };
      }
    }

    return () => {
      isCancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  const handleRetry = () => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setStatus('ready');
        setErrorCode(null);
      } catch {
        renderWidget();
      }
    } else {
      renderWidget();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
      {/* Cloudflare Turnstile target container */}
      <div
        ref={containerRef}
        className="min-h-[65px] min-w-[300px] flex items-center justify-center"
      />

      {status === 'loading' && (
        <div className="text-[11px] text-slate-400 animate-pulse flex items-center space-x-1.5 py-1">
          <span>Verifying security check...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center mt-1.5">
          <p className="text-xs text-rose-500 font-medium">
            {errorCode === 'script_blocked'
              ? 'Security check blocked. Please disable ad-blockers for this page.'
              : 'Security verification took too long or failed.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-amber-600 hover:text-amber-700 underline font-semibold mt-1 cursor-pointer"
          >
            Click here to retry
          </button>
        </div>
      )}
    </div>
  );
};
