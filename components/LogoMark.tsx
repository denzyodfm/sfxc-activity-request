'use client';

import { useState } from 'react';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-28 w-28'
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
      src="/sfxc_icon.png"
      alt="St. Francis Xavier College logo"
      onError={() => setHasImageError(true)}
      className={`${sizeClasses[size]} object-contain`}
    />
  );
}
