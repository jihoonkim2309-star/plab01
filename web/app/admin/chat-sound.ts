// 채팅 알림음 — Web Audio API 로 직접 합성 (외부 mp3 파일 불필요).
// "띵-동" 두 음 짧게. 첫 user gesture 후만 동작 (브라우저 정책).

export function playChatDing() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const playTone = (freq: number, startAt: number, dur: number, vol = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + startAt;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    };

    // 띵 (B5) → 동 (E5)
    playTone(988, 0, 0.3);
    playTone(659, 0.15, 0.3);

    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* ignore */
  }
}
