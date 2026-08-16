'use client';

import { MessageCircle, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CommentItem } from '@/components/feed/comment-item';
import { PostCard } from '@/components/feed/post-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { toUserMessage } from '@/lib/api-client';
import { COMMENT_MAX_LENGTH, type CommentView, type PostResponse } from '@/modules/feed/feed.types';

export interface PostDetailContentProps {
  postId: string;
}

/**
 * Bitta post va uning izohlari.
 *
 * ── Nima uchun post va izohlar ALOHIDA so'raladi ─────────────────────
 * Izohlar ko'p bo'lishi mumkin va ular sahifalab yuklanadi. Ular post
 * bilan birga kelsa, birinchi so'rov og'irlashardi va postning o'zi
 * kechikib ko'rinardi.
 */
export function PostDetailContent({ postId }: PostDetailContentProps) {
  const request = useApiClient();
  const router = useRouter();

  const { data, isLoading, error, setData } = useApiQuery<PostResponse>(`/api/v1/posts/${postId}`);
  const comments = useCursorList<CommentView>(`/api/v1/posts/${postId}/comments`, 'comments');

  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const post = data?.post ?? null;

  /**
   * Post ustidagi amallar bitta elementli ro'yxat sifatida ishlanadi.
   *
   * Shu bilan lentadagi bilan AYNAN bir xil mantiq ishlaydi — ikkinchi
   * marta yozilmaydi.
   */
  const actions = usePostActions((updater) => {
    setData((current) => {
      if (!current) return current!;

      const [updated] = updater([current.post]);

      // O'chirilgan bo'lsa ro'yxat bo'sh qaytadi — sahifani yopamiz.
      if (!updated) {
        router.push('/feed');

        return current;
      }

      return { post: updated };
    });
  });

  /** Postdagi izohlar sonini o'zgartiradi (javob va o'chirish uchun). */
  function bumpCommentCount(delta: number) {
    setData((current) =>
      current
        ? { post: { ...current.post, commentCount: Math.max(0, current.post.commentCount + delta) } }
        : current!,
    );
  }

  async function sendComment() {
    const trimmed = body.trim();

    if (!trimmed || isSending) return;

    setIsSending(true);
    setActionError(null);

    try {
      const result = await request<{ comment: CommentView }>(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        body: { body: trimmed },
      });

      // Izohlar eskisidan yangisiga — yangisi OXIRGA qo'shiladi.
      comments.setItems((current) => [...current, result.comment]);
      bumpCommentCount(1);
      setBody('');
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <AppHeader title="Post" showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && <Skeleton className="h-44 rounded-2xl" />}

        {!isLoading && error && (
          <Alert variant="error" title="Postni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actions.error && <Alert variant="error">{actions.error}</Alert>}
        {actionError && <Alert variant="error">{actionError}</Alert>}

        {post && (
          <>
            <PostCard
              post={post}
              isDetail
              isBusy={actions.busyPostId === post.id}
              onToggleLike={() => actions.toggleLike(post)}
              onDoubleTapLike={() => actions.likeOnly(post)}
              onToggleSave={() => actions.toggleSave(post)}
              onShared={() => void actions.sharePost(post)}
              onAttachmentClick={(attachmentId) => actions.trackAttachmentClick(post.id, attachmentId)}
              onEdit={(body) => actions.editPost(post.id, body)}
              onDelete={() => actions.deletePost(post.id)}
              onReport={(reason, note) => actions.reportPost(post.id, reason, note)}
            />

            {!post.isDeleted && (
              <form
                className="bg-card border-border rounded-2xl border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendComment();
                }}
              >
                <label htmlFor="comment-body" className="sr-only">
                  Izoh matni
                </label>

                <Textarea
                  id="comment-body"
                  rows={2}
                  maxLength={COMMENT_MAX_LENGTH}
                  value={body}
                  disabled={isSending}
                  placeholder="Izoh yozing"
                  onChange={(event) => setBody(event.target.value)}
                />

                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={body.trim().length === 0}
                    isLoading={isSending}
                    loadingText="Yuborilmoqda..."
                  >
                    <Send className="size-4" aria-hidden="true" />
                    Yuborish
                  </Button>
                </div>
              </form>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Izohlar</h2>

              {comments.isLoading && (
                <>
                  <Skeleton className="h-16 rounded-2xl" />
                  <Skeleton className="h-16 rounded-2xl" />
                </>
              )}

              {comments.error && <Alert variant="error">{comments.error}</Alert>}

              {!comments.isLoading && !comments.error && comments.items.length === 0 && (
                <EmptyState
                  icon={MessageCircle}
                  title="Hali izoh yo'q"
                  description="Birinchi bo'lib fikringizni yozing."
                />
              )}

              {comments.items.map((comment) => (
                <CommentItem
                  key={comment.id}
                  postId={postId}
                  comment={comment}
                  isPostOwner={post.isMine}
                  onChanged={(updated) =>
                    comments.setItems((current) =>
                      current.map((item) => (item.id === updated.id ? updated : item)),
                    )
                  }
                  onDeleted={(commentId, removed) => {
                    comments.setItems((current) => current.filter((item) => item.id !== commentId));
                    bumpCommentCount(-removed);
                  }}
                  onReplyAdded={() => bumpCommentCount(1)}
                />
              ))}

              {comments.hasMore && (
                <Button
                  variant="outline"
                  fullWidth
                  isLoading={comments.isLoadingMore}
                  loadingText="Yuklanmoqda..."
                  onClick={comments.loadMore}
                >
                  Yana izohlar
                </Button>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
