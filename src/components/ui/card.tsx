import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'highlighted';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', hoverable = false, children, ...props }, ref) => {
    const base = 'rounded-xl transition-all duration-300 relative';

    const variants = {
      glass: 'bg-card backdrop-blur-md border border-border',
      solid: 'bg-muted border border-border',
      highlighted: 'bg-card backdrop-blur-md border border-amber-500/40 shadow-glow-sm',
    };

    const hoverStyle = hoverable ? 'hover:border-border-hover hover:scale-[1.01]' : '';

    return (
      <div
        ref={ref}
        className={twMerge(clsx(base, variants[variant], hoverStyle, className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
