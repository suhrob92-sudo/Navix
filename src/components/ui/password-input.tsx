'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { Input, type InputProps } from '@/components/ui/input';

/**
 * Parol maydoni — ko'z belgisi bilan.
 *
 * Telefonda parolni xatosiz yozish qiyin, shuning uchun uni vaqtincha
 * ko'rsatish imkoniyati beriladi. Bu qulaylikni sezilarli oshiradi.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'trailing'>>(
  function PasswordInput(props, ref) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <Input
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            aria-pressed={isVisible}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary flex size-9 items-center justify-center rounded-md transition-colors"
          >
            {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
