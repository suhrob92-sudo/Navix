'use client';

import { useSyncExternalStore } from 'react';

/**
 * Komponent brauzerda "o'rnatilgani" (mount / hydration tugagani) ni bildiradi.
 *
 * Nima uchun kerak: server tomonida render qilingan HTML brauzerdagi birinchi
 * render bilan bir xil bo'lishi shart. Agar biror qiymat faqat brauzerda ma'lum
 * bo'lsa (masalan tanlangan mavzu), uni birinchi renderda ko'rsatib bo'lmaydi —
 * aks holda "hydration mismatch" xatosi chiqadi.
 *
 * `useSyncExternalStore` shu vazifa uchun React tavsiya qilgan usul:
 * serverda `false`, brauzerda esa `true` qaytaradi va ortiqcha render yaratmaydi.
 */

/** Tashqi manba yo'q — obuna bo'shatuvchi funksiyani qaytaramiz. */
const subscribe = () => () => {};

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
