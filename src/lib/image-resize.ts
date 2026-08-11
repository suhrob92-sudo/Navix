'use client';

/**
 * Rasmni YUBORISHDAN OLDIN brauzerda kichraytirish.
 *
 * ── Nima uchun bu server tomonida qilinmaydi ──────────────────────────
 * Telefon kamerasidan olingan rasm 3-5 MB bo'ladi. O'zbekistondagi
 * mobil internetda uni yuklash o'n soniyagacha cho'zilishi mumkin —
 * odam esa shu vaqt ichida ilovani yopib yuboradi.
 *
 * Kichraytirish serverda qilinsa, o'sha 5 MB baribir tarmoqdan
 * o'tardi: sekinlik yo'qolmasdi, faqat joyi o'zgarardi. Brauzerda
 * qilinganda esa tarmoqqa ~300 KB chiqadi.
 *
 * Qo'shimcha foyda: server tomonda rasm qayta ishlash kutubxonasi
 * (`sharp`) kerak bo'lmaydi — u og'ir va Vercel'da alohida sozlash
 * talab qiladi.
 */

/** Siqish sifati: 0.82 — ko'z ilg'amaydigan yo'qotish, hajm esa uch baravar kam. */
const QUALITY = 0.82;

/**
 * Rasmni ochadi.
 *
 * `createImageBitmap` tez va EXIF burilishini ham to'g'rilaydi
 * (telefonda yonboshlab olingan rasm to'g'ri turadi). Eski
 * brauzerlarda u bo'lmasligi mumkin — o'shanda oddiy `<img>` orqali
 * ochiladi.
 */
async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();

      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Rasmni ochib bo'lmadi"));
      element.src = url;
    });

    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rasmni kichraytiradi va siqadi.
 *
 * @param maxDimension Eng katta tomon (piksel).
 * @returns Yuborishga tayyor fayl. Kichraytirib bo'lmasa — asl fayl.
 */
export async function resizeImage(file: File, maxDimension: number): Promise<Blob> {
  /**
   * GIF TEGILMAYDI.
   *
   * Canvas orqali o'tkazilsa, harakatlanuvchi rasm bitta kadrga
   * aylanib qolardi — ya'ni odam yuborgan narsa yo'qolardi.
   */
  if (file.type === 'image/gif') return file;

  try {
    const { source, width, height } = await loadImage(file);

    const scale = Math.min(1, maxDimension / Math.max(width, height));

    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');

    if (!context) return file;

    context.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      /**
       * WebP — bir xil sifatda JPEG'dan ~30% kichik.
       *
       * Qo'llab-quvvatlamaydigan brauzer `toBlob` ga berilgan turni
       * e'tiborsiz qoldirib PNG qaytaradi. PNG esa fotosurat uchun
       * KATTA, shuning uchun natija tekshiriladi va kerak bo'lsa
       * JPEG bilan qaytadan urinamiz.
       */
      canvas.toBlob((result) => resolve(result), 'image/webp', QUALITY);
    });

    if (blob && blob.type === 'image/webp') return blob;

    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', QUALITY);
    });

    // Kichraytirilgani asl fayldan katta chiqsa, aslini yuborgan ma'qul.
    if (jpeg && jpeg.size < file.size) return jpeg;

    return file;
  } catch {
    /**
     * Kichraytirib bo'lmadi — asl fayl yuboriladi.
     *
     * Bu yerda xato TASHLANMAYDI: kichraytirish qulaylik, majburiyat
     * emas. Uning ishlamagani odamni rasm yuborishdan mahrum
     * qilmasligi kerak (hajm chegarasini server baribir tekshiradi).
     */
    return file;
  }
}
