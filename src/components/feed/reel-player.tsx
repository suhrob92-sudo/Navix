'use client';

import { BadgeCheck, Heart, MessageCircle, Pause, ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { authorDisplayName, formatReactionCount, type PostView } from '@/modules/feed/feed.types';

export interface ReelPlayerProps {
  post: PostView;
  /** Bu video hozir ekranda ko'rinyaptimi — faqat u o'ynaydi. */
  isActive: boolean;
  /** Ovoz yoqilganmi. Sozlama BARCHA videolar uchun umumiy. */
  isMuted: boolean;
  onToggleMuted: () => void;
  onToggleLike: () => void;
}

/**
 * To'liq ekranli video — "Reels" uslubidagi lenta uchun bitta ekran.
 *
 * ── Nima uchun ovoz boshida O'CHIQ ────────────────────────────────────
 * Brauzerlar ovozli videoni O'ZI ishga tushirishga ruxsat bermaydi:
 * odam sahifani ochishi bilan baland ovoz chiqishi mumkin emas. Agar
 * ovoz bilan boshlashga urinilsa, video UMUMAN o'ynamaydi va odam
 * qotib qolgan kadrni ko'radi.
 *
 * Shuning uchun boshida ovozsiz o'ynaydi va bir bosishda yoqiladi.
 * Sozlama esa umumiy: odam bir marta yoqsa, keyingi videolar ham
 * ovozli bo'ladi — har birida qayta bosish charchatardi.
 *
 * ── Nima uchun `IntersectionObserver` ─────────────────────────────────
 * Ekranda ko'rinmayotgan video o'ynasa: trafik bekorga sarflanadi,
 * batareya tugaydi va eng yomoni — bir vaqtda bir nechta ovoz
 * eshitiladi.
 */
export function ReelPlayer({ post, isActive, isMuted, onToggleMuted, onToggleLike }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Odam qo'lda to'xtatganmi — faollik o'zgarsa ham tiklanmaydi. */
  const [isPaused, setIsPaused] = useState(false);

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (isActive && !isPaused) {
      /**
       * `play()` va'da qaytaradi va u RAD ETILISHI mumkin (masalan
       * brauzer avtomatik o'ynashga ruxsat bermasa). Ushlanmasa,
       * konsolda tutilmagan xato paydo bo'lardi.
       */
      void element.play().catch(() => setIsPaused(true));
    } else {
      element.pause();

      // Ekrandan chiqqan video BOSHIGA qaytadi: odam qaytib
      // kelganda o'rtasidan emas, boshidan ko'radi.
      if (!isActive) element.currentTime = 0;
    }
  }, [isActive, isPaused]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={post.videoUrl ?? undefined}
        poster={post.videoPosterUrl ?? undefined}
        muted={isMuted}
        loop
        playsInline
        preload={isActive ? 'auto' : 'metadata'}
        className="h-full w-full object-contain"
        onClick={() => setIsPaused((current) => !current)}
      />

      {/* To'xtatilgan holat belgisi — ekranning o'rtasida. */}
      {isPaused && isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/50 p-5 backdrop-blur-sm">
            <Pause className="size-8 text-white" aria-hidden="true" />
          </span>
        </div>
      )}

      {/*
        Pastdagi gradient: matn har qanday video ustida o'qilishi
        kerak. Oq matn oq kadrda ko'rinmay qolardi.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Ovoz tugmasi — yuqori o'ngda, doim ko'rinadi. */}
      <button
        type="button"
        onClick={onToggleMuted}
        aria-label={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
        className="absolute top-4 right-4 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-95"
      >
        {isMuted ? (
          <VolumeX className="size-5" aria-hidden="true" />
        ) : (
          <Volume2 className="size-5" aria-hidden="true" />
        )}
      </button>

      {/* O'ng tomondagi amallar ustuni. */}
      <div className="absolute right-3 bottom-44 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={post.isLiked}
          aria-label={post.isLiked ? 'Yoqtirishni olib tashlash' : 'Yoqtirish'}
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
        >
          <Heart
            className={cn('size-7 drop-shadow', post.isLiked && 'fill-red-500 text-red-500')}
            aria-hidden="true"
          />
          <span className="text-xs font-medium tabular-nums drop-shadow">{likeText || '0'}</span>
        </button>

        <Link
          href={`/feed/${post.id}`}
          aria-label="Izohlar"
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
        >
          <MessageCircle className="size-7 drop-shadow" aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums drop-shadow">{commentText || '0'}</span>
        </Link>
      </div>

      {/* Pastdagi ma'lumot: muallif, matn va mahsulot tugmasi. */}
      {/*
        Pastdagi bo'shliq telefonning "xavfsiz maydoni"ni hisobga
        oladi: iPhone'da pastda uy indikatori bor va usiz mahsulot
        tugmasi uning ostiga tushib qolardi.
      */}
      <div
        className="absolute inset-x-0 bottom-0 space-y-3 p-4"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        <Link href={`/u/${post.author.username}`} className="flex items-center gap-2.5">
          <Avatar src={post.author.avatarUrl} name={post.author.fullName} size="sm" />

          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white drop-shadow">{name}</span>
            {post.author.isVerified && (
              <BadgeCheck className="size-4 text-white drop-shadow" aria-label="Tasdiqlangan profil" />
            )}
          </span>
        </Link>

        {post.body.length > 0 && (
          <p className="line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow">{post.body}</p>
        )}

        {post.product && <ProductButton product={post.product} />}
      </div>
    </div>
  );
}

/**
 * Mahsulot tugmasi — videodan to'g'ri savdo sahifasiga.
 *
 * ── Nima uchun bu tugma butun g'oyaning MARKAZI ──────────────────────
 * Odam videoda mahsulotni ko'radi va "qayerdan olsa bo'ladi?" deb
 * izohlarda so'raydi. Sotuvchi javob berguncha qiziqish so'nadi.
 *
 * Tugma bilan yo'l ikki bosishga qisqaradi: ko'rdi — bosdi — sahifada.
 *
 * ── Nima uchun sotuvda bo'lmasa ham KO'RSATILADI ─────────────────────
 * Yashirib qo'yilsa, odam nima ko'rsatilayotganini umuman bilmasdi.
 * Ochiq yozilgan "Hozir sotuvda yo'q" esa halol va sotuvchiga zaxira
 * tugaganini bildiradi.
 */
function ProductButton({ product }: { product: NonNullable<PostView['product']> }) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <ShoppingBag className="size-5 text-white" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-white">{product.name}</span>
        <span className="text-xs text-white/70">
          {product.isAvailable ? `${formatTiyin(product.priceTiyin)} · ${product.shopName}` : "Hozir sotuvda yo'q"}
        </span>
      </span>

      {product.isAvailable && (
        <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">
          Ko&apos;rish
        </span>
      )}
    </>
  );

  if (!product.isAvailable) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-black/50 p-2.5 backdrop-blur-md">{content}</div>
    );
  }

  return (
    <Link
      href={`/marketplace/p/${product.slug}`}
      className="flex items-center gap-3 rounded-2xl bg-black/50 p-2.5 backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}
