import { ServiceIcon } from '@/components/app/service-icon';
import { ModuleStatus, getQuickServices, type AppModule } from '@/config/modules';
import { cn } from '@/lib/utils';

/**
 * Kirish sahifasi ortidagi 3D sahna.
 *
 * ── Nima uchun bezak emas ─────────────────────────────────────────────
 * Kirish sahifasi — odam ilova bilan birinchi marta yuzma-yuz
 * keladigan joy. U yerda "bu ilova nima qiladi?" degan savol hali
 * javobsiz turadi.
 *
 * Shuning uchun sahnada tasodifiy shakllar emas, ILOVANING O'Z
 * xizmatlari suzadi: ovqat, marketplace, hamyon, ish. Ikonkalar ham,
 * ranglar ham reyestrdan olinadi — ya'ni bosh sahifadagi va kabinet
 * ichidagi bilan bir xil. Odam kirgandan keyin o'sha ikonkalarni
 * qayta ko'radi.
 *
 * ── Nima uchun toza CSS ───────────────────────────────────────────────
 * 3D kutubxona (three.js va shunga o'xshash) yuzlab kilobayt qo'shadi
 * va arzon telefonda batareyani yeydi. Bu yerdagi butun 3D — bir
 * nechta `rotate` va `translate`, ya'ni brauzer uchun deyarli bepul.
 *
 * ── Nima uchun kam element ────────────────────────────────────────────
 * Oltita kartacha yetarli. Ko'proq bo'lsa, forma ortidagi fon
 * "shovqin" bo'lib qolardi va harakat arzon telefonda seziladi.
 *
 * Harakatni kamaytirishni yoqqan foydalanuvchida animatsiya
 * o'chadi — bu global qoida (`prefers-reduced-motion`), shuning
 * uchun bu yerda alohida shart yozilmagan.
 */

interface ScenePlacement {
  /**
   * Ekrandagi joyi — Tailwind sinflari bilan.
   *
   * Telefon va katta ekran uchun ALOHIDA qiymat bor: telefonda forma
   * deyarli butun kenglikni egallaydi va kartachalar sarlavhaga
   * tegib turardi. Shuning uchun kichik ekranda ular yuqori va pastki
   * bo'sh yo'laklarga suriladi.
   */
  position: string;
  /**
   * Qanchalik uzoqda: 0 — eng yaqin, 1 — eng olis.
   *
   * ── Nima uchun aynan MASOFA saqlanadi ───────────────────────────────
   * Faqat burilish (`rotate`) 3D hissini bermaydi: burilgan kvadrat
   * tekis qog'ozdek ko'rinaveradi.
   *
   * Chuqurlikni ko'z ikkita belgidan o'qiydi: uzoqdagi narsa KICHIK
   * va XIRA ko'rinadi. Shuning uchun o'lcham va shaffoflik shu
   * bitta raqamdan hisoblanadi — qo'lda yozilsa, ular bir-biriga
   * mos kelmay qolardi.
   */
  depth: number;
  /** Qaysi tomonga burilgan. */
  rotate: string;
  /** Suzish boshlanishi — hammasi bir vaqtda ko'tarilmasligi uchun. */
  delaySeconds: number;
  /**
   * Kichik ekranda ko'rinadimi.
   *
   * Telefonda forma deyarli butun kenglikni egallaydi: oltita
   * kartacha uni o'rab olsa, o'qish qiyinlashardi. Shuning uchun
   * kichik ekranda faqat to'rttasi qoladi — yuqorida va pastda.
   */
  onSmallScreen: boolean;
}

/** Masofadan o'lcham va shaffoflik. */
function depthStyle(placement: ScenePlacement): { scale: number; opacity: number; blurPx: number } {
  return {
    scale: 1 - placement.depth * 0.3,
    opacity: 0.85 - placement.depth * 0.4,
    /*
      Olisdagi kartacha biroz xiralashadi — fotoapparatdagi kabi.
      Chegara 3 piksel: ko'proq bo'lsa "iflos" ko'rinadi, ozroq
      bo'lsa umuman sezilmaydi.
    */
    blurPx: placement.depth * 3,
  };
}

const PLACEMENTS: readonly ScenePlacement[] = [
  {
    // Yuqori chap — eng yaqin kartacha.
    position: 'top-[10%] left-[4%] lg:top-[14%] lg:left-[10%]',
    depth: 0,
    rotate: 'rotateY(26deg) rotateX(10deg)',
    delaySeconds: 0,
    onSmallScreen: true,
  },
  {
    position: 'top-[12%] right-[6%] lg:top-[9%] lg:right-[12%]',
    depth: 0.35,
    rotate: 'rotateY(-22deg) rotateX(12deg)',
    delaySeconds: -5,
    onSmallScreen: true,
  },
  {
    // Yon tomondagilar faqat keng ekranda: telefonda joy yo'q.
    position: 'top-[46%] left-[6%]',
    depth: 0.75,
    rotate: 'rotateY(30deg) rotateX(-6deg)',
    delaySeconds: -9,
    onSmallScreen: false,
  },
  {
    position: 'top-[52%] right-[7%]',
    depth: 1,
    rotate: 'rotateY(-28deg) rotateX(-8deg)',
    delaySeconds: -13,
    onSmallScreen: false,
  },
  {
    position: 'bottom-[9%] left-[8%] lg:bottom-[16%] lg:left-[14%]',
    depth: 0.5,
    rotate: 'rotateY(20deg) rotateX(-14deg)',
    delaySeconds: -7,
    onSmallScreen: true,
  },
  {
    position: 'bottom-[7%] right-[10%] lg:bottom-[12%] lg:right-[16%]',
    depth: 0.15,
    rotate: 'rotateY(-24deg) rotateX(-10deg)',
    delaySeconds: -16,
    onSmallScreen: true,
  },
];

/**
 * Sahnaga tushadigan xizmatlar.
 *
 * Faqat ISHLAYOTGANLARI: rejadagi modulni ko'rsatish "bu ham bor"
 * degan noto'g'ri va'da bo'lardi. Ro'yxat reyestrdan olinadi, ya'ni
 * yangi xizmat ishga tushganda sahna o'zi yangilanadi.
 */
export function sceneModules(): AppModule[] {
  return getQuickServices()
    .filter((module) => module.status === ModuleStatus.LIVE)
    .slice(0, PLACEMENTS.length);
}

export function AuthScene({ className }: { className?: string }) {
  const modules = sceneModules();

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      style={{ perspective: '1200px' }}
      aria-hidden="true"
    >
      {modules.map((module, index) => {
        const placement = PLACEMENTS[index];

        const { scale, opacity, blurPx } = depthStyle(placement);

        return (
          <div
            key={module.id}
            className={cn(
              'absolute',
              placement.position,
              placement.onSmallScreen ? 'block' : 'hidden lg:block',
            )}
            style={{
              transform: `${placement.rotate} scale(${scale})`,
              opacity,
              filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            }}
          >
            {/*
              Ikki qatlam: tashqarisi BURCHAKNI ushlab turadi, ichkarisi
              suziladi. Bitta qatlamda bo'lsa, animatsiya burchakni
              o'chirib yuborardi — sabab `globals.css` da yozilgan.
            */}
            <div
              className="animate-tile-float"
              style={{ animationDelay: `${placement.delaySeconds}s` }}
            >
              <div className="glass rounded-2xl p-4 shadow-2xl">
                <ServiceIcon icon={module.icon} color={module.color} size="md" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
