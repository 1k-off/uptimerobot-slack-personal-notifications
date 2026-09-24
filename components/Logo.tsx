import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
  className?: string;
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
} as const;

const textSizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
} as const;

export default function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="UCC"
      width={size === 'lg' ? 40 : size === 'md' ? 24 : 16}
      height={size === 'lg' ? 40 : size === 'md' ? 24 : 16}
      className={`${iconSizes[size]} rounded-md object-contain`}
    />
  );

  if (variant === 'icon') {
    return <div className={className}>{icon}</div>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span
        className={`font-display font-semibold tracking-tight text-[var(--text-primary)] ${textSizes[size]}`}
      >
        UCC
      </span>
    </div>
  );
}
