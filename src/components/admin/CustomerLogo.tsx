import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CustomerLogoProps {
  logoUrl?: string | null;
  name: string;
  className?: string;
  textClassName?: string;
  roundedClassName?: string;
}

export const CustomerLogo: React.FC<CustomerLogoProps> = ({
  logoUrl,
  name,
  className = 'w-12 h-12',
  textClassName = 'text-base',
  roundedClassName = 'rounded-xl',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error if logoUrl changes
  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const initials = (name || 'CO')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'CO';

  if (!logoUrl || hasError) {
    return (
      <div
        className={cn(
          'bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold flex-shrink-0 select-none shadow-sm',
          roundedClassName,
          className,
          textClassName
        )}
        title={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-slate-950 border border-slate-800 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm',
        roundedClassName,
        className
      )}
    >
      <img
        src={logoUrl}
        alt={name}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
