/**
 * Synthesized V6-ish engine rev — pure WebAudio, no audio assets.
 * Two detuned saws + filtered noise, pitch ramps up then falls away.
 * Only ever called from an explicit user gesture (clicking the car / REV).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playRev(volume = 0.5) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const dur = 1.5;

  const master = ac.createGain();
  master.gain.value = 0;
  const lowpass = ac.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.Q.value = 4;
  lowpass.frequency.setValueAtTime(360, t0);
  lowpass.frequency.exponentialRampToValueAtTime(2600, t0 + 0.32);
  lowpass.frequency.exponentialRampToValueAtTime(500, t0 + dur);
  master.connect(lowpass).connect(ac.destination);

  // engine body: two detuned saws an octave apart
  for (const [mult, detune, gain] of [
    [1, 0, 0.5],
    [1, 14, 0.35],
    [2, -8, 0.22],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(62 * mult, t0);
    osc.frequency.exponentialRampToValueAtTime(255 * mult, t0 + 0.3);
    osc.frequency.exponentialRampToValueAtTime(70 * mult, t0 + dur);
    const g = ac.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.1);
  }

  // exhaust rasp: bandpassed noise burst
  const noiseLen = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, noiseLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(900, t0);
  bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.3);
  bp.frequency.exponentialRampToValueAtTime(700, t0 + dur);
  bp.Q.value = 0.8;
  const ng = ac.createGain();
  ng.gain.value = 0.16;
  noise.connect(bp).connect(ng).connect(master);
  noise.start(t0);

  // master envelope: snap in, tail out
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(volume, t0 + 0.06);
  master.gain.setValueAtTime(volume, t0 + 0.35);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

export function playShift(volume = 0.18) {
  // tiny "gear shift" blip used by UI accents
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1400, t0);
  osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.07);
  const g = ac.createGain();
  g.gain.setValueAtTime(volume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}
