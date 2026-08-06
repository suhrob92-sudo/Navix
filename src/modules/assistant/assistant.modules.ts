import { APP_MODULES, ModuleStatus, type AppModule } from '@/config/modules';
import { toSearchText } from '@/lib/search';

/**
 * Foydalanuvchi gapini MODULLAR REYESTRI bilan solishtiradi.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * "Taksi chaqir" deganda yordamchi "Tushunmadim" derdi. Bu yolg'on:
 * u tushundi, shunchaki taksi moduli hali yozilmagan. Foydalanuvchi
 * esa "ilova meni tushunmadi" deb o'ylab, boshqa so'z bilan qayta
 * urinadi va yana muvaffaqiyatsizlikka uchraydi.
 *
 * Endi javob rost: "Taksi ustida ishlayapmiz, tez orada".
 *
 * ── Nima uchun ro'yxat qo'lda yozilmaydi ──────────────────────────────
 * Har bir modul `src/config/modules.ts` da o'z `aiIntents` iborasi va
 * `status` bilan turadi. Shu yerdan o'qiymiz:
 *
 *  · yangi modul qo'shilsa — yordamchi uni AVTOMATIK biladi;
 *  · modul ishga tushib `LIVE` bo'lsa — "tez orada" javobi o'zi
 *    yo'qoladi.
 *
 * Ikkinchi ro'yxat yuritilsa, ertaga ular bir-biriga mos kelmay
 * qolardi va yordamchi ishlab turgan modul haqida "tayyor emas"
 * derdi.
 */

/** Solishtirishga tayyor holdagi modul. */
interface ModulePhrase {
  module: AppModule;
  /** `toSearchText` dan o'tgan ibora so'zlari. */
  words: string[];
}

/**
 * Iboralar bir marta tayyorlanadi.
 *
 * `parseMessage` har xabarda chaqiriladi; 20 ta modulning barcha
 * iborasini har safar qayta tozalash keraksiz ish bo'lardi.
 */
const PLANNED_PHRASES: ModulePhrase[] = buildPhrases(ModuleStatus.PLANNED);

function buildPhrases(status: AppModule['status']): ModulePhrase[] {
  return APP_MODULES.filter((module) => module.status === status).flatMap((module) =>
    module.aiIntents
      .map((phrase) => ({ module, words: toSearchText(phrase).split(' ').filter(Boolean) }))
      .filter((entry) => entry.words.length > 0),
  );
}

/**
 * Matn hali TAYYOR BO'LMAGAN modulga tegishlimi.
 *
 * ── Nima uchun "hamma so'z bo'lishi shart" ────────────────────────────
 * Ibora so'zlarining HAMMASI matnda bo'lishi talab qilinadi. Aks holda
 * "yubor" so'zi bitta o'zi "pochta yubor" iborasiga mos kelib,
 * oddiy pul o'tkazmasi "pochta moduli tayyor emas" javobini olardi.
 *
 * So'z BUTUNLIGICHA solishtiriladi: "ish" so'zi "ishla" ni topmasin.
 */
export function findPlannedModule(normalizedText: string): AppModule | null {
  const words = normalizedText.split(' ').filter(Boolean);
  if (words.length === 0) return null;

  const present = new Set(words);

  // Uzunroq ibora aniqroq: avval ularni sinaymiz.
  const ordered = [...PLANNED_PHRASES].sort((left, right) => right.words.length - left.words.length);

  for (const entry of ordered) {
    if (entry.words.every((word) => present.has(word))) {
      return entry.module;
    }
  }

  return null;
}

/**
 * Tayyor bo'lmagan modul uchun javob matni.
 *
 * Matnda modul NOMI bor: foydalanuvchi "meni to'g'ri tushundi" deb
 * ishonch hosil qiladi va kutish sababini biladi.
 */
export function comingSoonReply(module: AppModule): string {
  return `${module.name} moduli ustida ishlayapmiz — tez orada ochiladi. Hozircha men ovqat buyurtma qilish, Marketplace'dan xarid, to'lovlar va hamyon bilan yordam bera olaman.`;
}
