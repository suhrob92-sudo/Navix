import { describe, expect, it } from 'vitest';

import { detectImageType } from '@/modules/upload/upload.service';
import {
  extensionFor,
  formatFileSize,
  isOwnImageUrl,
  keyFromUrl,
  MAX_UPLOAD_BYTES,
} from '@/modules/upload/upload.types';

describe('formatFileSize', () => {
  it("kichik hajm baytda ko'rsatiladi", () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('kilobayt yaxlitlanadi', () => {
    expect(formatFileSize(2_048)).toBe('2 KB');
  });

  it('megabaytda kasr qoladi', () => {
    expect(formatFileSize(1_572_864)).toBe('1.5 MB');
    expect(formatFileSize(MAX_UPLOAD_BYTES)).toBe('5 MB');
  });
});

describe('extensionFor', () => {
  it('har bir turga kengaytma bor', () => {
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/gif')).toBe('gif');
    expect(extensionFor('image/jpeg')).toBe('jpg');
  });
});

describe('keyFromUrl', () => {
  it('mahalliy manzildan kalit ajratiladi', () => {
    expect(keyFromUrl('/api/v1/files/posts/abc/def.jpg')).toBe('posts/abc/def.jpg');
  });

  it('Blob manzilidan kalit ajratiladi', () => {
    expect(keyFromUrl('https://store1.public.blob.vercel-storage.com/posts/abc/def.jpg')).toBe(
      'posts/abc/def.jpg',
    );
  });

  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * Manzilni brauzer yuboradi, ya'ni uni istalgan qiymatga o'zgartirish
   * mumkin. Begona manzil o'tib ketsa, lentani ko'rgan har bir odamning
   * IP manzili begona saytga yetib borardi.
   */
  it('begona sayt rad etiladi', () => {
    expect(keyFromUrl('https://tracker.example.com/pixel.gif')).toBeNull();
    expect(keyFromUrl('http://store1.public.blob.vercel-storage.com/a.jpg')).toBeNull();
    expect(keyFromUrl('https://evil.com/blob.vercel-storage.com/a.jpg')).toBeNull();
  });

  it('papkadan chiqishga urinish rad etiladi', () => {
    // `.uploads/../../.env` — istalgan faylni o'qish yo'li bo'lardi.
    expect(keyFromUrl('/api/v1/files/../../.env')).toBeNull();
    expect(keyFromUrl('/api/v1/files/posts/../../../etc/passwd')).toBeNull();
  });

  it("bo'sh qiymat xato bermaydi", () => {
    expect(keyFromUrl(null)).toBeNull();
    expect(keyFromUrl(undefined)).toBeNull();
    expect(keyFromUrl('')).toBeNull();
    expect(keyFromUrl('shunchaki matn')).toBeNull();
  });
});

describe('isOwnImageUrl', () => {
  it("o'z rasmimizni taniydi", () => {
    expect(isOwnImageUrl('/api/v1/files/avatars/u1/a.webp')).toBe(true);
  });

  it('begona rasmni rad etadi', () => {
    expect(isOwnImageUrl('https://cdn.example.com/a.png')).toBe(false);
  });
});

/** Rasm boshidagi baytlar — haqiqiy fayllardagi kabi. */
function buildImage(signature: number[], length = 32): Buffer {
  const data = Buffer.alloc(length);

  for (const [index, byte] of signature.entries()) {
    data[index] = byte;
  }

  return data;
}

describe('detectImageType', () => {
  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * Brauzer yuboradigan `Content-Type` — shunchaki matn: uni istalgan
   * qiymatga o'zgartirish mumkin. Shuning uchun tur faylning O'ZIDAN
   * aniqlanadi.
   */
  it('JPEG taniydi', () => {
    expect(detectImageType(buildImage([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
  });

  it('PNG taniydi', () => {
    expect(detectImageType(buildImage([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
  });

  it('GIF taniydi', () => {
    expect(detectImageType(Buffer.from('GIF89a' + 'x'.repeat(20), 'ascii'))).toBe('image/gif');
  });

  it('WebP taniydi', () => {
    const data = Buffer.alloc(32);
    data.write('RIFF', 0, 'ascii');
    data.write('WEBP', 8, 'ascii');

    expect(detectImageType(data)).toBe('image/webp');
  });

  it("rasm bo'lmagan fayl rad etiladi", () => {
    // Masalan zip yoki bajariladigan fayl.
    expect(detectImageType(Buffer.from('PK' + 'x'.repeat(20), 'ascii'))).toBeNull();
    expect(detectImageType(Buffer.from('#!/bin/sh\necho salom\n', 'ascii'))).toBeNull();
  });

  it('juda kichik fayl rad etiladi', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
