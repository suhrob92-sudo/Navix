'use client';

import { History, Link2, MapPin, Megaphone, Scissors, Send, Sparkles, Video, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PickedAttachment } from '@/components/feed/attachment-picker';
import type { PickedCta } from '@/components/feed/cta-picker';
import type { VideoEdit } from '@/components/feed/video-editor';
import { POST_CATEGORIES } from '@/config/feed-nav';
import { ImageAttach } from '@/components/upload/image-attach';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFileUpload } from '@/hooks/use-file-upload';
import { dialogCancelHandler } from '@/lib/dialog';
import { SPONSORED_TOGGLE_HINT, SPONSORED_TOGGLE_LABEL } from '@/config/disclosure';
import { assistPost } from '@/modules/feed/feed-assist';
import { cn } from '@/lib/utils';
import { prepareVideo, uploadVideo } from '@/lib/video-upload';
import { useAuth } from '@/modules/auth/auth-context';
import {
  DRAFT_DISCARD_LABEL,
  DRAFT_RESTORED_LABEL,
  DRAFT_SAVE_DELAY_MS,
} from '@/config/draft';
import { clearDraft, getDraft, saveDraft } from '@/lib/post-draft';
import {
  POST_MAX_LENGTH,
  type PostCategoryName,
  type PostPlaceView,
} from '@/modules/feed/feed.types';
import { ATTACHMENT_KIND_CONFIG, MAX_ATTACHMENTS } from '@/config/attachments';
import { POST_CTA_CONFIG } from '@/config/post-cta';
import { MAX_VIDEO_SECONDS, formatDuration } from '@/modules/upload/upload.types';

/** Yuborilayotgan postning to'liq tarkibi. */
/**
 * Oynalar DANGASA yuklanadi.
 *
 * ── Nima uchun (O'LCHANGAN muammo) ────────────────────────────────────
 * Post yozish oynasi to'rtta tanlagichni va video muharririni ichiga
 * oladi. Ular oddiy `import` bilan bog'langanda, lentaga kirgan HAR
 * BIR odam ularni yuklab olardi — hatto post yozmasa ham.
 *
 * O'lchov: `/feed` sahifasi 1227 KB JavaScript yuklardi. Sekin
 * internetda bu bir necha soniya bo'sh ekran degani.
 *
 * `dynamic` bilan ular oyna OCHILGANDA yuklanadi. Odam tugmani
 * bosgan payt esa u allaqachon kutishga tayyor.
 *
 * ── Nima uchun `ssr: false` ───────────────────────────────────────────
 * Bu oynalar faqat bosilgandan keyin paydo bo'ladi — serverda
 * chizishning ma'nosi yo'q. Ular brauzer imkoniyatlariga
 * (fayl tanlash, kamera) tayanadi va serverda baribir ishlamaydi.
 */
const LocationPicker = dynamic(
  () => import('@/components/feed/location-picker').then((m) => m.LocationPicker),
  { ssr: false },
);

const AttachmentPicker = dynamic(
  () => import('@/components/feed/attachment-picker').then((m) => m.AttachmentPicker),
  { ssr: false },
);

const CtaPicker = dynamic(() => import('@/components/feed/cta-picker').then((m) => m.CtaPicker), {
  ssr: false,
});

const VideoEditor = dynamic(
  () => import('@/components/feed/video-editor').then((m) => m.VideoEditor),
  { ssr: false },
);

export interface ComposerDraft {
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  videoSeconds: number | null;
  /** Kesish nuqtalari — muharrirdan. Kesilmagan videoda `null`. */
  videoStartSeconds: number | null;
  videoEndSeconds: number | null;
  attachments: { kind: PickedAttachment['kind']; targetId: string }[];
  /** Videoning chaqiruvi. `null` — muallif qo'ymagan. */
  cta: PickedCta | null;
  /** Qaysi bo'limga tegishli. `null` — tanlanmagan. */
  category: PostCategoryName | null;
  /** Biriktirilgan joylashuv. `null` — qo'shilmagan. */
  place: PostPlaceView | null;
  /** Muallif postda reklama borligini bildirdimi. */
  isSponsored: boolean;
}

