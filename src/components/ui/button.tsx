import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Universal tugma komponenti.
 *
 * `cva` yordamida bir nechta ko'rinish (variant) va o'lcham (size)
 * bitta komponentda birlashtirilgan — har xil tugma uchun alohida fayl
 * yozish shart emas (DRY prinsipi).
 */
const buttonVariants = cva(
  // Barcha tugmalarga tegishli umumiy uslublar
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ' +
    'transition-all duration-200 outline-none select-none ' +
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Asosiy amal — sahifada bitta bo'lgani ma'qul. */
        primary:
          'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98]',
        /** Ikkilamchi amal. */
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        /** Chegarali, shaffof fonli. */
        outline:
          'border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground active:scale-[0.98]',
        /** Fonsiz — menyu va ikonka tugmalari uchun. */
        ghost: 'bg-transparent hover:bg-secondary hover:text-secondary-foreground active:scale-[0.98]',
        /** Shisha effektli — rangli fon ustida chiroyli ko'rinadi. */
        glass: 'glass text-foreground hover:brightness-105 active:scale-[0.98]',
        /** Xavfli amal (o'chirish, bekor qilish). */
        destructive:
          'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:brightness-110 active:scale-[0.98]',
        /** Havola ko'rinishidagi tugma. */
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-5',
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * `true` bo'lsa tugma o'z uslubini farzand elementga beradi.
   * Masalan <Button asChild><Link href="/">Bosh sahifa</Link></Button>
   */
  asChild?: boolean;
  /** Yuklanish holati — tugma bloklanadi va aylanuvchi belgi chiqadi. */
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    isLoading = false,
    loadingText,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  // `asChild` rejimida farzand element bitta bo'lishi shart, shuning uchun
  // yuklanish belgisini faqat oddiy tugmada ko'rsatamiz.
  if (asChild) {
    return (
      <Component ref={ref} className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
});

export { buttonVariants };
