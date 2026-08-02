import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Kartochka — kontentni guruhlash uchun asosiy konteyner.
 * Ilovadagi deyarli har bir blok (buyurtma, mahsulot, statistika) shu asosda quriladi.
 */
const cardVariants = cva('rounded-xl transition-all duration-300', {
  variants: {
    variant: {
      /** Oddiy kartochka — chegarali, tekis fon. */
      solid: 'bg-card text-card-foreground border border-border',
      /** Shisha effektli kartochka. */
      glass: 'glass text-card-foreground',
      /** Chegarasiz — ro'yxat ichidagi elementlar uchun. */
      plain: 'bg-transparent',
    },
    /** Sichqoncha olib borilganda ko'tarilish effekti. */
    interactive: {
      true: 'hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-pointer',
      false: '',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'solid',
    interactive: false,
    padding: 'md',
  },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, interactive, padding, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant, interactive, padding }), className)} {...props} />;
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex flex-col gap-1.5', className)} {...props} />;
  },
);

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3 ref={ref} className={cn('text-lg leading-tight font-semibold tracking-tight', className)} {...props} />
    );
  },
);

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-muted-foreground text-sm leading-relaxed', className)} {...props} />;
  },
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('pt-4', className)} {...props} />;
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex items-center gap-3 pt-4', className)} {...props} />;
  },
);

export { cardVariants };