export interface PostComposerProps {
  isSending: boolean;
  onSubmit: (draft: ComposerDraft) => Promise<boolean>;
  /** Oynani yopish. */
  onClose: () => void;
  /**
   * "+" dan qaysi tur tanlangan.
   *
   * ── HAQIQIY XATO: video umuman tanlanmasdi ──────────────────────────
   * Ilgari bu bayroq fayl tanlagichni O'ZI ochardi: oyna ochilgach
   * `setTimeout` bilan `input.click()` chaqirilardi.
   *
   * Telefon brauzerlari buni RAD ETADI. Galereyani faqat odamning
   * o'z harakati (bosish) ocha oladi; kechiktirilgan chaqiruv esa
   * "foydalanuvchi harakati" hisoblanmaydi va jimgina e'tiborsiz
   * qoldiriladi.
   *
   * Natijada odam "+" → "Video yaratish" bosardi, oyna ochilardi va
   * HECH NARSA bo'lmasdi: na galereya, na xato. Tabiiyki, "video
   * yuklab bo'lmayapti" degan xulosa chiqardi.
   *
   * Endi bayroq boshqa ish qiladi: video tanlash tugmasini KATTA va
   * ko'rinadigan qilib chizadi. Uni odamning o'zi bosadi — bu esa
   * har qanday brauzerda ishlaydi.
   */
  autoPick?: 'VIDEO' | null;
  /**
   * Yuborishdagi xato.
   *
   * ── Nima uchun oynaning ICHIDA ──────────────────────────────────────
   * Oyna modal: u ortidagi hamma narsani to'sadi. Xato tashqarida
   * chizilsa, odam uni umuman ko'rmasdi — "Joylash" bosilib, hech
   * narsa bo'lmagandek tuyulardi.
   */
  error?: string | null;
}

/**
 * Post yozish maydoni.
 *
 * ── Nima uchun matn SHU YERDA saqlanadi ──────────────────────────────
 * Yozilayotgan matn ota komponentga chiqarilsa, lenta har yangilanganda
 * (yoqtirish, yangi post) qayta chizilib, yozib bo'lingan matn
 * yo'qolib ketardi.
 *
 * `onSubmit` `true` qaytarsa — yuborildi, maydon tozalanadi. `false`
 * bo'lsa matn joyida qoladi: xato bo'lganda odam hammasini qaytadan
 * yozishga majbur bo'lmasligi kerak.
 *
 * ── Nima uchun rasm va video BIRGA bo'lmaydi ─────────────────────────
 * Ikkalasi ham bo'lsa, lentada qaysi birini ko'rsatish noaniq
 * bo'lardi. Bitta postda bitta media — qoida oddiy va tushunarli.
 */
