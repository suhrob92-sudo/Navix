import type { CallSignal, IceServerConfig } from '@/modules/call/call.types';

/**
 * Guruh suhbati uchun ulanishlar to'ri (mesh).
 *
 * ── Nima qiladi ───────────────────────────────────────────────────────
 * Ikki kishilik qo'ng'iroqda BITTA ulanish bo'ladi. Guruhda esa har bir
 * juftlik uchun alohida ulanish kerak: 4 kishida har bir telefon 3 ta
 * ulanish yuritadi.
 *
 * Bu sinf o'sha ulanishlarni boshqaradi: yaratadi, signallarni
 * to'g'ri ulanishga yo'naltiradi va tugaganda hammasini yopadi.
 *
 * Sabab va chegaralar `config/group-call.ts` da yozilgan.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Ikki kishilik qo'ng'iroq ishlab turibdi va u ilovaning eng nozik
 * qismi. Uning kodiga guruh mantiqini aralashtirib yuborish har ikkala
 * yo'lni ham buzish xavfini tug'dirardi.
 *
 * Bu yerda esa faqat guruh mantiqi turadi va u mustaqil sinaladi.
 */

/**
 * Kim birinchi taklif yuboradi.
 *
 * ── Muammo: ikkalasi bir vaqtda taklif yuborsa ────────────────────────
 * A va B bir vaqtda "men gaplashaman" deb taklif yuborsa, ikkalasining
 * ham ulanishi yarim holatda qolib ketadi va suhbat hech qachon
 * boshlanmaydi. Bu WebRTC'da "glare" deb ataladi.
 *
 * ── Yechim: kelishuvsiz qoida ─────────────────────────────────────────
 * ID'lar solishtiriladi va KICHIGI taklif yuboradi, kattasi kutadi.
 * Bu qoida ikkala telefonda ham bir xil natija beradi, ya'ni ular
 * bir-biri bilan gaplashib olishlari shart emas.
 */
function shouldCreateOffer(myId: string, peerId: string): boolean {
  return myId < peerId;
}

export interface GroupMeshOptions {
  /** Mening foydalanuvchi ID'm. */
  selfId: string;
  iceServers: IceServerConfig[];
  /** Mikrofon va kamera oqimi — barcha ulanishlarga qo'shiladi. */
  localStream: MediaStream;
  /** Signalni serverga yuborish. */
  sendSignal: (to: string, signal: CallSignal) => void;
  /** Ishtirokchining oqimi keldi yoki uzildi. */
  onStream: (peerId: string, stream: MediaStream | null) => void;
}

export class GroupMesh {
  private readonly options: GroupMeshOptions;

  /** Har bir ishtirokchi uchun bitta ulanish. */
  private readonly peers = new Map<string, RTCPeerConnection>();

  /**
   * Erta kelgan tarmoq manzillari.
   *
   * Manzilni ulanish tavsifi o'rnatilmasdan qo'shib bo'lmaydi — brauzer
   * xato beradi. Guruhda bu tez-tez uchraydi: uchta muzokara bir vaqtda
   * ketadi va ularning tezligi har xil.
   */
  private readonly pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  private isClosed = false;

  constructor(options: GroupMeshOptions) {
    this.options = options;
  }

  /** Hozir nechta ulanish ochiq. */
  get size(): number {
    return this.peers.size;
  }

  /** Ulangan ishtirokchilarning ID'lari. */
  get peerIds(): string[] {
    return [...this.peers.keys()];
  }

  /**
   * Ishtirokchilar ro'yxatini joriy holatga keltiradi.
   *
   * Yangi qo'shilganlar bilan ulanish ochiladi, chiqib ketganlarniki
   * yopiladi. Ro'yxat har bir holat o'zgarishida keladi, shuning uchun
   * bu funksiya ko'p marta chaqiriladi va TAKRORGA chidamli bo'lishi
   * kerak.
   */
  sync(activePeerIds: readonly string[]): void {
    if (this.isClosed) return;

    const wanted = new Set(activePeerIds.filter((id) => id !== this.options.selfId));

    for (const peerId of wanted) {
      if (!this.peers.has(peerId)) {
        void this.connect(peerId);
      }
    }

    for (const peerId of this.peers.keys()) {
      if (!wanted.has(peerId)) {
        this.disconnect(peerId);
      }
    }
  }

