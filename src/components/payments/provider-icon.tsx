import { Flame, Droplets, Zap, Thermometer, Smartphone, Wifi, Tv, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ServiceIcon } from '@/components/app/service-icon';
import type { ServiceColor } from '@/config/modules';
import type { ServiceProviderItem } from '@/modules/payment/payment.types';

/**
 * Provayder ikonkasi.
 *
 * Ikonka provayder KODIGA qarab tanlanadi — shunda "Hududgaz" olov,
 * "Suvoqova" tomchi bilan chiqadi. Kod topilmasa toifaga qarab
 * umumiy ikonka beriladi, ya'ni yangi provayder qo'shilganda ham
 * bo'sh joy qolmaydi.
 */
const CODE_ICONS: Record<string, LucideIcon> = {
  hududgaz: Flame,
  suvoqova: Droplets,
  'hududiy-elektr': Zap,
  'issiqlik-manbai': Thermometer,
};

const CATEGORY_ICONS: Record<ServiceProviderItem['category'], LucideIcon> = {
  UTILITY: Receipt,
  MOBILE: Smartphone,
  INTERNET: Wifi,
  TV: Tv,
};

export interface ProviderIconProps {
  provider: Pick<ServiceProviderItem, 'code' | 'category' | 'color'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProviderIcon({ provider, size = 'md', className }: ProviderIconProps) {
  const Icon = CODE_ICONS[provider.code] ?? CATEGORY_ICONS[provider.category];

  return <ServiceIcon icon={Icon} color={provider.color as ServiceColor} size={size} className={className} />;
}