export function PostComposer({
  isSending,
  onSubmit,
  onClose,
  autoPick = null,
  error = null,
}: PostComposerProps) {
  const { accessToken, user } = useAuth();

  /*
    Qoralama BIR MARTA, birinchi chizishda o'qiladi.

    ── Nima uchun `useEffect` emas ─────────────────────────────────────
    Effekt ichida o'qib `setState` qilsak, oyna avval BO'SH chizilib,
    keyin to'lardi — ekran bir zumga sakrardi. Loyihaning lint
    qoidasi ham buni taqiqlaydi.

    Bu yerda dangasa boshlang'ich qiymat (`useState(() => ...)`)
    xavfsiz: oyna `ssr: false` bilan yuklanadi, ya'ni u serverda
    umuman chizilmaydi va `localStorage` doim mavjud bo'ladi.
  */
  const userId = user?.id ?? '';
  const [restored] = useState(() => (userId ? getDraft(userId) : null));
  const [isRestoredVisible, setIsRestoredVisible] = useState(restored !== null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [body, setBody] = useState(restored?.body ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(restored?.imageUrl ?? null);

  const [video, setVideo] = useState<{
    url: string;
    posterUrl: string | null;
    seconds: number;
    /** Kesim — kesilmagan videoda `null`. */
    trim: { start: number; end: number } | null;
  } | null>(restored?.video ?? null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  /**
   * Yuklash jarayoni (0-100). `null` — hali boshlanmagan.
   *
   * ── Nima uchun uzun videoda SHART ───────────────────────────────────
   * 200 MB lik fayl mobil internetda bir necha daqiqa yuklanadi.
   * Jarayonsiz ekranda faqat "Yuklanmoqda…" turardi va odam ilova
   * qotib qolgan deb o'ylab, sahifani yopardi — yuklash esa
   * boshidan boshlanardi.
   */
  const [progress, setProgress] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  /**
   * Tahrirlanayotgan fayl — hali YUKLANMAGAN.
   *
   * ── Nima uchun muharrir yuklashdan OLDIN ────────────────────────────
   * Tahrir brauzerda bajariladi: kadrlar mahalliy fayldan olinadi va
   * kesim faqat ikkita son. Yuklashdan keyin tahrirlansa, odam
   * ortiqcha qismni ham yuklab bo'lgan bo'lardi va uni bekor qilgan
   * taqdirda ham trafik allaqachon sarflanardi.
   *
   * Muhimrog'i: bekor qilish TOZA bo'ladi — omborda ortib qolgan
   * fayl qolmaydi.
   */
  const [pending, setPending] = useState<{ file: File; duration: number } | null>(null);

  const [attachments, setAttachments] = useState<PickedAttachment[]>(restored?.attachments ?? []);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  /** Videoning chaqiruvi — bittasi. */
  const [cta, setCta] = useState<PickedCta | null>(restored?.cta ?? null);
  const [isCtaOpen, setIsCtaOpen] = useState(false);

  /** Tanlangan bo'lim — ixtiyoriy. */
  const [category, setCategory] = useState<PostCategoryName | null>(restored?.category ?? null);

  /**
   * Reklama belgisi.
   *
   * ── Nima uchun odatda O'CHIQ ────────────────────────────────────────
   * Ko'pchilik post reklama emas. Yoqiq bo'lsa, nishon deyarli har
   * postda turib, ma'nosini butunlay yo'qotardi: odam uni ko'rmay
   * qo'yardi va aynan reklamali postda ham e'tibor bermasdi.
   */
  const [isSponsored, setIsSponsored] = useState(restored?.isSponsored ?? false);

  /** Biriktirilgan joylashuv — ixtiyoriy. */
  const [place, setPlace] = useState<PostPlaceView | null>(restored?.place ?? null);
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);

  const image = useFileUpload('POST');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /**
   * Yordamchi takliflari.
   *
   * ── Nima uchun SERVERGA so'rov yuborilmaydi ─────────────────────────
   * Butun hisob sof funksiyalardan iborat: bazaga ham, tarmoqqa ham
   * murojaat yo'q. Uni serverga chiqarish har harfda so'rov yuborish
   * degani bo'lardi — mobil trafik ham, kutish vaqti ham bekorga
   * sarflanardi.
   *
   * Brauzerda esa u BIR LAHZADA ishlaydi va internet uzilganda ham
   * ishlashda davom etadi.
   *
   * ── Nima uchun `useMemo` ────────────────────────────────────────────
   * Hisob har bosilgan harfda qayta bajariladi. U yengil, lekin
   * natijasi massiv va obyekt: har render'da yangisi yasalsa,
   * quyidagi ro'yxatlar bekorga qayta chizilardi.
   */
  const assist = useMemo(
    () =>
      assistPost({
        body,
        hasMedia: imageUrl !== null || video !== null,
        hasAttachments: attachments.length > 0,
        hasCta: cta !== null,
      }),
    [body, imageUrl, video, attachments.length, cta],
  );

  const trimmed = body.trim();
  /**
   * Rasm yoki video o'zi ham post bo'la oladi.
   *
   * "Mana shu manzara" degan postga matn shart emas.
   */
  const isEmpty = trimmed.length === 0 && imageUrl === null && video === null;
  const remaining = POST_MAX_LENGTH - body.length;
  const isBusy = isSending || image.isUploading || isUploadingVideo;

  /*
    Qoralama AVTOMATIK saqlanadi.

    ── Nima uchun kechiktirib ──────────────────────────────────────────
    Har bosilgan harfda saqlansa, `localStorage` sekundiga o'nlab
    marta yozilardi. U SINXRON ishlaydi — ya'ni yozayotgan paytda
    brauzer boshqa hech narsa qila olmaydi va matn kiritish
    sekinlashardi.

    Yarim soniya — odam bir so'zni yozib tugatadigan vaqt. Saqlash
    "pauza" paytlarida bo'ladi.

    ── Nima uchun VIDEO YUKLANAYOTGANDA saqlanmaydi ────────────────────
    Yuklanish tugamaguncha video manzili yo'q. O'sha paytdagi
    holatni saqlasak, qoralamada videosiz nusxa qolardi va odam
    uni tiklaganda video yo'qolgandek ko'rinardi.
  */
  useEffect(() => {
    if (!userId || isUploadingVideo || image.isUploading) return;

    const timer = window.setTimeout(() => {
      saveDraft(userId, {
        body,
        imageUrl,
        video,
        attachments,
        cta,
        category,
        place,
        isSponsored,
      });
    }, DRAFT_SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    userId,
    body,
    imageUrl,
    video,
    attachments,
    cta,
    category,
    place,
    isSponsored,
    isUploadingVideo,
    image.isUploading,
  ]);

  /** Qoralamani tashlab, oynani tozalaydi. */
  function discardDraft() {
    setBody('');
    setImageUrl(null);
    setVideo(null);
    setAttachments([]);
    setCta(null);
    setCategory(null);
    setPlace(null);
    setIsSponsored(false);
    setVideoError(null);
    setIsRestoredVisible(false);

    if (userId) clearDraft(userId);
  }

  async function send() {
    if (isEmpty || isBusy) return;

    const sent = await onSubmit({
      body: trimmed,
      imageUrl,
      videoUrl: video?.url ?? null,
      videoPosterUrl: video?.posterUrl ?? null,
      videoSeconds: video?.seconds ?? null,
      videoStartSeconds: video?.trim?.start ?? null,
      videoEndSeconds: video?.trim?.end ?? null,
      attachments: attachments.map((item) => ({ kind: item.kind, targetId: item.targetId })),
      cta,
      category,
      place,
      isSponsored,
    });

    if (sent) {
      /*
        Post joylandi — qoralama endi KERAK EMAS.

        Uni qoldirsak, keyingi safar oyna ochilganda allaqachon
        joylangan matn "tiklandi" deb chiqardi va odam uni
        ikkinchi marta joylab yuborardi.
      */
      discardDraft();
    }
  }

  async function attachImage(file: File) {
    const url = await image.upload(file);

    if (url) setImageUrl(url);
  }

  /**
   * Fayl tanlandi — avval TEKSHIRILADI, keyin muharrir ochiladi.
   *
   * ── Nima uchun tekshiruv muharrirdan oldin ──────────────────────────
   * Aks holda odam ikki daqiqalik videoni bemalol kesib, muqova
   * tanlab, oxirida "juda uzun" degan xatoni olardi — butun mehnati
   * behuda ketardi.
   */
  async function pickVideo(file: File) {
    setIsUploadingVideo(true);
    setVideoError(null);

    try {
      const { meta } = await prepareVideo(file);

      setPending({ file, duration: meta.seconds });
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Videoni o'qib bo'lmadi.");
    } finally {
      setIsUploadingVideo(false);
    }
  }

  /** Muharrir yakunlandi — endi fayl yuklanadi. */
  async function attachVideo(file: File, edit: VideoEdit) {
    setPending(null);
    setIsUploadingVideo(true);
    setVideoError(null);
    setProgress(0);

    try {
      const result = await uploadVideo(file, accessToken, {
        poster: edit.poster,
        seconds: edit.seconds,
        onProgress: setProgress,
      });

      setVideo({
        url: result.videoUrl,
        posterUrl: result.posterUrl,
        seconds: result.seconds,
        trim: edit.range,
      });

      // Video biriktirilganda rasm o'rnini bo'shatadi.
      setImageUrl(null);
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Videoni yuklab bo'lmadi.");
    } finally {
      setIsUploadingVideo(false);
      setProgress(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onClose)}
      className="glass animate-scale-in text-foreground m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Post joylash</h2>

        <Button type="button" variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/*
        Qoralama tiklanganini AYTAMIZ.

        ── Nima uchun bu yozuv shart ─────────────────────────────────
        Oyna to'la matn bilan ochilsa, odam "men buni yozganmidim?"
        deb hayron bo'ladi — ayniqsa bir necha kun o'tgan bo'lsa.

        Yozuv ikki narsani beradi: sabab va chiqish yo'li.
        "Tozalash" bosilsa, oyna bo'shaydi va qoralama o'chadi.
      */}
      {isRestoredVisible && (
        <div className="bg-secondary mb-3 flex items-center gap-2 rounded-xl px-3 py-2">
          <History className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

          <p className="text-muted-foreground flex-1 text-xs">{DRAFT_RESTORED_LABEL}</p>

          <button
            type="button"
            onClick={discardDraft}
            className="tap-target tap-target-y text-primary shrink-0 text-xs font-medium hover:underline"
          >
            {DRAFT_DISCARD_LABEL}
          </button>
        </div>
      )}

      <label htmlFor="post-body" className="sr-only">
        Post matni
      </label>

      <Textarea
        id="post-body"
        rows={3}
        maxLength={POST_MAX_LENGTH}
        value={body}
        disabled={isSending}
        placeholder="Nima yangilik?"
        onChange={(event) => setBody(event.target.value)}
      />

      {/*
        "Video yaratish" tanlangan bo'lsa — KATTA tugma.

        ── Nima uchun tugma, avtomatik ochilish emas ─────────────────
        Ilgari galereya o'zi ochilishga urinardi va telefon brauzeri
        uni rad etardi (sabab `autoPick` izohida). Odam bo'sh oyna
        oldida qolardi.

        Endi u aynan nima qilish kerakligini ko'radi va bir marta
        bosadi. Bosish — odamning o'z harakati, uni hech bir brauzer
        rad etmaydi.
      */}
      {autoPick === 'VIDEO' && !video && !imageUrl && (
        <label
          className={cn(
            'border-border hover:bg-secondary/50 mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            isBusy && 'pointer-events-none opacity-60',
          )}
        >
          <Video className="text-muted-foreground size-8" aria-hidden="true" />

          <span className="text-sm font-medium">
            {isUploadingVideo ? 'Video yuklanmoqda…' : 'Video tanlash'}
          </span>

          <span className="text-muted-foreground text-xs">
            {`Galereyadan tanlang — ${formatDuration(MAX_VIDEO_SECONDS)} gacha`}
          </span>

          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              const file = event.target.files?.[0];

              event.target.value = '';

              if (file) void pickVideo(file);
            }}
          />
        </label>
      )}

      {/*
        Bo'lim tanlash — IXTIYORIY.

        ── Nima uchun majburiy emas ──────────────────────────────────
        Oddiy post ("bugun havo yaxshi") hech qaysi bo'limga
        tushmaydi. Majburiy qilinsa, odam tasodifiy bo'limni tanlab
        qo'yardi va filtr yolg'on natija berardi.

        ── Nima uchun DOIRALAR, ro'yxat emas ─────────────────────────
        Telefonda ochiladigan ro'yxat ekranni yopadi va ikki bosish
        talab qiladi. Doiralar esa bir bosishda tanlanadi.
      */}
      <div className="mt-3">
        <p className="text-muted-foreground mb-2 text-xs">Bo&apos;lim (ixtiyoriy)</p>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {POST_CATEGORIES.map((item) => {
            const value = item.value as PostCategoryName;
            const isActive = category === value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={isBusy}
                aria-pressed={isActive}
                onClick={() => setCategory(isActive ? null : value)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors disabled:opacity-60',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border hover:bg-secondary',
                )}
              >
                <span aria-hidden="true">{item.emoji}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/*
        Yordamchi — bo'lim qatoridan KEYIN.

        ── Nima uchun ushbu tartib ───────────────────────────────────
        Yordamchi bo'lim TAKLIF qiladi. Taklif qatordan yuqorida
        tursa, odam avval taklifni ko'rib, keyin qaysi doirani
        bosishni qidirardi. Pastda esa u "mana shu" deb qatorga
        ishora qiladi.

        ── Nima uchun faqat KERAK bo'lganda ──────────────────────────
        Bo'sh maydonda taklif ham bo'lmaydi. Doim ko'rinib tursa,
        u ekranni band qilib, e'tiborni yo'qotardi.
      */}
      {/*
        BO'SH qoralamada yordamchi umuman ko'rinmaydi.

        ── HAQIQIY XATO, sinovda topilgan ────────────────────────
        Umumiy mavzular (#navix, #toshkent) matnsiz ham taklif
        qilinardi va panel kompozitor ochilishi bilan chiqib
        turardi.

        Odam hali bir harf ham yozmasdan turib maslahat ko'rsa,
        u "mendan nimadir talab qilinyapti" degan taassurot
        olardi. Yordam esa ish boshlangandan keyin kerak.
      */}
      {!isEmpty &&
        (assist.category !== null || assist.hashtags.length > 0 || assist.tips.length > 0) && (
        <div className="border-border bg-secondary/40 mt-3 space-y-2.5 rounded-xl border p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Yordamchi
          </p>

          {/*
            Bo'lim taklifi — FAQAT tanlanmagan bo'lsa.

            Odam o'zi tanlagan bo'limni "tuzatishga" urinish
            behurmatlik bo'lardi: u o'z postini bizdan yaxshiroq
            biladi.
          */}
          {assist.category !== null && category === null && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setCategory(assist.category)}
              className="border-border hover:bg-secondary flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors disabled:opacity-60"
            >
              <span className="min-w-0 flex-1">
                {`Bo'lim: `}
                <span className="font-medium">{assist.categoryLabel}</span>
              </span>

              <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                Tanlash
              </span>
            </button>
          )}

          {assist.hashtags.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">Mavzu qo&apos;shish</p>

              <div className="flex flex-wrap gap-1.5">
                {assist.hashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isBusy}
                    /*
                      Xeshteg matn OXIRIGA qo'shiladi.

                      Kursor turgan joyga qo'yish ham mumkin edi,
                      lekin u so'zning o'rtasiga tushib, matnni
                      buzib qo'yardi.
                    */
                    onClick={() =>
                      setBody((current) => {
                        const base = current.trimEnd();

                        return base.length === 0 ? `#${tag} ` : `${base} #${tag} `;
                      })
                    }
                    className="border-border hover:bg-secondary rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60"
                  >
                    {`#${tag}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {assist.tips.length > 0 && (
            <ul className="space-y-1">
              {assist.tips.map((tip) => (
                <li key={tip.code} className="text-muted-foreground text-xs leading-relaxed">
                  {`• ${tip.text}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/*
        Reklama belgisi — bo'lim tanlashdan KEYIN.

        ── Nima uchun aynan shu yer ──────────────────────────────────
        U "Joylash" tugmasiga eng yaqin joyda turadi: bloger postni
        tugatib, yuborish oldidan oxirgi marta o'ylab ko'radi.
        Yuqoriga qo'yilsa, u matn yozayotganda ko'rilib, keyin
        unutilardi.
      */}
      <label className="border-border mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={isSponsored}
          disabled={isBusy}
          onChange={(event) => setIsSponsored(event.target.checked)}
          className="accent-primary mt-0.5 size-4 shrink-0"
        />

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{SPONSORED_TOGGLE_LABEL}</span>
          <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
            {SPONSORED_TOGGLE_HINT}
          </span>
        </span>
      </label>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {image.error && (
        <Alert variant="error" className="mt-3">
          {image.error}
        </Alert>
      )}

      {videoError && (
        <Alert variant="error" className="mt-3">
          {videoError}
        </Alert>
      )}

      {/*
        Yuklash jarayoni.

        ── Nima uchun bu KERAK bo'lib qoldi ──────────────────────────
        Chegara 10 daqiqaga ko'tarilgach, fayl 200 MB gacha bo'lishi
        mumkin va u mobil internetda bir necha daqiqa yuklanadi.

        Jarayonsiz odam ilova qotib qolgan deb o'ylab, sahifani
        yopardi — yuklash esa boshidan boshlanardi.
      */}
      {isUploadingVideo && progress !== null && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">Video yuklanmoqda…</p>
            <p className="text-muted-foreground text-xs tabular-nums">{`${Math.round(progress)}%`}</p>
          </div>

          <div
            role="progressbar"
            aria-label="Video yuklanmoqda"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-secondary h-1.5 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>

          {/*
            Ogohlantirish — yuklash TUGAMAGUNCHA turadi.

            Odam oynani yopsa, yuklash uziladi va hammasi boshidan
            boshlanardi. Buni aytmasak, u buni faqat tajriba orqali
            bilib olardi.
          */}
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            Oynani yopmang — yuklash uzilib qoladi.
          </p>
        </div>
      )}

      {/* Biriktirilgan video — muqovasi bilan. */}
      {video && (
        <div className="border-border relative mt-3 overflow-hidden rounded-xl border">
          {video.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.posterUrl} alt="" className="max-h-56 w-full object-cover" />
          ) : (
            <div className="bg-secondary flex h-32 items-center justify-center">
              <Video className="text-muted-foreground size-8" aria-hidden="true" />
            </div>
          )}

          {/*
            Davomiylik va kesim belgisi.

            Kesilgan video uchun buni ko'rsatish SHART: aks holda odam
            tahrir saqlanganiga ishonch hosil qila olmasdi va "kesdim
            shekilli" degan noaniqlik bilan joylardi.
          */}
          <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            <span className="tabular-nums">{formatDuration(video.seconds)}</span>

            {video.trim && (
              <span className="flex items-center gap-1">
                <Scissors className="size-3" aria-hidden="true" />
                kesilgan
              </span>
            )}
          </span>

          <button
            type="button"
            aria-label="Videoni olib tashlash"
            disabled={isBusy}
            onClick={() => {
              setVideo(null);
              setAttachments([]);
            }}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Biriktirilganlar — faqat video bo'lganda. */}
      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachments.map((item) => {
            const config = ATTACHMENT_KIND_CONFIG[item.kind];
            const Icon = config.icon;

            return (
              <li
                key={`${item.kind}:${item.targetId}`}
                className="border-border bg-secondary/40 flex items-center gap-3 rounded-xl border p-2.5"
              >
                <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {/*
                      Tur nomi HAM ko'rsatiladi.

                      Ro'yxatda beshta har xil turdagi narsa turishi
                      mumkin va faqat nom bilan ular aralashib
                      ketardi: "Plov" — taommi yoki restoranmi?
                    */}
                    {[config.label, item.subtitle].filter(Boolean).join(' · ')}
                  </span>
                </span>

                <button
                  type="button"
                  aria-label={`${item.name} — olib tashlash`}
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter(
                        (row) => !(row.kind === item.kind && row.targetId === item.targetId),
                      ),
                    )
                  }
                  className="text-muted-foreground hover:text-destructive -m-1 shrink-0 rounded-lg p-1 transition-colors"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Rasm faqat video biriktirilmagan bo'lsa. */}
        {!video && (
          <ImageAttach
            value={imageUrl}
            isUploading={image.isUploading}
            disabled={isBusy}
            onSelect={(file) => void attachImage(file)}
            onRemove={() => setImageUrl(null)}
          />
        )}

        {/* Video faqat rasm biriktirilmagan bo'lsa. */}
        {!imageUrl && !video && (
          <label
            className={cn(
              'text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-lg p-2 text-sm transition-colors',
              isBusy && 'pointer-events-none opacity-60',
            )}
          >
            <Video className="size-5" aria-hidden="true" />
            <span className="text-xs">{isUploadingVideo ? 'Yuklanmoqda…' : 'Video'}</span>

            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                // Maydon tozalanadi: bir xil faylni qayta tanlash ham
                // hodisa hosil qilishi kerak.
                event.target.value = '';

                if (file) void pickVideo(file);
              }}
            />
          </label>
        )}

        {/*
          Biriktirish tugmasi FAQAT video biriktirilganda ko'rinadi.

          Oddiy postda tugma qo'yadigan joy yo'q va u reklama uchun
          eng oson yo'lga aylanardi.
        */}
        {video && attachments.length < MAX_ATTACHMENTS && (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => setIsPickerOpen(true)}>
            <Link2 className="size-4" aria-hidden="true" />
            {attachments.length === 0 ? 'Biriktirish' : "Yana qo'shish"}
          </Button>
        )}

        {/*
          Chaqiruv tugmasi — FAQAT videoda.

          ── Nima uchun sotadigan narsasiz ham kerak ─────────────────
          Ko'p video hech narsa sotmaydi: bloger kulgili video
          joylaydi, usta ish jarayonini ko'rsatadi. Ular ham bir
          narsaga chorlaydi — "obuna bo'l", "menga yozing".

          Chaqiruvsiz video tomosha bilan tugaydi va muallif hech
          narsa olmaydi.
        */}
        {video && (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => setIsCtaOpen(true)}>
            <Megaphone className="size-4" aria-hidden="true" />
            {cta ? POST_CTA_CONFIG[cta.kind].label : 'Chaqiruv'}
          </Button>
        )}

        {/*
          Joylashuv tugmasi — HAR QANDAY postga.

          ── Nima uchun faqat videoga emas ──────────────────────────
          "Chilonzorda ijaraga uy" degan matnli e'lon uchun joylashuv
          videodagidan ham muhimroq: odam aynan o'z rayonidagini
          qidiradi.
        */}
        {place ? (
          <span className="bg-secondary text-muted-foreground inline-flex max-w-[60%] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{place.name}</span>

            <button
              type="button"
              aria-label="Joylashuvni olib tashlash"
              onClick={() => setPlace(null)}
              className="hover:text-destructive -mr-1 shrink-0 rounded p-0.5 transition-colors"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => setIsPlaceOpen(true)}>
            <MapPin className="size-4" aria-hidden="true" />
            Joylashuv
          </Button>
        )}

        {/*
          Qolgan belgilar soni FAQAT oxiriga yaqinlashganda ko'rinadi.
          Doim ko'rinsa, u qisqa yozishga undab turadigan ortiqcha
          bosim bo'lardi.
        */}
        <span
          className={cn(
            'ml-auto text-xs tabular-nums',
            remaining > 100 ? 'invisible' : remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {remaining}
        </span>

        <Button type="submit" size="sm" disabled={isEmpty || isBusy} isLoading={isSending} loadingText="Yuborilmoqda...">
          <Send className="size-4" aria-hidden="true" />
          Joylash
        </Button>
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        {`Video ${formatDuration(MAX_VIDEO_SECONDS)} gacha. Videoga ${MAX_ATTACHMENTS} tagacha mahsulot, taom, restoran, ish yoki mehmonxona biriktirish mumkin — tomoshabin ularni bir bosishda topadi.`}
      </p>

      {/*
        Video muharriri — fayl tanlangach DARHOL ochiladi.

        ── Nima uchun majburiy qadam, ixtiyoriy tugma emas ────────────
        "Tahrirlash" tugmasini alohida qo'ysak, uni deyarli hech kim
        bosmasdi va lenta xom videolarga to'lib ketardi: qora birinchi
        kadr, ortiqcha boshlanish.

        Muharrir esa hech narsani majburlamaydi — "Davom etish" bir
        bosishda o'tkazib yuboradi. Lekin odam kamida BIR MARTA
        muqovani ko'radi va ko'pincha uni yaxshilaydi.
      */}
      {pending && (
        <VideoEditor
          file={pending.file}
          duration={pending.duration}
          onDone={(edit) => void attachVideo(pending.file, edit)}
          onCancel={() => setPending(null)}
        />
      )}

      {isPlaceOpen && (
        <LocationPicker
          onPick={(picked) => {
            setPlace(picked);
            setIsPlaceOpen(false);
          }}
          onCancel={() => setIsPlaceOpen(false)}
        />
      )}

      {isCtaOpen && (
        <CtaPicker
          value={cta}
          onPick={(picked) => {
            setCta(picked);
            setIsCtaOpen(false);
          }}
          onClear={() => {
            setCta(null);
            setIsCtaOpen(false);
          }}
          onCancel={() => setIsCtaOpen(false)}
        />
      )}

      {isPickerOpen && (
        <AttachmentPicker
          selected={attachments}
          onPick={(picked) => setAttachments((current) => [...current, picked])}
          onRemove={(kind, targetId) =>
            setAttachments((current) =>
              current.filter((row) => !(row.kind === kind && row.targetId === targetId)),
            )
          }
          onCancel={() => setIsPickerOpen(false)}
        />
      )}
      </form>
    </dialog>
  );
}