  /** Bitta ishtirokchi bilan ulanish ochadi. */
  private async connect(peerId: string): Promise<void> {
    const peer = this.createPeer(peerId);

    /**
     * Taklifni faqat BIR tomon yuboradi (yuqoridagi qoida).
     *
     * Ikkinchi tomon shu yerda hech narsa qilmaydi — u taklif
     * kelishini kutadi.
     */
    if (!shouldCreateOffer(this.options.selfId, peerId)) return;

    try {
      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);

      this.options.sendSignal(peerId, { type: 'offer', sdp: offer.sdp });
    } catch {
      /**
       * Bitta ulanish o'rnatilmasa, qolganlari ishlayveradi.
       *
       * Guruhda bu muhim: to'rt kishidan bittasi bilan ulanmaslik
       * butun suhbatni to'xtatmasligi kerak.
       */
      this.disconnect(peerId);
    }
  }

  private createPeer(peerId: string): RTCPeerConnection {
    const peer = new RTCPeerConnection({ iceServers: this.options.iceServers });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;

      this.options.sendSignal(peerId, { type: 'candidate', candidate: event.candidate.toJSON() });
    };

    peer.ontrack = (event) => {
      this.options.onStream(peerId, event.streams[0] ?? null);
    };

    peer.onconnectionstatechange = () => {
      /**
       * Uzilgan ulanish yopiladi, lekin suhbat DAVOM etadi.
       *
       * Ikki kishilikda uzilish — suhbatning tugashi. Guruhda esa bu
       * faqat bitta odamning tushib qolishi.
       */
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        this.disconnect(peerId);
      }
    };

    // O'z ovozim va videom har bir ulanishga alohida qo'shiladi.
    for (const track of this.options.localStream.getTracks()) {
      peer.addTrack(track, this.options.localStream);
    }

    this.peers.set(peerId, peer);

    return peer;
  }

  /** Ishtirokchidan kelgan signalni qo'llaydi. */
  async handleSignal(peerId: string, signal: CallSignal): Promise<void> {
    if (this.isClosed) return;

    /**
     * Ulanish hali yo'q bo'lsa — YARATILADI.
     *
     * Bu kutilgan holat: taklif ro'yxat yangilanishidan oldin kelishi
     * mumkin, chunki signal va holat ikki xil yo'l bilan keladi.
     */
    const peer = this.peers.get(peerId) ?? this.createPeer(peerId);

    try {
      if (signal.type === 'offer') {
        await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        await this.flushCandidates(peerId, peer);

        const answer = await peer.createAnswer();

        await peer.setLocalDescription(answer);

        this.options.sendSignal(peerId, { type: 'answer', sdp: answer.sdp });
        return;
      }

      if (signal.type === 'answer') {
        /**
         * Javob faqat o'z taklifimizga qo'llanadi.
         *
         * Takroriy javob (qayta ulanishda) brauzerda xato beradi,
         * shuning uchun holat tekshiriladi.
         */
        if (peer.signalingState !== 'have-local-offer') return;

        await peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        await this.flushCandidates(peerId, peer);
        return;
      }

      const candidate = signal.candidate as RTCIceCandidateInit | undefined;

      if (!candidate) return;

      if (!peer.remoteDescription) {
        const waiting = this.pendingCandidates.get(peerId) ?? [];

        waiting.push(candidate);
        this.pendingCandidates.set(peerId, waiting);
        return;
      }

      await peer.addIceCandidate(candidate);
    } catch {
      /**
       * Signal xatosi butun suhbatni to'xtatmaydi.
       *
       * Brauzer bir nechta yo'lni parallel sinaydi va bittasi
       * yaroqsiz bo'lsa, boshqasi ishlaydi.
       */
    }
  }

  /** Navbatda turgan manzillarni qo'llaydi. */
  private async flushCandidates(peerId: string, peer: RTCPeerConnection): Promise<void> {
    const waiting = this.pendingCandidates.get(peerId);

    if (!waiting?.length) return;

    this.pendingCandidates.delete(peerId);

    for (const candidate of waiting) {
      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // Bitta yaroqsiz manzil qolganlariga xalaqit bermaydi.
      }
    }
  }

  /** Bitta ulanishni yopadi. */
  private disconnect(peerId: string): void {
    const peer = this.peers.get(peerId);

    if (!peer) return;

    /**
     * Hodisa ishlovchilari OLDIN o'chiriladi.
     *
     * `close()` yana `onconnectionstatechange` ni chaqiradi va u
     * qaytadan `disconnect` ga kirib, cheksiz halqa hosil qilardi.
     */
    peer.onicecandidate = null;
    peer.ontrack = null;
    peer.onconnectionstatechange = null;

    peer.close();

    this.peers.delete(peerId);
    this.pendingCandidates.delete(peerId);

    this.options.onStream(peerId, null);
  }

  /** Barcha ulanishlarni yopadi. */
  close(): void {
    this.isClosed = true;

    for (const peerId of [...this.peers.keys()]) {
      this.disconnect(peerId);
    }

    this.pendingCandidates.clear();
  }
}
