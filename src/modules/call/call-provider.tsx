'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { CALL_ALIVE_PING_MS, RING_TIMEOUT_SECONDS, VIDEO_CONSTRAINTS } from '@/config/calls';
import { useApiClient } from '@/hooks/use-api';
import { useCallStream } from '@/hooks/use-call-stream';
import { toUserMessage } from '@/lib/api-client';
import { useAuth } from '@/modules/auth/auth-context';
import {
  isCallOver,
  type CallEvent,
  type CallKindName,
  type CallResponse,
  type CallSignal,
  type CallView,
  type IceServerConfig,
  type IceServersResponse,
  type StartCallResponse,
} from '@/modules/call/call.types';

/**
 * Qo'ng'iroq boshqaruvi — butun ilova uchun BITTA joyda.
 *
 * ── Nima uchun qolipda, sahifada emas ─────────────────────────────────
 * Qo'ng'iroq istalgan payt kelishi mumkin va gaplashayotganda boshqa
 * sahifaga o'tish mumkin bo'lishi kerak. Agar boshqaruv suhbat
 * sahifasida tursa, sahifa almashishi bilan ulanish uzilardi.
 *
 * ── Ovoz QAYERDAN o'tadi ──────────────────────────────────────────────
 * Ovoz serverdan O'TMAYDI: ikki telefon bir-biriga to'g'ridan-to'g'ri
 * ulanadi (WebRTC). Server faqat ikki tomonni tanishtiradi.
 */

export interface CallContextValue {
  /** Hozirgi qo'ng'iroq. Bo'lmasa `null`. */
  call: CallView | null;
  /** Javob berildi, lekin ovoz yo'li hali ulanmagan. */
  isConnecting: boolean;
  isMuted: boolean;
  /** Suhbat necha soniya davom etmoqda. */
  elapsedSeconds: number;
  error: string | null;

  /** Kamera hozir o'chirilganmi (faqat video qo'ng'iroqda). */
  isCameraOff: boolean;
  /** Qaysi kamera ishlayapti: old yoki orqa. */
  isBackCamera: boolean;

  /**
   * O'z kameramdan kelayotgan tasvir — "o'zini ko'rish" oynasi uchun.
   *
   * Havola sifatida emas, HOLAT sifatida beriladi: oqim almashganda
   * (kamera almashtirilganda) ekran qayta chizilishi kerak.
   */
  localStream: MediaStream | null;
  /** Suhbatdoshdan kelayotgan tasvir va ovoz. */
  remoteStream: MediaStream | null;

  /** Suhbatdoshga qo'ng'iroq qiladi. */
  start: (conversationId: string, kind?: CallKindName) => Promise<void>;
  /** Kelayotgan qo'ng'iroqni ko'taradi. */
  accept: () => Promise<void>;
  /** Qo'ng'iroqni tugatadi (rad etish ham shu). */
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  /** Kamerani yoqadi yoki o'chiradi. */
  toggleCamera: () => void;
  /** Old va orqa kamerani almashtiradi. */
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

/** Tugagan qo'ng'iroq ekranda shuncha turadi, keyin yo'qoladi. */
const ENDED_LINGER_MS = 1_500;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const request = useApiClient();
  const { isAuthenticated } = useAuth();

  const [call, setCallState] = useState<CallView | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  /**
   * Hozirgi qo'ng'iroq — HAVOLADA ham saqlanadi.
   *
   * Jonli oqimdan kelgan hodisalar eski `call` qiymatini ko'rmasligi
   * kerak: hodisa ishlovchisi bir marta yaratiladi va holat
   * o'zgarganini "bilmaydi".
   */
  const callRef = useRef<CallView | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Chaqiruvchining taklifi javob berilgunga QADAR kelishi mumkin.
   *
   * Qabul qiluvchida ulanish hali yaratilmagan bo'ladi, shuning uchun
   * taklif saqlanib turadi va "ko'tarish" bosilgach qo'llanadi.
   */
  const pendingOfferRef = useRef<string | null>(null);

