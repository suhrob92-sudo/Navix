'use client';

import type { AttachmentKindName } from '@/config/attachments';
import { LINKED_POSTS_HINT, LINKED_POSTS_TITLE, linkedPostsPath } from '@/config/linked-posts';
import { VideoGrid } from '@/components/feed/video-grid';
import { useApiQuery } from '@/hooks/use-api';
import type { PostView } from '@/modules/feed/feed.types';

export interface LinkedPostsProps {
  kind: AttachmentKindName;
  /**
   * Nishonning ID si.
   *
   * `null` bo'lishi mumkin: sahifa ma'lumotni o'zi yuklaydi va
   * birinchi chizishda mahsulot hali kelmagan bo'ladi. Shunda so'rov
   * umuman yuborilmaydi.
   */
  targetId: string | null;
}

/**
 * "Shu narsa ko'rsatilgan videolar" — ekotizim sahifasidagi tasma.
 *
 * ── Nima uchun BITTA komponent to'rtta sahifaga ───────────────────────
 * Mahsulot, restoran, ish va mehmonxona sahifalari bir-biriga
 * o'xshamaydi, lekin bu bo'lim ularning hammasida bir xil ishlaydi.
 * Har birida alohida yozilsa, sarlavha uslubi to'rt xil bo'lardi va
 * biridagi tuzatish qolgan uchtasiga yetib bormasdi.
 *
 * ── Nima uchun YUKLANAYOTGANDA hech narsa ko'rsatilmaydi ──────────────
 * Ko'pchilik mahsulotning videosi YO'Q — bu normal holat. Yuklanish
 * paytida sarlavha va kulrang to'rtburchaklar chizilsa, ular bir
 * soniyadan keyin yo'qolardi va sahifa sakrab ketardi. Odam esa
 * "nimadir bor edi, qayoqqa ketdi?" deb o'ylardi.
 *
 * Shuning uchun bo'lim faqat MAZMUN bilan birga paydo bo'ladi.
 *
 * ── Nima uchun XATO ko'rsatilmaydi ────────────────────────────────────
 * Bu bo'lim sahifaning asosiy vazifasi emas. So'rov uzilsa, xarid
 * qilishga kelgan odamga qizil ogohlantirish ko'rsatish uni
 * bezovta qilardi — holbuki mahsulot sahifasi to'liq ishlayapti.
 */
export function LinkedPosts({ kind, targetId }: LinkedPostsProps) {
  const { data, error } = useApiQuery<{ posts: PostView[] }>(
    targetId ? linkedPostsPath(kind, targetId) : null,
  );

  const posts = data?.posts ?? [];

  if (error !== null || posts.length === 0) return null;

  return (
    <section aria-label={LINKED_POSTS_TITLE[kind]}>
      <h2 className="text-sm font-semibold">{LINKED_POSTS_TITLE[kind]}</h2>
      <p className="text-muted-foreground mt-0.5 mb-3 text-xs">{LINKED_POSTS_HINT}</p>

      <VideoGrid posts={posts} layout="row" href={(post) => `/feed/${post.id}`} />
    </section>
  );
}
