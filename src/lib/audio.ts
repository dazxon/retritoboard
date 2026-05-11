let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    return audioCtx
  } catch {
    return null
  }
}

function beep(
  ctx: AudioContext,
  delaySec: number,
  freq: number,
  durSec = 0.25,
  vol = 0.25,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const t0 = ctx.currentTime + delaySec
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + durSec + 0.05)
}

export function playAlarm() {
  const ctx = getCtx()
  if (!ctx) return
  beep(ctx, 0, 880)
  beep(ctx, 0.35, 880)
  beep(ctx, 0.7, 1320, 0.5)
}

// Pre-warm el AudioContext aprovechando un user gesture
export function primeAudio() {
  getCtx()
}
