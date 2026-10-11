import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={twMerge(
            clsx(
              'w-full h-11 px-4 rounded-lg bg-card/80 border border-border text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:pointer-events-none text-sm',
              error && 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
