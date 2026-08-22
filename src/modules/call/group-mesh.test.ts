// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupMesh } from '@/modules/call/group-mesh';
import type { CallSignal } from '@/modules/call/call.types';

/**
 * Ulanishlar to'ri — testlar.
 *
 * ── Nima uchun BRAUZER emas, soxta ulanish ────────────────────────────
 * Haqiqiy `RTCPeerConnection` uchun ikkita brauzer va haqiqiy tarmoq
 * kerak. Bu yerda tekshirilayotgan narsa esa boshqacha: to'r QAYSI
 * ulanishni ochadi, qachon yopadi va signalni kimga yo'naltiradi.
 *
 * Bu mantiq tarmoqqa umuman bog'liq emas, shuning uchun soxta ulanish
 * bilan sinaladi va u har safar bir xil natija beradi.
 */

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

/** Yaratilgan soxta ulanishlar — tekshirish uchun. */
let created: FakePeer[] = [];

class FakePeer {
  onicecandidate: ((event: { candidate: { toJSON: () => unknown } | null }) => void) | null = null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  connectionState = 'new';
  signalingState = 'stable';
  remoteDescription: unknown = null;

  readonly tracks: unknown[] = [];
  isClosed = false;

  constructor() {
    created.push(this);
  }

  addTrack(track: unknown): void {
    this.tracks.push(track);
  }

  async createOffer(): Promise<{ type: string; sdp: string }> {
    return { type: 'offer', sdp: 'SDP-OFFER' };
  }

  async createAnswer(): Promise<{ type: string; sdp: string }> {
    return { type: 'answer', sdp: 'SDP-ANSWER' };
  }

  async setLocalDescription(description: { type: string }): Promise<void> {
    this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable';
  }

  async setRemoteDescription(description: unknown): Promise<void> {
    this.remoteDescription = description;
  }

  async addIceCandidate(): Promise<void> {
    /* soxta */
  }

  close(): void {
    this.isClosed = true;
  }
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ kind: 'audio' }] } as unknown as MediaStream;
}

interface Sent {
  to: string;
  signal: CallSignal;
}

function buildMesh(selfId: string) {
  const sent: Sent[] = [];
  const streams = new Map<string, MediaStream | null>();

  const mesh = new GroupMesh({
    selfId,
    iceServers: [],
    localStream: fakeStream(),
    sendSignal: (to, signal) => sent.push({ to, signal }),
    onStream: (peerId, stream) => streams.set(peerId, stream),
  });

  return { mesh, sent, streams };
}

beforeEach(() => {
  created = [];
  vi.stubGlobal('RTCPeerConnection', FakePeer);
});

describe('ulanish ochish', () => {
  it("har bir ishtirokchi uchun BITTA ulanish yasaladi", async () => {
    const { mesh } = buildMesh(A);

    mesh.sync([B, C]);
    await Promise.resolve();

    expect(mesh.size).toBe(2);
    expect(mesh.peerIds.sort()).toEqual([B, C].sort());
  });

  it("o'zim bilan ulanish yasalmaydi", async () => {
    const { mesh } = buildMesh(A);

    mesh.sync([A, B]);
    await Promise.resolve();

    expect(mesh.peerIds).toEqual([B]);
  });

  it('takroriy chaqiruv yangi ulanish yasamaydi', async () => {
    const { mesh } = buildMesh(A);

    mesh.sync([B]);
    await Promise.resolve();
    mesh.sync([B]);
    await Promise.resolve();
    mesh.sync([B]);
    await Promise.resolve();

    expect(mesh.size).toBe(1);
    expect(created).toHaveLength(1);
  });

  it("ro'yxatdan chiqqan odamning ulanishi YOPILADI", async () => {
    const { mesh, streams } = buildMesh(A);

    mesh.sync([B, C]);
    await Promise.resolve();

    mesh.sync([B]);

    expect(mesh.peerIds).toEqual([B]);
    // Ekrandan ham olib tashlanishi kerak.
    expect(streams.get(C)).toBeNull();
  });
});

describe('kim taklif yuboradi', () => {
  it("ID'si KICHIK bo'lgan tomon taklif yuboradi", async () => {
    const { mesh, sent } = buildMesh(A);

    mesh.sync([B]);
    await Promise.resolve();
    await Promise.resolve();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: B, signal: { type: 'offer' } });
  });

  it("ID'si KATTA bo'lgan tomon KUTADI", async () => {
    const { mesh, sent } = buildMesh(C);

    mesh.sync([A]);
    await Promise.resolve();
    await Promise.resolve();

    /**
     * Ikkalasi ham taklif yuborsa, ulanish yarim holatda qolib
     * ketardi ("glare"). Shuning uchun bittasi jim turadi.
     */
    expect(sent).toHaveLength(0);
    expect(mesh.size).toBe(1);
  });
});

describe('signal qabul qilish', () => {
  it('taklifga JAVOB yuboriladi', async () => {
    const { mesh, sent } = buildMesh(C);

    await mesh.handleSignal(A, { type: 'offer', sdp: 'SDP-OFFER' });

    expect(sent).toContainEqual({ to: A, signal: { type: 'answer', sdp: 'SDP-ANSWER' } });
  });

  it("ulanish hali yo'q bo'lsa ham taklif qabul qilinadi", async () => {
    /**
     * Signal va ishtirokchilar ro'yxati ikki xil yo'l bilan keladi:
     * taklif ro'yxatdan OLDIN kelishi mumkin.
     */
    const { mesh } = buildMesh(C);

    expect(mesh.size).toBe(0);

    await mesh.handleSignal(A, { type: 'offer', sdp: 'SDP-OFFER' });

    expect(mesh.size).toBe(1);
  });

  it("takroriy JAVOB e'tiborsiz qoldiriladi", async () => {
    const { mesh, sent } = buildMesh(A);

    mesh.sync([B]);
    await Promise.resolve();
    await Promise.resolve();

    await mesh.handleSignal(B, { type: 'answer', sdp: 'SDP-ANSWER' });
    const afterFirst = sent.length;

    // Ikkinchi javob brauzerda xato berardi — u tashlab yuborilishi kerak.
    await mesh.handleSignal(B, { type: 'answer', sdp: 'SDP-ANSWER' });

    expect(sent).toHaveLength(afterFirst);
  });

  it('erta kelgan manzil NAVBATDA kutadi va yiqilmaydi', async () => {
    const { mesh } = buildMesh(C);

    // Ulanish tavsifi hali o'rnatilmagan.
    await expect(mesh.handleSignal(A, { type: 'candidate', candidate: { candidate: 'x' } })).resolves.toBeUndefined();

    expect(mesh.size).toBe(1);
  });
});

describe('yopish', () => {
  it('hamma ulanish yopiladi', async () => {
    const { mesh } = buildMesh(A);

    mesh.sync([B, C]);
    await Promise.resolve();

    mesh.close();

    expect(mesh.size).toBe(0);
    expect(created.every((peer) => peer.isClosed)).toBe(true);
  });

  it("yopilgandan keyin yangi ulanish OCHILMAYDI", async () => {
    const { mesh } = buildMesh(A);

    mesh.close();
    mesh.sync([B, C]);
    await Promise.resolve();

    expect(mesh.size).toBe(0);
  });

  it("yopilgandan keyin signal QABUL QILINMAYDI", async () => {
    const { mesh, sent } = buildMesh(C);

    mesh.close();
    await mesh.handleSignal(A, { type: 'offer', sdp: 'SDP-OFFER' });

    expect(sent).toHaveLength(0);
  });
});
