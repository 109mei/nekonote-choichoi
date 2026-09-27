// やさしい効果音（その場で合成。音源ファイルは使わない）
let ctx: AudioContext | null = null;
let enabled = true;
export function setSound(on: boolean) { enabled = on; }
function ac() {
  if (!enabled) return null;
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; }
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slide = 0, delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur: number, vol = 0.12, from = 1800, to = 400, delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay, n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0); src.connect(f).connect(g).connect(a.destination); src.start(t0);
}
export const sfx = {
  tap: () => tone(660, 0.08, 'sine', 0.12),
  pop: () => { tone(520, 0.12, 'triangle', 0.16, 380); noise(0.06, 0.05, 3000, 1200); },
  wind: (wave: number) => { const base = 440 * Math.pow(2, Math.min(wave - 1, 7) / 6); tone(base, 0.22, 'sine', 0.14, base * 0.5); tone(base * 1.5, 0.18, 'sine', 0.06, 0, 0.05); noise(0.22, 0.04, 900, 2600); },
  box: () => { noise(0.18, 0.2, 700, 180); tone(140, 0.14, 'triangle', 0.14, -60); },
  hit: () => { noise(0.08, 0.12, 900, 300); tone(200, 0.08, 'triangle', 0.08); },
  land: () => tone(180, 0.06, 'sine', 0.05),
  kitten: () => { tone(900, 0.12, 'triangle', 0.1, 350); tone(1150, 0.16, 'triangle', 0.08, -250, 0.1); },
  special: () => { tone(330, 0.3, 'sawtooth', 0.06, 660); noise(0.3, 0.08, 400, 3000); },
  punch: () => { tone(90, 0.25, 'sine', 0.3, -40); noise(0.2, 0.2, 500, 120); },
  nope: () => { tone(300, 0.09, 'triangle', 0.08); tone(250, 0.12, 'triangle', 0.08, 0, 0.09); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.14, 0, i * 0.11)); },
  lose: () => { [440, 392, 349].forEach((f, i) => tone(f, 0.32, 'sine', 0.1, 0, i * 0.16)); },
  meow: () => {
    const a = ac(); if (!a) return;
    const t0 = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t0); o.frequency.linearRampToValueAtTime(760, t0 + 0.14); o.frequency.linearRampToValueAtTime(560, t0 + 0.42);
    f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t0); f.frequency.linearRampToValueAtTime(1500, t0 + 0.16); f.frequency.linearRampToValueAtTime(800, t0 + 0.42);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    o.connect(f).connect(g).connect(a.destination); o.start(t0); o.stop(t0 + 0.5);
  },
};
