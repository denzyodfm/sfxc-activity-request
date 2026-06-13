'use client';

import { useState } from 'react';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-20 w-28',
  md: 'h-28 w-40 max-w-full',
  lg: 'h-40 w-56 max-w-full'
};

export default function LogoMark({ size = 'md' }: LogoMarkProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <div className={`${sizeClasses[size]} inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-sfxc-green shadow-sm`}>
        SFXC
      </div>
    );
  }

  return (
    <img
      src="/sfxc-logo.svg"
      alt="St. Francis Xavier College logo"
      onError={() => setHasImageError(true)}
      className={`${sizeClasses[size]} object-contain`}
    />
  );
}
