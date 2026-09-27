// 小さな動きの道具（Pixi の毎フレームで進める）
export type Ease = (x: number) => number;
export const ease = {
  linear: (x: number) => x,
  inQuad: (x: number) => x * x,
  outQuad: (x: number) => 1 - (1 - x) * (1 - x),
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outElastic: (x: number) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};
type Job = { t: number; d: number; delay: number; e: Ease; f: (k: number) => void; done: () => void };
export class Tweener {
  private jobs: Job[] = [];
  speed = 1;
  update(ms: number) {
    const dt = ms * this.speed;
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      if (j.delay > 0) { j.delay -= dt; if (j.delay > 0) continue; }
      j.t += dt; const k = Math.min(1, j.t / j.d); j.f(j.e(k));
      if (k >= 1) { this.jobs.splice(i, 1); j.done(); }
    }
  }
  run(d: number, f: (k: number) => void, e: Ease = ease.outQuad, delay = 0): Promise<void> {
    return new Promise(res => { if (d <= 0) { f(1); res(); return; } this.jobs.push({ t: 0, d, delay, e, f, done: res }); });
  }
  wait(ms: number) { return this.run(ms, () => {}, ease.linear); }
  clear() { this.jobs.forEach(j => j.done()); this.jobs = []; }
}
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
