import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-[#E8E0D9] bg-white px-3.5 py-2 text-base sm:text-sm text-[#1F2933] placeholder:text-[#8A949E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#567C8D] focus-visible:border-[#567C8D] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
