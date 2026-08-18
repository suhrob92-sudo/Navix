import { describe, expect, it } from 'vitest';

import { createStorySchema } from '@/modules/story/story.schemas';
import {
  MAX_STORY_SECONDS,
  STORY_CAPTION_MAX_LENGTH,
  STORY_IMAGE_SECONDS,
  STORY_POST_TITLE_MAX_LENGTH,
  remainingLabel,
  storyDurationSeconds,
  storyPostTitle,
} from '@/modules/story/story.types';

/** O'zimiz yuklagan fayl manzili — sxema faqat shundayini qabul qiladi. */
const image = '/api/v1/files/stories/abc/11111111-1111-4111-8111-111111111111.jpg';
const video = '/api/v1/files/videos/abc/22222222-2222-4222-8222-222222222222.webm';

describe('storyDurationSeconds', () => {
  it('rasm belgilangan vaqt turadi', () => {
    expect(storyDurationSeconds({ videoUrl: null, videoSeconds: null })).toBe(STORY_IMAGE_SECONDS);
  });

  it("video o'z davomiyligicha turadi", () => {
    expect(storyDurationSeconds({ videoUrl: video, videoSeconds: 8 })).toBe(8);
  });

  it('chegaradan uzun video KESILADI', () => {
    /**
     * Baza buzilgan yoki eski yozuv bo'lsa, davomiylik chegaradan
     * katta bo'lishi mumkin. Kesilmasa, bitta hikoya ekranda
     * daqiqalab turib qolardi.
     */
    expect(storyDurationSeconds({ videoUrl: video, videoSeconds: 600 })).toBe(MAX_STORY_SECONDS);
  });

  it("davomiyligi yo'q video rasm kabi hisoblanadi", () => {
    expect(storyDurationSeconds({ videoUrl: video, videoSeconds: null })).toBe(STORY_IMAGE_SECONDS);
  });

  it('nol davomiylik rasm kabi hisoblanadi', () => {
    expect(storyDurationSeconds({ videoUrl: video, videoSeconds: 0 })).toBe(STORY_IMAGE_SECONDS);
  });
});

describe('remainingLabel', () => {
  const now = new Date('2026-08-15T12:00:00.000Z');

  it("soat bilan ko'rsatadi", () => {
    expect(remainingLabel('2026-08-15T15:30:00.000Z', now)).toBe('3 soat qoldi');
  });

  it("bir soatdan kam bo'lsa daqiqa bilan", () => {
    expect(remainingLabel('2026-08-15T12:25:00.000Z', now)).toBe('25 daqiqa qoldi');
  });

  it("muddati o'tganini aytadi", () => {
    expect(remainingLabel('2026-08-15T11:00:00.000Z', now)).toBe('Muddati tugadi');
  });

  it('aynan chegarada ham tugagan hisoblanadi', () => {
    expect(remainingLabel('2026-08-15T12:00:00.000Z', now)).toBe('Muddati tugadi');
  });

  it('bir daqiqadan kam qolganda ham 1 daqiqa deydi', () => {
    /**
     * "0 daqiqa qoldi" degan yozuv xato taassurot beradi: odam
     * hikoya allaqachon yo'q deb o'ylardi.
     */
    expect(remainingLabel('2026-08-15T12:00:20.000Z', now)).toBe('1 daqiqa qoldi');
  });
});

describe('createStorySchema', () => {
  it('rasmli hikoyani qabul qiladi', () => {
    expect(createStorySchema.safeParse({ imageUrl: image }).success).toBe(true);
  });

  it('videoli hikoyani qabul qiladi', () => {
    expect(createStorySchema.safeParse({ videoUrl: video, videoSeconds: 10 }).success).toBe(true);
  });

  it('faqat MATNLI hikoyani rad etadi', () => {
    /**
     * Hikoya — ko'rinadigan narsa. Faqat matnli hikoya lentadagi
     * postdan farq qilmasdi, lekin 24 soatdan keyin yo'qolib,
     * odamning yozganini bekorga yo'q qilardi.
     */
    expect(createStorySchema.safeParse({ caption: 'Salom' }).success).toBe(false);
  });

  it('rasm va videoni BIRGA rad etadi', () => {
    expect(createStorySchema.safeParse({ imageUrl: image, videoUrl: video }).success).toBe(false);
  });

  it('begona manzilni rad etadi', () => {
    expect(createStorySchema.safeParse({ imageUrl: 'https://boshqasayt.uz/rasm.jpg' }).success).toBe(false);
  });

  it('uzun videoni rad etadi', () => {
    const result = createStorySchema.safeParse({
      videoUrl: video,
      videoSeconds: MAX_STORY_SECONDS + 1,
    });

    expect(result.success).toBe(false);
  });

  it('uzun izohni rad etadi', () => {
    const result = createStorySchema.safeParse({
      imageUrl: image,
      caption: 'a'.repeat(STORY_CAPTION_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('chegaradagi izohni qabul qiladi', () => {
    const result = createStorySchema.safeParse({
      imageUrl: image,
      caption: 'a'.repeat(STORY_CAPTION_MAX_LENGTH),
    });

    expect(result.success).toBe(true);
  });

  it("noto'g'ri mahsulot ID rad etiladi", () => {
    expect(createStorySchema.safeParse({ imageUrl: image, productId: 'salom' }).success).toBe(false);
  });

  it("izohsiz hikoyada bo'sh satr bo'ladi", () => {
    const result = createStorySchema.safeParse({ imageUrl: image });

    expect(result.success && result.data.caption).toBe('');
  });

  it("ulashilgan post ID qabul qilinadi", () => {
    const result = createStorySchema.safeParse({
      imageUrl: image,
      postId: '3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34',
    });

    expect(result.success && result.data.postId).toBe('3f1a6c2e-9b4d-4f8a-8c1e-2d7b5a9e0c34');
  });

  it("buzuq post ID rad etiladi", () => {
    /*
      Bu qiymat tugmadan keladi, lekin brauzerda o'zgartirilishi
      mumkin. Sxema uni ushlamasa, buzuq ID bazaga yetib borardi.
    */
    expect(createStorySchema.safeParse({ imageUrl: image, postId: '../admin' }).success).toBe(false);
  });
});

describe('storyPostTitle', () => {
  it("qisqa matn o'zgarmaydi", () => {
    expect(storyPostTitle('Yangi burger keldi', false)).toBe('Yangi burger keldi');
  });

  it("uzun matn KESILADI va chegaradan oshmaydi", () => {
    const title = storyPostTitle('a'.repeat(200), false);

    expect(title.length).toBe(STORY_POST_TITLE_MAX_LENGTH);
    expect(title.endsWith('\u2026')).toBe(true);
  });

  it("qator uzilishlari BITTA bo'shliqqa aylanadi", () => {
    /*
      Tugma bir qatorli. Matndagi qator uzilishi tozalanmasa,
      tugma ichida g'alati bo'shliqlar paydo bo'lardi.
    */
    expect(storyPostTitle('Birinchi\n\nIkkinchi', false)).toBe('Birinchi Ikkinchi');
  });

  it("matnsiz postda MA'NOLI yozuv qoladi", () => {
    /*
      Faqat videodan iborat postda matn bo'sh bo'ladi. Tugma
      bo'sh chiqsa, odam uni bosish kerakligini bilmasdi.
    */
    expect(storyPostTitle('', true)).toBe('Videoni ochish');
    expect(storyPostTitle('   ', false)).toBe('Postni ochish');
  });
});
