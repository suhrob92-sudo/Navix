'use client';

import { EyeOff, Undo2 } from 'lucide-react';

import { PostCard } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
import type { PostActions } from '@/hooks/use-post-actions';
import type { PostView } from '@/modules/feed/feed.types';

export interface PostListProps {
  posts: PostView[];
  actions: PostActions;
  /** O'chirish va tahrirlash tugmalari ko'rinsinmi (o'z postlarida). */
  canManage?: boolean;
  /**
   * Ko'ruvchining joylashuvi — masofa ko'rsatish uchun.
   *
   * Faqat "Yaqin atrofda" bo'limida beriladi. Qolgan joylarda
   * masofa ma'nosiz: odam butun mamlakat lentasini ko'rayotganda
   * "480 km" degan yozuv hech narsa bermaydi.
   */
  viewerPoint?: { latitude: number; longitude: number } | null;
  /**
   * "Bu qiziq emas" tugmasi ishlasinmi.
   *
   * ── Nima uchun har joyda emas ───────────────────────────────────────
   * Lenta TAKLIF qiladi: postni men so'ramadim, tizim tanladi. U
   * yerda "bunday ko'rsatma" deyish mantiqiy.
   *
   * Saqlanganlar, mavzu sahifasi va profilda esa post ANIQ so'rov
   * bo'yicha turibdi. U yerda yashirish tugmasi savol tug'dirardi:
   * "o'zim so'ragan narsani nega yashiraman?"
   */
  canHide?: boolean;
  /**
   * Mahkamlash tugmasi ishlasinmi.
   *
   * FAQAT profil sahifasida: mahkamlash profil ko'rinishi haqidagi
   * qaror va lentada uning natijasi ko'rinmaydi.
   */
  canPin?: boolean;
  /**
   * "To'plamga solish" bosilganda chaqiriladi.
   *
   * FAQAT "Saqlanganlar" sahifasida beriladi. Berilmasa, band
   * menyuda umuman ko'rinmaydi.
   */
  onChooseCollection?: (post: PostView) => void;
}

/**
 * Postlar ro'yxati — barcha lentalar uchun BITTA ulanish joyi.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * Postlar TO'RT joyda ko'rsatiladi: lenta, saqlanganlar, mavzu
 * sahifasi va profil. Har birida `PostCard` ga o'nta tugma qo'lda
 * ulansa, ertaga yangi tugma qo'shilganda to'rt joyni tahrirlash
 * kerak bo'lardi va bittasi albatta unutilardi.
 *
 * Shu sababdan ulanish shu yerda — bir marta.
 */
export function PostList({
  posts,
  actions,
  canManage = true,
  viewerPoint = null,
  canHide = false,
  canPin = false,
  onChooseCollection,
}: PostListProps) {
  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
        >
          {actions.hiddenIds.has(post.id) ? (
            <HiddenPostStrip onUndo={() => actions.undoHide(post.id)} />
          ) : (
            <PostCard
              post={post}
              viewerPoint={viewerPoint}
              isBusy={actions.busyPostId === post.id}
              onToggleLike={() => actions.toggleLike(post)}
              onDoubleTapLike={() => actions.likeOnly(post)}
              onToggleSave={() => actions.toggleSave(post)}
              onShared={() => void actions.sharePost(post)}
              onAttachmentClick={(attachmentId) => actions.trackAttachmentClick(post.id, attachmentId)}
              onReport={(reason, note) => actions.reportPost(post.id, reason, note)}
              {...(canHide ? { onHide: () => actions.hidePost(post.id) } : {})}
              {...(canPin ? { onTogglePin: () => void actions.togglePin(post) } : {})}
              {...(onChooseCollection ? { onChooseCollection: () => onChooseCollection(post) } : {})}
              {...(canManage
                ? {
                    onEdit: (body: string) => actions.editPost(post.id, body),
                    onDelete: () => actions.deletePost(post.id),
                  }
                : {})}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Yashirilgan postning o'rnidagi yozuv.
 *
 * ── Nima uchun post shu zahoti YO'QOLMAYDI ───────────────────────────
 * "Qiziq emas" menyuda turadi va tasodifan bosilishi juda oson.
 * Post darhol yo'qolsa, uni qaytarishning yo'li qolmasdi: odam
 * na muallifini, na matnini eslay oladi.
 *
 * ── Nima uchun balandligi KICHIK ─────────────────────────────────────
 * Post o'rnida shuncha joy qolsa, lenta teshikka to'lib ketardi.
 * Bu yozuv esa bir qatorda turadi va sahifa yangilanishi bilan
 * butunlay yo'qoladi.
 */
function HiddenPostStrip({ onUndo }: { onUndo: () => void }) {
  return (
    <div className="border-border bg-secondary/40 flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3">
      <EyeOff className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

      <p className="text-muted-foreground min-w-0 flex-1 text-sm">
        Post yashirildi. Endi bunga o&apos;xshash postlar kamroq ko&apos;rinadi.
      </p>

      <Button type="button" variant="ghost" size="sm" onClick={onUndo}>
        <Undo2 className="size-4" aria-hidden="true" />
        Qaytarish
      </Button>
    </div>
  );
}
