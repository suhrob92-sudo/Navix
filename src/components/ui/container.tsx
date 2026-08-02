import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Sahifa kengligini cheklovchi konteyner.
 * Barcha bo'limlar shu komponent ichida joylashadi — shunda telefon,
 * planshet va kompyuterda chetlar bir xil bo'ladi.
 */
const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      sm: 'max-w-3xl',
      md: 'max-w-5xl',
      lg: 'max-w-7xl',
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {
  as?: 'div' | 'section' | 'main' | 'header' | 'footer';
}

export function Container({ className, size, as: Component = 'div', ...props }: ContainerProps) {
  return <Component className={cn(containerVariants({ size }), className)} {...props} />;
}
