'use client';

import { BadgeCheck, Bookmark, Eye, Heart, MapPin, MessageCircle, Pause, Share2, ShoppingBag, Volume2, VolumeX, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { RichText } from '@/components/feed/rich-text';
import { ShareSheet } from '@/components/feed/share-sheet';
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
  /** Saqlash tugmasi bosildi. */
  onToggleSave: () => void;
  /** Ulashish bajarildi — son shu yerda oshadi. */
  onShared: () => void;
  /** Mahsulot tugmasi bosildi — sotuvchi ko'rsatkichi uchun. */
  onProductClick: (productId: string) => void;
  /** Video ko'rildi deb belgilash — bir ochilishda BIR MARTA. */
  onViewed?: () => void;
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
export function ReelPlayer({
  post,
  isActive,
  isMuted,
  onToggleMuted,
  onToggleLike,
  onToggleSave,
  onShared,
  onProductClick,
  onViewed,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Odam qo'lda to'xtatganmi — faollik o'zgarsa ham tiklanmaydi. */
  const [isPaused, setIsPaused] = useState(false);

  /** Tomosha tezligi — 1x odatiy. */
  const [speed, setSpeed] = useState(1);

  /** Mahsulotlar ro'yxati ochilganmi (bittadan ko'p bo'lsa). */
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  /** Ulashish oynasi ochilganmi. */
  const [isShareOpen, setIsShareOpen] = useState(false);

  /** Ikki marta bosilgandagi yurakcha ko'rinyaptimi. */
  const [isHeartFlying, setIsHeartFlying] = useState(false);

  /** Oxirgi bosish vaqti — ikki marta bosishni aniqlash uchun. */
  const lastTapRef = useRef(0);

  /**
   * Ko'rish BIR MARTA sanaladi.
   *
   * Odam videoni orqaga-oldinga surib, qayta-qayta ko'rsa, sanoq
   * har safar oshib ketardi va son ma'nosini yo'qotardi.
   */
  const viewedRef = useRef(false);

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);
  const shareText = formatReactionCount(post.shareCount);

  /**
   * Videoga bosish IKKI ish qiladi.
   *
   * Bir marta — to'xtatadi/davom ettiradi. Ikki marta — yoqtiradi.
   * Instagramda ham aynan shunday va odam buni o'rgatmasdan
   * biladi.
   */
  function handleTap() {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;

      // Bir marta bosishda to'xtagan edi — qaytadan o'ynatiladi.
      setIsPaused(false);

      if (!post.isLiked) onToggleLike();

      setIsHeartFlying(true);
      setTimeout(() => setIsHeartFlying(false), 700);

      return;
    }

    lastTapRef.current = now;
    setIsPaused((current) => !current);
  }

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // Tezlik har safar qo'llanadi: element qayta yaratilishi mumkin.
    element.playbackRate = speed;

    if (isActive && !isPaused) {
      /**
       * Ko'rish AYNAN shu yerda sanaladi.
       *
       * Ro'yxatda ko'rinishi yetarli emas: odam tez surib o'tsa,
       * u videoni ko'rmagan bo'ladi. O'ynay boshlagani esa
       * haqiqiy tomosha belgisidir.
       */
      if (!viewedRef.current) {
        viewedRef.current = true;
        onViewed?.();
      }

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
  }, [isActive, isPaused, speed, onViewed]);

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
        onClick={handleTap}
      />

      {/* Ikki marta bosilganda uchib chiqadigan yurakcha. */}
      {isHeartFlying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart className="animate-heart-pop size-24 fill-white text-white drop-shadow-lg" aria-hidden="true" />
        </div>
      )}

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

      {/*
        Tezlik tugmasi — ovoz tugmasi ostida.

        Uzun ko'rsatma videosini tezroq ko'rish yoki mahsulot
        tafsilotini sekinroq ko'rish uchun. Ro'yxat qisqa: to'rtta
        qiymat barmoq bilan aylantirishga qulay.
      */}
      <button
        type="button"
        onClick={() => setSpeed((current) => SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length])}
        aria-label={`Tezlik: ${speed}x`}
        className="absolute top-16 right-4 rounded-full bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-transform active:scale-95"
      >
        {`${speed}x`}
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

        {/*
          Ko'rishlar soni — SOTUVCHI uchun asosiy ko'rsatkich.

          "Videomni necha kishi ko'rdi?" degan savolga javob shu
          yerda turadi va uni ochish uchun hech qayerga o'tish
          kerak emas.
        */}
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          aria-label="Ulashish"
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
        >
          <Share2 className="size-7 drop-shadow" aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums drop-shadow">{shareText || '0'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={post.isSaved}
          aria-label={post.isSaved ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
        >
          <Bookmark
            className={cn('size-7 drop-shadow', post.isSaved && 'fill-white')}
            aria-hidden="true"
          />
        </button>

        <span className="flex flex-col items-center gap-1 text-white">
          <Eye className="size-7 drop-shadow" aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums drop-shadow">
            {formatReactionCount(post.viewCount) || '0'}
          </span>
        </span>
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

        {/*
          Joylashuv — muallif nomi ostida.

          To'liq ekranda joy nomi kontentning bir qismi: "bu qayerda?"
          degan savol video ko'rilayotganda darhol tug'iladi.
        */}
        {post.place && (
          <p className="flex items-center gap-1 text-xs text-white/80 drop-shadow">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{post.place.name}</span>
          </p>
        )}

        {post.body.length > 0 && (
          <p className="line-clamp-2 text-sm leading-relaxed text-white/90 drop-shadow">
            <RichText body={post.body} tone="ON_MEDIA" />
          </p>
        )}

        {post.products.length === 1 && (
          <ProductButton product={post.products[0]} onClick={() => onProductClick(post.products[0].id)} />
        )}

        {/*
          Bir nechta mahsulot bo'lsa — BITTA tugma va ro'yxat.

          Hammasini birdan ko'rsatish videoning yarmini bosib
          qo'yardi: odam esa avval videoni ko'rgani kelgan.
        */}
        {post.products.length > 1 && (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-black/50 p-2.5 backdrop-blur-md transition-transform active:scale-[0.98]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <ShoppingBag className="size-5 text-white" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-medium text-white">
                {`${post.products.length} ta mahsulot`}
              </span>
              <span className="block truncate text-xs text-white/70">
                {post.products.map((item) => item.name).join(', ')}
              </span>
            </span>

            <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">
              Ko&apos;rish
            </span>
          </button>
        )}
      </div>

      {/*
        Mahsulotlar ro'yxati — pastdan chiqadigan varaq.

        Ro'yxatni video ustiga to'liq yoyish o'rniga pastki qism
        ishlatiladi: video ko'rinib turadi va odam qaysi kadr
        haqida gap ketayotganini yodida saqlaydi.
      */}
      {isSheetOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Yopish"
            onClick={() => setIsSheetOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />

          <div className="animate-fade-up relative max-h-[70%] overflow-y-auto rounded-t-2xl bg-black/80 p-4 pb-8 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                {`Videodagi mahsulotlar (${post.products.length})`}
              </p>

              <button
                type="button"
                aria-label="Yopish"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-full bg-white/15 p-1.5 text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="space-y-2">
              {post.products.map((item) => (
                <li key={item.id}>
                  <ProductButton product={item} onClick={() => onProductClick(item.id)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isShareOpen && (
        <ShareSheet post={post} onShared={onShared} onClose={() => setIsShareOpen(false)} />
      )}
    </div>
  );
}

/** Tomosha tezliklari — barmoq bilan aylantirishga qulay qisqa ro'yxat. */
const SPEEDS: readonly number[] = [1, 1.5, 2, 0.5];

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
function ProductButton({
  product,
  onClick,
}: {
  product: PostView['products'][number];
  onClick: () => void;
}) {
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
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-black/50 p-2.5 backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      {content}
    </Link>
  );
}
