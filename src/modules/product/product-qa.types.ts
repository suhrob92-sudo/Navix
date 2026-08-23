/**
 * Mahsulot savol-javoblari — brauzer va server uchun umumiy turlar.
 */

/** Savol yoki javob muallifi. */
export interface QaAuthor {
  id: string;
  /** Ism va familiyaning bosh harfi: "Aziz Y.". */
  name: string;
  avatarUrl: string | null;
}

/** Bitta javob. */
export interface AnswerView {
  id: string;
  body: string;
  createdAt: string;
  author: QaAuthor;
  /** Javob do'kon tomonidan berilganmi — belgi qo'yiladi. */
  isFromSeller: boolean;
  isMine: boolean;
}

/** Bitta savol va unga berilgan javoblar. */
export interface QuestionView {
  id: string;
  body: string;
  createdAt: string;
  author: QaAuthor;
  isMine: boolean;
  answers: AnswerView[];
  /** So'rov yuborgan odam bu savolga javob berganmi. */
  hasMyAnswer: boolean;
}

/** GET javobi. */
export interface QuestionsResponse {
  questions: QuestionView[];
  hasMore: boolean;
  /** Savol berishga ruxsat bormi. */
  canAsk: boolean;
  /** Ruxsat yo'q bo'lsa — sababi. */
  blockReason: 'GUEST' | 'DAILY_LIMIT' | null;
  /** So'rov yuborgan odam shu do'kon egasimi — javob tugmasi uchun. */
  isSeller: boolean;
}

/** Savol yoki javob qo'shilgandan keyingi javob. */
export interface QuestionMutationResponse {
  question: QuestionView;
}
