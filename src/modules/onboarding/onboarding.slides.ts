import type { LucideIcon } from 'lucide-react';
import { Bot, Mic, ShieldCheck, Sparkles } from 'lucide-react';

import type { ServiceColor } from '@/config/modules';

/**
 * Tanishtiruv slaydlari.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Matn — mahsulotning bir qismi va u tez-tez o'zgaradi. Uni komponent
 * ichida saqlash o'zgartirish uchun JSX orasidan qidirishni talab
 * qiladi. Alohida ro'yxatda esa hammasi ko'z oldida turadi va uni
 * tarjima qilish ham oson bo'ladi.
 *
 * ── Nima uchun ATIGI 4 ta ─────────────────────────────────────────────
 * Har qo'shimcha slayd — "O'tkazib yuborish" tugmasini bosish ehtimoli.
 * Faqat ilovaning MOHIYATINI aytadigan gaplar qoldirilgan: bu nima,
 * yordamchi nima qila oladi, ovoz bilan qanday ishlaydi va puli
 * xavfsizmi.
 */
export interface OnboardingSlide {
  id: string;
  icon: LucideIcon;
  color: ServiceColor;
  title: string;
  body: string;
}

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    color: 'violet',
    title: "Navix — bitta ilova, ko'p xizmat",
    body: "Ovqat buyurtmasi, Marketplace xaridi, kommunal to'lovlar va hamyon — hammasi shu yerda. Har xizmat uchun alohida ilova kerak emas.",
  },
  {
    id: 'assistant',
    icon: Bot,
    color: 'blue',
    title: 'AI Yordamchi sizni tushunadi',
    body: "Menyu qidirib o'tirmang. Oddiy tilda yozing: \"2 ta lag'mon buyur\", \"gazga 50 ming to'la\", \"balansim qancha\". Yordamchi qolganini o'zi qiladi.",
  },
  {
    id: 'voice',
    icon: Mic,
    color: 'green',
    title: 'Ovoz bilan ham gapiring',
    body: 'Mikrofon tugmasini bosib ayting — masalan "Navix, telefon qidir". Qo\'lingiz band bo\'lsa, javobni ovoz bilan eshitishingiz ham mumkin.',
  },
  {
    id: 'safety',
    icon: ShieldCheck,
    color: 'amber',
    title: 'Pulingiz nazoratingizda',
    body: "Yordamchi hech qachon o'zi to'lamaydi. U faqat buyruqni tayyorlaydi: aniq summa va qabul qiluvchi ko'rsatiladi, tugmani siz bosasiz.",
  },
] as const;