  /**
   * Tarmoq manzillari ham erta kelishi mumkin.
   *
   * Ularni ulanish tavsifi o'rnatilmasdan qo'shib bo'lmaydi — brauzer
   * xato beradi. Shuning uchun ular ham navbatda kutadi.
   */
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  /** Holatni ham ekranda, ham havolada yangilaydi. */
  const setCall = useCallback((next: CallView | null) => {
    callRef.current = next;
    setCallState(next);
  }, []);

  /** Ulanishni yopadi va mikrofonni bo'shatadi. */
  const teardown = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;

    /**
     * Mikrofon ALBATTA o'chiriladi.
     *
     * Aks holda telefonda "yozib olinmoqda" belgisi qolib ketardi —
     * odam esa haqli ravishda tinglanayotganidan xavotirlanardi.
     */
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (audioRef.current) audioRef.current.srcObject = null;

    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];

    setIsConnecting(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsBackCamera(false);
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  /** Signalni ikkinchi tomonga yuboradi. */
  const postSignal = useCallback(
    async (callId: string, signal: CallSignal): Promise<void> => {
      try {
        await request(`/api/v1/calls/${callId}/signal`, { method: 'POST', body: signal });
      } catch {
        /**
         * Bitta signal yetmasa ham ulanish odatda o'rnatiladi: brauzer
         * bir nechta yo'lni parallel sinaydi. Shuning uchun bu xato
         * qo'ng'iroqni to'xtatmaydi.
         */
      }
    },
    [request],
  );

  /** Navbatda turgan tarmoq manzillarini qo'llaydi. */
  const flushCandidates = useCallback(async (): Promise<void> => {
    const peer = peerRef.current;

    if (!peer) return;

    const waiting = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];

    for (const candidate of waiting) {
      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // Bitta yaroqsiz manzil qolganlariga xalaqit bermaydi.
      }
    }
  }, []);

  const hangUp = useCallback(
    async (failed = false): Promise<void> => {
      const current = callRef.current;

      teardown();

      if (!current || isCallOver(current.status)) return;

      /**
       * Ekran DARHOL o'zgaradi.
       *
       * Serverdan javob kutilsa, tugma bosilgach bir soniya hech narsa
       * bo'lmasdi va odam qayta-qayta bosardi.
       */
      setCall({ ...current, status: failed ? 'FAILED' : 'ENDED' });

      try {
        await request(`/api/v1/calls/${current.id}/end`, { method: 'POST', body: { failed } });
      } catch {
        // Tugatish yozib qolinmasa ham server uni o'zi yopadi (muddat bo'yicha).
      }
    },
    [request, setCall, teardown],
  );

  /** Ovoz (va kerak bo'lsa video) yo'lini yaratadi. */
  const createPeer = useCallback(
    async (callId: string, iceServers: IceServerConfig[], kind: CallKindName): Promise<RTCPeerConnection> => {
      const peer = new RTCPeerConnection({ iceServers });

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;

        void postSignal(callId, { type: 'candidate', candidate: event.candidate.toJSON() });
      };

      /**
       * Suhbatdoshning oqimi keldi.
       *
       * ── Nima uchun bu yerda ijro ETILMAYDI ─────────────────────────
       * Ovozli qo'ng'iroqda oqim doim turadigan `<audio>` ga ulanadi,
       * videoda esa ekrandagi `<video>` ga. Ikkalasiga BIR VAQTDA
       * ulansa, ovoz ikki manbadan chiqib aks-sado hosil qilardi.
       *
       * Shuning uchun oqim shu yerda faqat SAQLANADI, qayerga
       * ulanishini quyidagi effekt hal qiladi.
       */
      peer.ontrack = (event) => {
        setRemoteStream(event.streams[0] ?? null);
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          setIsConnecting(false);
          return;
        }

        /**
         * Ulanib bo'lmadi.
         *
         * Eng ko'p uchraydigan sabab — mobil tarmoqdagi qattiq to'siq
         * (NAT). Bunda TURN serveri kerak bo'ladi; u sozlanmagan bo'lsa
         * qo'ng'iroq amalga oshmaydi va buni YASHIRMASLIK kerak.
         */
        if (peer.connectionState === 'failed') {
          setError("Ulanib bo'lmadi. Tarmoqni tekshiring.");
          void hangUp(true);
        }
      };

      /**
       * Kamera FAQAT video qo'ng'iroqda so'raladi.
       *
       * Ovozli qo'ng'iroqda ham so'ralsa, brauzer kameraga ruxsat
       * so'rab, telefonda "kamera yoqilgan" belgisi yonardi — odam esa
       * haqli ravishda kuzatilayotganidan xavotirlanardi.
       */
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'VIDEO' ? { ...VIDEO_CONSTRAINTS, facingMode: 'user' } : false,
      });

      localStreamRef.current = media;
      setLocalStream(media);

      media.getTracks().forEach((track) => peer.addTrack(track, media));

      peerRef.current = peer;

      return peer;
    },
    [hangUp, postSignal],
  );

  /** Ikkinchi tomondan kelgan ulanish ma'lumotini qo'llaydi. */
  const applySignal = useCallback(
    async (callId: string, signal: CallSignal): Promise<void> => {
      const peer = peerRef.current;

      if (signal.type === 'offer') {
        // Hali ko'tarilmagan — taklif navbatda kutadi.
        if (!peer) {
          pendingOfferRef.current = signal.sdp ?? null;
          return;
        }

        await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        await flushCandidates();

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        await postSignal(callId, { type: 'answer', sdp: answer.sdp });
        return;
      }

      if (signal.type === 'answer') {
        /**
         * Javob IKKI marta kelishi mumkin (qayta ulanishda navbat
         * boshidan o'qilsa). Ikkinchi marta qo'llash brauzerda xato
         * beradi, shuning uchun holatni tekshiramiz.
         */
        if (!peer || peer.signalingState !== 'have-local-offer') return;

        await peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        await flushCandidates();
        return;
      }

      const candidate = signal.candidate as RTCIceCandidateInit | undefined;

      if (!candidate) return;

      // Ulanish tavsifi hali o'rnatilmagan bo'lsa, manzil navbatda kutadi.
      if (!peer || !peer.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // Yaroqsiz manzil — qolganlari bilan ulanish baribir o'rnatiladi.
      }
    },
    [flushCandidates, postSignal],
  );

  // ── Jonli oqim ──────────────────────────────────────────────────────

  const handleEvent = useCallback(
    (event: CallEvent) => {
      if (event.kind === 'ring') {
        /**
         * Gaplashayotganda kelgan qo'ng'iroq E'TIBORSIZ qoldiriladi.
         *
         * "Kutish rejimi" hozircha yo'q, server esa bunday holatda
         * chaqiruvchiga "band" deb javob beradi.
         */
        const current = callRef.current;

        if (current && !isCallOver(current.status)) return;

        setCall(event.call);
        setError(null);

        /**
         * Telefonni sezdirish — ovoz o'chiq bo'lsa ham.
         *
         * Brauzer tebranishga faqat odam sahifa bilan BIR MARTA
         * ishlagandan keyin ruxsat beradi. Tekshirmasdan chaqirilsa u
         * jimgina rad etmaydi — konsolga xato yozadi. Shuning uchun
         * avval so'raymiz.
         */
        if (navigator.userActivation?.hasBeenActive) {
          try {
            navigator.vibrate?.([400, 200, 400]);
          } catch {
            // Qurilma qo'llab-quvvatlamasa — muhim emas.
          }
        }

        return;
      }

      if (event.kind === 'state') {
        const current = callRef.current;

        // Begona (eski) qo'ng'iroqning hodisasi.
        if (!current || current.id !== event.call.id) return;

        setCall(event.call);

        if (isCallOver(event.call.status)) {
          teardown();
        }

        return;
      }

      const current = callRef.current;

      if (!current || current.id !== event.callId) return;

      void applySignal(event.callId, event.signal);
    },
    [applySignal, setCall, teardown],
  );

  const handleLive = useCallback(
    (live: CallView | null) => {
      /**
       * Sahifa yangilanganda davom etayotgan qo'ng'iroq qaytariladi.
       *
       * Lekin FAQAT chalinayotgani: gaplashayotgan qo'ng'iroqning ovoz
       * yo'li sahifa bilan birga uzilib bo'lgan va uni tiklab
       * bo'lmaydi. Uni "davom etyapti" deb ko'rsatish yolg'on bo'lardi.
       */
      if (!live || live.status !== 'RINGING' || live.isOutgoing) return;

      if (callRef.current && !isCallOver(callRef.current.status)) return;

      setCall(live);
    },
    [setCall],
  );

  useCallStream(isAuthenticated, { onEvent: handleEvent, onLive: handleLive });

  // ── Amallar ─────────────────────────────────────────────────────────

  const start = useCallback(
    async (conversationId: string, kind: CallKindName = 'AUDIO'): Promise<void> => {
      setError(null);

      try {
        const result = await request<StartCallResponse>('/api/v1/calls', {
          method: 'POST',
          body: { conversationId, kind },
        });

        setCall(result.call);
        setIsConnecting(true);

        const peer = await createPeer(result.call.id, result.iceServers, kind);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        await postSignal(result.call.id, { type: 'offer', sdp: offer.sdp });
      } catch (caught) {
        setError(toMediaMessage(caught));

        // Yaratilgan bo'lsa — yopamiz, aks holda "band" bo'lib qolardi.
        await hangUp(true);
      }
    },
    [createPeer, hangUp, postSignal, request, setCall],
  );

  const accept = useCallback(async (): Promise<void> => {
    const current = callRef.current;

    if (!current || current.status !== 'RINGING' || current.isOutgoing) return;

    setError(null);
    setIsConnecting(true);

    try {
      const answered = await request<CallResponse>(`/api/v1/calls/${current.id}/answer`, {
        method: 'POST',
        body: {},
      });

      setCall(answered.call);

      const { iceServers } = await request<IceServersResponse>('/api/v1/calls/ice');

      /**
       * Turi CHAQIRUVCHIDAN keladi.
       *
       * Video qo'ng'iroqqa ovoz bilan javob berib bo'lmaydi: taklifda
       * video yo'li bor va unga javob ham video bilan berilishi kerak.
       */
      await createPeer(current.id, iceServers, current.kind);

      /**
       * Kutib turgan taklif SHU YERDA qo'llanadi.
       *
       * U ko'tarishdan oldin kelgan bo'lishi mumkin — chaqiruvchi
       * taklifni qo'ng'iroq boshlanishi bilanoq yuboradi.
       */
      const offer = pendingOfferRef.current;

      if (offer) {
        pendingOfferRef.current = null;
        await applySignal(current.id, { type: 'offer', sdp: offer });
      }
    } catch (caught) {
      setError(toMediaMessage(caught));
      await hangUp(true);
    }
  }, [applySignal, createPeer, hangUp, request, setCall]);

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];

    if (tracks.length === 0) return;

    /**
     * Mikrofon O'CHIRILMAYDI, faqat yo'li to'siladi.
     *
     * To'liq o'chirilsa, qayta yoqishda brauzer yana ruxsat so'rashi
     * va ulanish uzilishi mumkin edi.
     *
     * Yo'l hozir OCHIQ bo'lsa, yangi holat — "o'chirilgan".
     */
    const nextMuted = tracks[0].enabled;

    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setIsMuted(nextMuted);
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (tracks.length === 0) return;

    // Mikrofondagi kabi: trek to'xtatilmaydi, faqat yo'li to'siladi.
    const nextOff = tracks[0].enabled;

    tracks.forEach((track) => {
      track.enabled = !nextOff;
    });

    setIsCameraOff(nextOff);
  }, []);

  /**
   * Old va orqa kamerani almashtiradi.
   *
   * ── Nima uchun ulanish QAYTA qurilmaydi ───────────────────────────────
   * Yangi kamera — bu yangi video trek. Uni oddiygina qo'shib qo'yib
   * bo'lmaydi: ulanish qaytadan kelishilishi kerak bo'lardi va suhbat
   * bir-ikki soniyaga uzilardi.
   *
   * `replaceTrack` esa trekni JOYIDA almashtiradi — suhbatdosh hech
   * narsani sezmaydi, rasm shunchaki boshqa kameraga o'tadi.
   */
  const switchCamera = useCallback(async (): Promise<void> => {
    const peer = peerRef.current;
    const current = localStreamRef.current;

    if (!peer || !current) return;

    const nextFacing = isBackCamera ? 'user' : 'environment';

    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { ...VIDEO_CONSTRAINTS, facingMode: nextFacing },
        audio: false,
      });

      const nextTrack = fresh.getVideoTracks()[0];

      if (!nextTrack) return;

      // Kamera o'chirilgan bo'lsa, yangisi ham o'chiq qolishi kerak.
      nextTrack.enabled = !isCameraOff;

      const sender = peer.getSenders().find((item) => item.track?.kind === 'video');

      await sender?.replaceTrack(nextTrack);

      /**
       * Eski trek ALBATTA to'xtatiladi.
       *
       * Aks holda ikkala kamera ham yoniq qolib, telefonda "kamera
       * ishlayapti" belgisi so'nmasdi va batareya bekorga sarflanardi.
       */
      current.getVideoTracks().forEach((track) => track.stop());

      const merged = new MediaStream([...current.getAudioTracks(), nextTrack]);

      localStreamRef.current = merged;
      setLocalStream(merged);
      setIsBackCamera(nextFacing === 'environment');
    } catch {
      /**
       * Ikkinchi kamera yo'q bo'lishi mumkin (kompyuter, eski telefon).
       *
       * Bu xato emas: suhbat davom etaveradi, faqat kamera
       * almashmaydi. Shuning uchun ekranga xato chiqarilmaydi.
       */
    }
  }, [isBackCamera, isCameraOff]);

  // ── Vaqt hisoblagich va muddatlar ───────────────────────────────────

  const status = call?.status ?? null;
  const answeredAt = call?.answeredAt ?? null;

  /**
   * Soat — faqat suhbat ketayotganda tiqillaydi.
   *
   * ── Nima uchun "necha soniya" emas, "hozir soat necha" ──────────────
   * Hisoblagichni holatda saqlash tabiiyroq ko'rinadi, lekin unda
   * qo'ng'iroq tugaganda uni NOLGA qaytarish kerak bo'lardi — ya'ni
   * effekt ichida holat o'zgartirish. React buni ortiqcha qayta chizish
   * deb hisoblaydi.
   *
   * Shuning uchun holatda faqat HOZIRGI VAQT turadi, davomiylik esa
   * undan hisoblab chiqariladi. Qo'ng'iroq tugashi bilan u o'z-o'zidan
   * nolga aylanadi.
   */
  useEffect(() => {
    if (status !== 'ACTIVE' || !answeredAt) return;

    const timer = setInterval(() => setNowMs(Date.now()), 1_000);

    return () => clearInterval(timer);
  }, [status, answeredAt]);

  const elapsedSeconds =
    status === 'ACTIVE' && answeredAt
      ? Math.max(0, Math.round((nowMs - new Date(answeredAt).getTime()) / 1_000))
      : 0;

  const callId = call?.id ?? null;

  /**
   * "Men hali gaplashyapman" xabari.
   *
   * Brauzer to'satdan yopilsa "tugatish" so'rovi ketmaydi va qo'ng'iroq
   * bazada osilib qolardi — odam soatlab "band" bo'lib turardi. Bu
   * xabar to'xtashi bilan server qo'ng'iroqni o'zi yopadi.
   */
  useEffect(() => {
    if (status !== 'ACTIVE' || !callId) return;

    const ping = (): void => {
      void request(`/api/v1/calls/${callId}/alive`, { method: 'POST', body: {} }).catch(() => {
        // Bitta xabar yetmasa ham keyingisi yetadi — belgi umri uzunroq.
      });
    };

    const timer = setInterval(ping, CALL_ALIVE_PING_MS);

    return () => clearInterval(timer);
  }, [status, callId, request]);

  /**
   * Javob berilmasa qo'ng'iroq o'zi tugaydi.
   *
   * Server ham buni bajaradi, lekin u faqat KEYINGI so'rovda tekshiradi.
   * Ekranda esa telefon cheksiz chalinib turmasligi kerak.
   */
  useEffect(() => {
    if (status !== 'RINGING' || !callId) return;

    const timer = setTimeout(() => void hangUp(), RING_TIMEOUT_SECONDS * 1_000);

    return () => clearTimeout(timer);
  }, [status, callId, hangUp]);

  /** Tugagan qo'ng'iroq ekranda bir oz turadi, keyin yo'qoladi. */
  useEffect(() => {
    if (!status || !isCallOver(status)) return;

    const timer = setTimeout(() => setCall(null), ENDED_LINGER_MS);

    return () => clearTimeout(timer);
  }, [status, callId, setCall]);

  const kind = call?.kind ?? null;

  /**
   * Suhbatdoshning ovozi qayerdan eshitiladi.
   *
   * ── Nima uchun shart bor ───────────────────────────────────────────
   * Ovozli qo'ng'iroqda ekran yopiq bo'lishi mumkin, shuning uchun
   * oqim DOIM turadigan `<audio>` ga ulanadi.
   *
   * Videoda esa ovoz `<video>` dan chiqadi. Agar shu payt `<audio>`
   * ham o'sha oqimni ijro etsa, bir ovoz ikki manbadan chiqib aks-sado
   * hosil qilardi.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const shouldPlayHere = kind === 'AUDIO' && remoteStream !== null;

    audio.srcObject = shouldPlayHere ? remoteStream : null;

    if (!shouldPlayHere) return;

    // Ijro rad etilishi mumkin — ovozsiz qolish yiqilishdan yaxshiroq.
    void audio.play().catch(() => undefined);
  }, [kind, remoteStream]);

  /** Ilova yopilganda mikrofon va kamera bo'shatiladi. */
  useEffect(() => teardown, [teardown]);

  const value: CallContextValue = {
    call,
    isConnecting,
    isMuted,
    elapsedSeconds,
    error,
    isCameraOff,
    isBackCamera,
    localStream,
    remoteStream,
    start,
    accept,
    hangUp,
    toggleMute,
    toggleCamera,
    switchCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {/*
        Suhbatdoshning ovozi shu element orqali eshitiladi.
        U DOIM turadi: qo'ng'iroq ekrani ochilishini kutib o'tirsa,
        birinchi soniyalardagi ovoz yo'qolardi.
      */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error('useCall() faqat <CallProvider> ichida ishlatiladi');
  }

  return context;
}

/**
 * Xatoni odam tushunadigan matnga aylantiradi.
 *
 * Mikrofon xatolari alohida: brauzer ularni inglizcha texnik nom bilan
 * beradi (`NotAllowedError`) va uni shundayligicha ko'rsatish mumkin
 * emas.
 */
function toMediaMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.';
    }

    if (error.name === 'NotFoundError') {
      return 'Mikrofon topilmadi.';
    }

    return "Mikrofonni ishga tushirib bo'lmadi.";
  }

  return toUserMessage(error);
}
