import { describe, expect, it } from 'vitest';

import { detectAudioType, detectImageType, detectVideoType } from '@/modules/upload/upload.service';
import {
  extensionFor,
  formatDuration,
  formatFileSize,
  isOwnImageUrl,
  keyFromUrl,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MAX_VOICE_SECONDS,
  VIDEO_WARN_BYTES,
} from '@/modules/upload/upload.types';
import { SHORT_VIDEO_SECONDS } from '@/modules/feed/feed.types';

describe('formatFileSize', () => {
  it("kichik hajm baytda ko'rsatiladi", () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('kilobayt yaxlitlanadi', () => {
    expect(formatFileSize(2_048)).toBe('2 KB');
  });

  it('megabaytda kasr qoladi', () => {
    expect(formatFileSize(1_572_864)).toBe('1.5 MB');
    expect(formatFileSize(MAX_UPLOAD_BYTES)).toBe('4 MB');
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

describe('formatDuration', () => {
  it('soniyalar ikki xonada yoziladi', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(65)).toBe('1:05');
  });

  it('chegaraviy qiymat', () => {
    expect(formatDuration(MAX_VOICE_SECONDS)).toBe('2:00');
  });

  it('kasr soniya butunlanadi', () => {
    expect(formatDuration(12.9)).toBe('0:12');
  });

  it('manfiy qiymat nolga tenglashtiriladi', () => {
    // Hisob manfiy chiqsa ekranda "-1:-5" turmasligi kerak.
    expect(formatDuration(-4)).toBe('0:00');
  });
});

describe('uzun video chegaralari', () => {
  it("uzunlik 10 daqiqa va u ekranda to'g'ri yoziladi", () => {
    expect(MAX_VIDEO_SECONDS).toBe(600);
    expect(formatDuration(MAX_VIDEO_SECONDS)).toBe('10:00');
  });

  it("qisqa va uzun chegarasi bir-biriga teng emas", () => {
    /*
      Ikkalasi teng bo'lib qolsa, lentadagi "Qisqa"/"Uzun" saralash
      ma'nosini yo'qotardi: bitta bo'lim doim bo'sh chiqardi.
    */
    expect(MAX_VIDEO_SECONDS).toBeGreaterThan(SHORT_VIDEO_SECONDS);
  });

  it("hajm chegarasi 200 MB va u ekranda to'g'ri yoziladi", () => {
    expect(MAX_VIDEO_BYTES).toBe(200 * 1024 * 1024);
    expect(formatFileSize(MAX_VIDEO_BYTES)).toBe('200 MB');
  });

  it('ogohlantirish chegarasi yuklash chegarasidan kichik', () => {
    /*
      Teng yoki kattaroq bo'lsa, ogohlantirish HECH QACHON
      ko'rinmasdi: bunday fayl allaqachon rad etilgan bo'lardi.
    */
    expect(VIDEO_WARN_BYTES).toBeLessThan(MAX_VIDEO_BYTES);
    expect(formatFileSize(VIDEO_WARN_BYTES)).toBe('25 MB');
  });
});

describe('extensionFor — ovoz', () => {
  it('har bir ovoz turiga kengaytma bor', () => {
    expect(extensionFor('audio/webm')).toBe('webm');
    expect(extensionFor('audio/mp4')).toBe('m4a');
    expect(extensionFor('audio/ogg')).toBe('ogg');
  });
});

describe('detectAudioType', () => {
  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * Brauzer yuboradigan tur — shunchaki matn. Ovoz o'rniga boshqa fayl
   * yuborilsa, suhbatdoshda "tinglab bo'lmaydigan ovozli xabar" paydo
   * bo'lardi.
   */
  it('WebM taniydi (Android va Chrome)', () => {
    const data = Buffer.alloc(32);
    data[0] = 0x1a;
    data[1] = 0x45;
    data[2] = 0xdf;
    data[3] = 0xa3;

    expect(detectAudioType(data)).toBe('audio/webm');
  });

  it('MP4 taniydi (iPhone va Safari)', () => {
    const data = Buffer.alloc(32);
    data.write('ftyp', 4, 'ascii');

    expect(detectAudioType(data)).toBe('audio/mp4');
  });

  it('OGG taniydi', () => {
    const data = Buffer.alloc(32);
    data.write('OggS', 0, 'ascii');

    expect(detectAudioType(data)).toBe('audio/ogg');
  });

  it('rasm ovoz sifatida qabul qilinmaydi', () => {
    const png = Buffer.alloc(32);
    for (const [index, byte] of [0x89, 0x50, 0x4e, 0x47].entries()) png[index] = byte;

    expect(detectAudioType(png)).toBeNull();
  });

  it('juda kichik fayl rad etiladi', () => {
    expect(detectAudioType(Buffer.from([0x1a, 0x45]))).toBeNull();
  });
});

describe('video turini baytlardan aniqlash', () => {
  /** MP4 va MOV bir xil qobiqda: farqi "ftyp" dan keyingi brendda. */
  function ftyp(brand: string): Buffer {
    return Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x20]),
      Buffer.from('ftyp', 'ascii'),
      Buffer.from(brand.padEnd(4, ' '), 'ascii'),
      Buffer.alloc(16),
    ]);
  }

  it('MP4 aniqlanadi', () => {
    expect(detectVideoType(ftyp('isom'))).toBe('video/mp4');
    expect(detectVideoType(ftyp('mp42'))).toBe('video/mp4');
  });

  it('MOV (iPhone) aniqlanadi', () => {
    expect(detectVideoType(ftyp('qt  '))).toBe('video/quicktime');
  });

  it('WebM aniqlanadi', () => {
    const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);

    expect(detectVideoType(webm)).toBe('video/webm');
  });

  it('RASM video sifatida qabul qilinmaydi', () => {
    /**
     * Bu eng muhim shart: brauzer aytgan turga ishonilmaydi. Rasmni
     * "video/mp4" deb yuborish oson, lekin fayl ichidagi baytlarni
     * yasab bo'lmaydi.
     */
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

    expect(detectVideoType(png)).toBeNull();
  });

  it("juda qisqa fayl aniqlanmaydi", () => {
    expect(detectVideoType(Buffer.alloc(4))).toBeNull();
  });
});
