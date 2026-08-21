'use client';

import {
  BadgeCheck,
  Bookmark,
  Eye,
  Heart,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Pause,
  RotateCcw,
  RotateCw,
  Share2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { AttachmentButton } from '@/components/feed/attachment-button';
import { PostCtaButton } from '@/components/feed/post-cta-button';
import { RichText } from '@/components/feed/rich-text';

import { SponsoredBadge } from '@/components/feed/sponsored-badge';
import { Avatar } from '@/components/ui/avatar';
import { useTrimmedVideo } from '@/hooks/use-trimmed-video';
import { useWatchSettings } from '@/hooks/use-watch-settings';
import { WATCH_SPEEDS } from '@/lib/watch-preference';
import { cn } from '@/lib/utils';
import {
  authorDisplayName,
  formatReactionCount,
  SHORT_VIDEO_SECONDS,
  type PostView,
} from '@/modules/feed/feed.types';
import { readTrim } from '@/modules/feed/video-trim';
import { formatDuration } from '@/modules/upload/upload.types';

/**
 * Ulashish oynasi DANGASA yuklanadi.
 *
 * Lentada o'nlab kartochka bo'ladi, ulashish esa bittasida va
 * kamdan-kam bosiladi. Oddiy `import` bilan uning kodi lentaga
 * kirgan har bir odamga yuklanardi.
 */
const ShareSheet = dynamic(
  () => import('@/components/feed/share-sheet').then((m) => m.ShareSheet),
  { ssr: false },
);

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
  /** Biriktirma tugmasi bosildi — muallif ko'rsatkichi uchun. */
  onAttachmentClick: (attachmentId: string) => void;
  /** Video ko'rildi deb belgilash — bir ochilishda BIR MARTA. */
  onViewed?: () => void;
  /**
   * UZUN video oxirigacha ko'rildi — keyingisiga o'tish mumkin.
   *
   * ── Nima uchun faqat uzun videoda ───────────────────────────────────
   * Qisqa video TAKRORLANADI va bu to'g'ri: 15 soniyalik reel
   * ikkinchi aylanishda ham qiziq, odam ko'pincha uni ataylab
   * qayta ko'radi.
   *
   * 10 daqiqalik video esa boshqa: u tugagach takrorlansa, odam
   * o'zi to'xtatmaguncha bir xil videoni qayta-qayta ko'rardi va
   * trafik bekorga sarflanardi.
   */
  onEnded?: () => void;
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
  onAttachmentClick,
  onViewed,
  onEnded,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Odam qo'lda to'xtatganmi — faollik o'zgarsa ham tiklanmaydi. */
  const [isPaused, setIsPaused] = useState(false);

  /**
   * Tomosha tezligi — QURILMADA eslab qolinadi.
   *
   * ── Nima uchun komponent ichida saqlanmaydi ─────────────────────────
   * Ilgari u har bir video uchun alohida edi: odam 1.5x qo'yib,
   * keyingi videoga o'tsa — tezlik yana 1x bo'lardi. Dars yoki
   * uzun vlog ko'rayotgan odam uni HAR videoda qayta bosardi.
   */
  const { speed, setSpeed } = useWatchSettings();

  /**
   * Video BUFERGA yig'ilyaptimi (internet sekin).
   *
   * ── Nima uchun buni ko'rsatish SHART ────────────────────────────────
   * Sekin internetda video jimgina to'xtaydi: ekranda qotib qolgan
   * kadr turadi. Odam esa buni "ilova buzildi" deb tushunadi va
   * ilovani yopadi.
   *
   * Bitta aylanuvchi belgi bu xulosani butunlay o'zgartiradi:
   * "internet sekin ekan, kutaman".
   */
  const [isBuffering, setIsBuffering] = useState(false);

  /**
   * Hozirgi o'rin va uzunlik — surish paneli uchun.
   *
   * ── Nima uchun UZUN videoda shart ───────────────────────────────────
   * 60 soniyalik videoda surish paneli keraksiz edi: odam kutib
   * tursa ham video tugardi.
   *
   * 10 daqiqalik videoda esa u YAGONA boshqaruv: qiziq joyni
   * qidirish, o'tkazib yuborish, qaytarib ko'rish — hammasi shu
   * panel orqali bo'ladi. Usiz uzun video umuman tomosha qilib
   * bo'lmaydigan holga kelardi.
   */
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(0);

  /** Biriktirmalar ro'yxati ochilganmi (bittadan ko'p bo'lsa). */
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

  /**
   * Video UZUNMI — takrorlash va surish paneli shunga bog'liq.
   *
   * ── Nima uchun `videoSeconds`, faylning o'zi emas ───────────────────
   * Faylning uzunligi metama'lumot yuklangandan KEYIN ma'lum
   * bo'ladi. Ya'ni birinchi soniyalarda video "qisqa" deb
   * hisoblanib, takrorlash yoqilib qolardi.
   *
   * `videoSeconds` esa serverdan darhol keladi va u kesimdan
   * keyingi haqiqiy uzunlik.
   */
  const isLong = (post.videoSeconds ?? 0) > SHORT_VIDEO_SECONDS;

  /**
   * Muallif kesgan qism KO'RSATILMAYDI.
   *
   * `loop` — faqat QISQA videoda. 15 soniyalik reel ikkinchi
   * aylanishda ham qiziq va odam uni ataylab qayta ko'radi.
   *
   * 10 daqiqalik video esa tugagach takrorlansa, odam o'zi
   * to'xtatmaguncha bir xil videoni qayta-qayta ko'rardi —
   * trafik ham, batareya ham bekorga sarflanardi.
   */
  const { rewind } = useTrimmedVideo(videoRef, post, {
    loop: !isLong,
    ...(isLong && onEnded ? { onEnded } : {}),
  });

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);
  const shareText = formatReactionCount(post.shareCount);

  /*
    Surish paneli KESIM bo'yicha hisoblanadi, fayl bo'yicha emas.

    Muallif 10 daqiqalik videoning 2-5 daqiqasini qoldirgan bo'lsa,
    tomoshabin uchun bu video "3 daqiqa" va u "0:00" dan boshlanadi.
    Fayl vaqti ko'rsatilsa, panel "2:00" dan boshlanib, oxiri
    "5:00" da tugardi — hech kim tushunmasdi.
  */
  const trim = readTrim(post);
  const rangeStart = trim ? trim.start : 0;
  const rangeEnd = trim ? trim.end : total;
  const span = Math.max(0, rangeEnd - rangeStart);
  const elapsed = Math.min(Math.max(position - rangeStart, 0), span);

  /*
    Panel FAQAT uzun videoda ko'rinadi.

    Bir daqiqalik videoda u ekranni band qilardi va foydasi
    yo'q edi: odam kutib tursa ham video tugaydi. Uzun videoda
    esa aksincha — usiz tomosha qilib bo'lmaydi.
  */
  const hasSeekBar = isLong && span > 0;

  /**
   * Kesim ichidagi vaqtga suradi.
   *
   * @param offset Kesim boshidan sanalgan soniya.
   *
   * Chegara majburiy: kesimdan tashqariga surilsa, muallif
   * yashirgan kadrlar ko'rinib ketardi.
   */
  function seekTo(offset: number) {
    const element = videoRef.current;
    if (!element) return;

    const next = rangeStart + Math.min(Math.max(offset, 0), span);

    element.currentTime = next;

    /*
      Holat DARHOL yangilanadi.

      `timeupdate` hodisasini kutilsa, surgich barmoq ostida
      bir lahzaga eski joyiga sakrab qaytardi — bu buzuqlikdek
      ko'rinardi.
    */
    setPosition(next);
  }

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

  /**
   * KESILMAGAN uzun video tugaganda.
   *
   * ── Nima uchun alohida effekt ───────────────────────────────────────
   * Kesilgan videoda "tugadi" xabarini `useTrimmedVideo` beradi:
   * u faylning oxirigacha yetmaydi va brauzer `ended` chiqarmaydi.
   *
   * Kesilmagan videoda esa aksincha — u yerda faqat brauzerning
   * `ended` hodisasi bor. Ikkala yo'l ham kerak, aks holda
   * videolarning yarmida avtomatik o'tish ishlamasdi.
   */
  const endedRef = useRef(onEnded);

  /*
    Havola EFFEKT ichida yangilanadi.

    Chizish paytida yozish React qoidasini buzadi: chizish sof
    bo'lishi kerak va uni yarim yo'lda to'xtatib, qaytadan
    boshlash mumkin. Bunday holatda ref eski qiymatda qolib
    ketishi mumkin edi.
  */
  useEffect(() => {
    endedRef.current = onEnded;
  }, [onEnded]);

  const isTrimmed = trim !== null;

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !isLong || isTrimmed) return;

    const onNativeEnded = () => endedRef.current?.();

    element.addEventListener('ended', onNativeEnded);

    return () => element.removeEventListener('ended', onNativeEnded);
  }, [isLong, isTrimmed]);

  /**
   * Vaqtni KUZATISH.
   *
   * ── Nima uchun `requestAnimationFrame` emas ─────────────────────────
   * `timeupdate` sekundiga 4-5 marta keladi va surish paneli uchun bu
   * yetarli. Har kadrda yangilash esa telefonni bekorga qizdirardi.
   */
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const onTime = () => setPosition(element.currentTime);
    const onMeta = () => setTotal(Number.isFinite(element.duration) ? element.duration : 0);

    /*
      Uchta hodisa — bittasi yetarli emas.

      `waiting` — ma'lumot tugadi, kutilyapti.
      `playing` — qaytadan o'ynay boshladi.
      `canplay`  — yetarli ma'lumot yig'ildi.

      Faqat `waiting` va `playing` ishlatilsa, ba'zi brauzerlarda
      belgi ekranda osilib qolardi: ular to'xtashdan keyin
      `playing` emas, `canplay` chiqaradi.
    */
    const onWaiting = () => setIsBuffering(true);
    const onReady = () => setIsBuffering(false);

    element.addEventListener('timeupdate', onTime);
    element.addEventListener('loadedmetadata', onMeta);
    element.addEventListener('waiting', onWaiting);
    element.addEventListener('playing', onReady);
    element.addEventListener('canplay', onReady);

    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) onMeta();

    return () => {
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('loadedmetadata', onMeta);
      element.removeEventListener('waiting', onWaiting);
      element.removeEventListener('playing', onReady);
      element.removeEventListener('canplay', onReady);
    };
  }, []);

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
      //
      // "Boshi" — kesim boshi. `currentTime = 0` yozilsa, muallif
      // kesib tashlagan qism bir lahzaga ko'rinib ketardi.
      if (!isActive) rewind();
    }
  }, [isActive, isPaused, speed, onViewed, rewind]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={post.videoUrl ?? undefined}
        poster={post.videoPosterUrl ?? undefined}
        muted={isMuted}
        /*
          Brauzerning O'Z takrorlashi — faqat qisqa videoda.

          Kesilgan videoda uni `useTrimmedVideo` boshqaradi, lekin
          KESILMAGAN uzun videoda faqat shu xossa ishlaydi. Yoqiq
          qolsa, 10 daqiqalik video cheksiz takrorlanardi.
        */
        loop={!isLong}
        playsInline
        /*
          Ko'rinmayotgan video: muqova bo'lsa — UMUMAN yuklanmaydi.

          Ilgari `metadata` edi va tasmadagi har bir video kamida
          bitta so'rov yuborardi. Muqova bor bo'lsa uning ma'nosi
          yo'q: ekranda baribir o'sha kadr turadi.
        */
        preload={isActive ? 'auto' : post.videoPosterUrl ? 'none' : 'metadata'}
        className="h-full w-full object-contain"
        onClick={handleTap}
      />

      {/* Ikki marta bosilganda uchib chiqadigan yurakcha. */}
      {isHeartFlying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart className="animate-heart-pop size-24 fill-white text-white drop-shadow-lg" aria-hidden="true" />
        </div>
      )}

      {/*
        Internet sekin — aylanuvchi belgi.

        ── Nima uchun to'xtatish belgisidan OLDIN tekshiriladi ────
        Odam videoni qo'lda to'xtatgan bo'lsa, "internet sekin"
        deb aytish yolg'on bo'lardi. Shuning uchun belgi faqat
        o'ynayotgan, lekin ma'lumot kutayotgan videoda chiqadi.
      */}
      {isBuffering && isActive && !isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 backdrop-blur-sm">
            <Loader2 className="size-4 animate-spin text-white" aria-hidden="true" />
            <span className="text-xs text-white">Internet sekin...</span>
          </span>
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
        className="tap-target absolute top-4 right-4 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-95"
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
        onClick={() => setSpeed(WATCH_SPEEDS[(WATCH_SPEEDS.indexOf(speed) + 1) % WATCH_SPEEDS.length])}
        aria-label={`Tezlik: ${speed}x`}
        className="tap-target absolute top-16 right-4 rounded-full bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-transform active:scale-95"
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
          className="tap-target flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
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
          className="tap-target flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
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
          className="tap-target flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
        >
          <Share2 className="size-7 drop-shadow" aria-hidden="true" />
          <span className="text-xs font-medium tabular-nums drop-shadow">{shareText || '0'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={post.isSaved}
          aria-label={post.isSaved ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
          className="tap-target flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
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
        <Link href={`/u/${post.author.username}`} className="tap-target tap-target-y flex items-center gap-2.5">
          <Avatar src={post.author.avatarUrl} name={post.author.fullName} size="sm" />

          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white drop-shadow">{name}</span>
            {post.author.isVerified && (
              <BadgeCheck className="size-4 text-white drop-shadow" aria-label="Tasdiqlangan profil" />
            )}

            {/* Reklama nishoni — to'liq ekranda ham muallif nomi yonida. */}
            {post.isSponsored && <SponsoredBadge onMedia />}
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

        {post.attachments.length === 1 && (
          <AttachmentButton
            attachment={post.attachments[0]}
            onVideo
            onClick={() => onAttachmentClick(post.attachments[0].id)}
          />
        )}

        {/*
          Bir nechta biriktirma bo'lsa — BITTA tugma va ro'yxat.

          Hammasini birdan ko'rsatish videoning yarmini bosib
          qo'yardi: odam esa avval videoni ko'rgani kelgan.
        */}
        {post.attachments.length > 1 && (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-black/50 p-2.5 backdrop-blur-md transition-transform active:scale-[0.98]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Link2 className="size-5 text-white" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-medium text-white">
                {`${post.attachments.length} ta havola`}
              </span>
              <span className="block truncate text-xs text-white/70">
                {post.attachments.map((item) => item.name).join(', ')}
              </span>
            </span>

            <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">
              Ko&apos;rish
            </span>
          </button>
        )}

        {/*
          Chaqiruv — biriktirmalardan KEYIN.

          Biriktirma ekotizimga olib boradi, chaqiruv esa muallifga.
          U yakuniy qadam va shu sababdan eng pastda turadi.
        */}
        <PostCtaButton post={post} onVideo />

        {/*
          Surish paneli — eng pastda, chaqiruvdan ham keyin.

          Yuqoriroqqa qo'yilsa, u matn bilan chaqiruv orasiga
          kirib qolardi va odam o'qiyotganda tasodifan surib
          yuborardi. Pastki chekka esa telefonda bosh barmoq eng
          oson yetadigan joy.
        */}
        {hasSeekBar && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => seekTo(elapsed - SKIP_SECONDS)}
              aria-label={`${SKIP_SECONDS} soniya orqaga`}
              className="shrink-0 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-transform active:scale-90"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>

            <span className="shrink-0 text-[11px] font-medium text-white/90 tabular-nums drop-shadow">
              {formatDuration(elapsed)}
            </span>

            {/*
              Oddiy `range` — yasama surgich emas.

              Yasama boshqaruv ekran o'quvchi dasturlar uchun
              ko'rinmas bo'lardi va klaviatura bilan boshqarilmasdi.
              Bu esa strelka tugmalari bilan ham ishlaydi.
            */}
            <input
              type="range"
              min={0}
              max={span}
              /*
                Qadam 1 soniya.

                10 daqiqalik videoda o'ndan bir soniyalik qadam
                6000 ta pog'ona degani: barmoq bilan aniq nuqtaga
                tushib bo'lmasdi.
              */
              step={1}
              value={elapsed}
              aria-label="Video vaqti"
              aria-valuetext={`${formatDuration(elapsed)} / ${formatDuration(span)}`}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-white"
            />

            <span className="shrink-0 text-[11px] font-medium text-white/70 tabular-nums drop-shadow">
              {formatDuration(span)}
            </span>

            <button
              type="button"
              onClick={() => seekTo(elapsed + SKIP_SECONDS)}
              aria-label={`${SKIP_SECONDS} soniya oldinga`}
              className="shrink-0 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition-transform active:scale-90"
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/*
        Biriktirmalar ro'yxati — pastdan chiqadigan varaq.

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
                {`Videodagi havolalar (${post.attachments.length})`}
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
              {post.attachments.map((item) => (
                <li key={item.id}>
                  <AttachmentButton
                    attachment={item}
                    onVideo
                    onClick={() => onAttachmentClick(item.id)}
                  />
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

/**
 * Bir bosishda o'tkaziladigan vaqt.
 *
 * ── Nima uchun 10 soniya ──────────────────────────────────────────────
 * Barcha pleyerlarda shu son ishlatiladi va odam uni o'rgatmasdan
 * biladi. Kamrog'i (5) uzun videoda foydasiz bo'lardi, ko'prog'i
 * (30) esa kerakli joyni oshirib yuborardi.
 */
const SKIP_SECONDS = 10;
