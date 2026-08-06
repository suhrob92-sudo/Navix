'use client';

import { WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, type AuthUser } from '@/modules/auth/auth-context';

/**
 * Sahifaga kirishdan oldingi tekshiruv — BARCHA qo'riqchilar uchun bitta.
 *
 * ── Nima uchun umumiy ─────────────────────────────────────────────────
 * Oltita qo'riqchi bor edi (kabinet, admin, restoran, do'kon, kuryer,
 * ish beruvchi) va har birida AYNI mantiq nusxalangan edi. Quyidagi
 * xato ham shu sababli oltita joyda bir vaqtda yashagan.
 *
 * ── Tuzatilgan xato ───────────────────────────────────────────────────
 * Ilgari ikki holat bir xil ko'rinardi: "sessiya yo'q" va "serverga
 * yetib bo'lmadi". Ikkalasida ham odam kirish sahifasiga haydalardi.
 *
 * Baza o'chib qolganda bu cheksiz aylanishga olib kelardi:
 *
 *   brauzer  →  "sessiyam yo'q"  →  /auth/login
 *   proxy    →  "cookie bor-ku!" →  /dashboard
 *   brauzer  →  "sessiyam yo'q"  →  /auth/login ...
 *
 * Ekranda esa ABADIY skelet. Foydalanuvchi uchun bu "ilova buzildi"
 * degani: na xabar bor, na bosadigan tugma.
 *
 * Endi aloqa yo'qligida yo'naltirish umuman bo'lmaydi — tushunarli
 * ekran va "Qayta urinish" tugmasi ko'rsatiladi.
 */

export interface AuthGate {
  /**
   * Ko'rsatilishi kerak bo'lgan ekran. `null` bo'lsa — hammasi joyida,
   * sahifa o'z mazmunini chizaveradi.
   */
  screen: React.ReactNode | null;
  user: AuthUser | null;
}

export function useAuthGate(): AuthGate {
  const { user, isLoading, isAuthenticated, status, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Aloqa yo'q bo'lsa YO'NALTIRMAYMIZ: odam tizimdan chiqmagan.
    if (isLoading || isAuthenticated || status === 'offline') return;

    // Kirgandan keyin foydalanuvchi shu sahifaga qaytishi uchun manzilni saqlaymiz.
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, isLoading, status, router]);

  if (!isLoading && !isAuthenticated && status === 'offline') {
    return { screen: <ConnectionScreen onRetry={refresh} />, user: null };
  }

  // Yo'naltirish bajarilguncha ham skelet ko'rsatiladi.
  if (isLoading || !isAuthenticated) {
    return { screen: <AuthLoadingScreen onRetry={refresh} />, user: null };
  }

  return { screen: null, user };
}

/**
 * Skelet shuncha soniyadan keyin "nimadir noto'g'ri" ekranga aylanadi.
 *
 * ── Nima uchun vaqt bo'yicha ──────────────────────────────────────────
 * Har bir nosozlikni oldindan bilib bo'lmaydi. Lekin bittasi aniq:
 * 15 soniyadan keyin ham skelet turgan bo'lsa, u o'z-o'zidan
 * yo'qolmaydi.
 *
 * Bu — OXIRGI himoya chizig'i. Undan oldingi qatlamlar (so'rov
 * muddati, holatni ajratish, cookie tozalash) xatoni ildizidan
 * yechadi; bu esa kutilmagan holatda ham odam qotib qolgan ekran
 * bilan yolg'iz qolmasligini kafolatlaydi.
 */
const STUCK_AFTER_MS = 15_000;

function AuthLoadingScreen({ onRetry }: { onRetry: () => void }) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsStuck(true), STUCK_AFTER_MS);

    return () => clearTimeout(timer);
  }, []);

  if (isStuck) {
    return <ConnectionScreen onRetry={onRetry} />;
  }

  return (
    <Container className="py-12">
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-72" />
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}

/**
 * Avtomatik qayta urinish oralig'i (millisekundda).
 *
 * ── Nima uchun oraliq O'SIB boradi ────────────────────────────────────
 * Aloqa tiklanishi bir necha soniya ham, bir necha daqiqa ham
 * bo'lishi mumkin. Har soniyada so'rov yuborish esa allaqachon
 * qiynalayotgan serverni yanada bo'g'adi va telefonning batareyasini
 * yeydi.
 *
 * Shuning uchun avval tez-tez, keyin siyraklashib boradi. Oxirgi
 * qiymat takrorlanaveradi.
 */
const RETRY_DELAYS_MS = [3_000, 6_000, 12_000, 30_000];

/** Serverga ulanib bo'lmaganda ko'rsatiladigan ekran. */
function ConnectionScreen({ onRetry }: { onRetry: () => void }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /**
   * Aloqa tiklanganda sahifa O'ZI tuzalsin.
   *
   * Aks holda foydalanuvchi tugma bosishi kerak edi — u esa
   * baza qachon ko'tarilganini bilmaydi va ekranga qarab
   * o'tiravermaydi.
   */
  useEffect(() => {
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => setAttempt((current) => current + 1), delay);

    return () => clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (attempt === 0) return;

    void onRetry();
  }, [attempt, onRetry]);

  /**
   * Telefon internetga qaytgan zahoti tekshiramiz — kutib
   * o'tirishning hojati yo'q.
   */
  useEffect(() => {
    function handleOnline() {
      setAttempt((current) => current + 1);
    }

    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  async function retry() {
    setIsRetrying(true);

    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <Container className="py-12">
      <EmptyState
        icon={WifiOff}
        title="Serverga ulanib bo'lmadi"
        description="Internet aloqasi uzilgan yoki server javob bermayapti. Siz tizimdan chiqmadingiz — aloqa tiklanishi bilan sahifa o'zi ochiladi."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={retry} isLoading={isRetrying} loadingText="Tekshirilmoqda...">
              Qayta urinish
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} disabled={isRetrying}>
              Sahifani yangilash
            </Button>
          </div>
        }
      />
    </Container>
  );
}
