// 改善：クリア率だけでなく「手の数の6割以上を使ってクリアする」ように、目標の数と手の数を一緒に決める。TUNE2=1 のときだけ動く
import { describe, it } from 'vitest';
import { bestMove, candidates, isLost, isWon, newGame, paw, type StageDef, type State } from './rules';
import { WORLD1 } from './stages';

const TARGET = [0.97, 0.95, 0.93, 0.9, 0.9, 0.85, 0.8, 0.75, 0.72, 0.55, 0.88, 0.45];
function mulberry(a: number) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function run(st: StageDef, n: number) {
  let w = 0, used = 0;
  for (let k = 1; k <= n; k++) {
    let s: State = newGame(st, k * 7919 + 13); const R = mulberry(k * 104729 + 71); let g = 0;
    while (!isWon(s) && !isLost(s) && g++ < 200) { const cs = candidates(s); const c = R() < 0.3 ? cs[Math.floor(R() * cs.length)] : bestMove(s, 1, R); if (c == null) break; s = paw(s, c)!.state; }
    if (isWon(s)) { w++; used += st.moves - s.movesLeft; }
  }
  return { rate: w / n, used: w ? used / w / st.moves : 0 };
}
describe.skipIf(!process.env.TUNE2)('手を使い切るくらいの長さにする', () => {
  it('12ステージ', () => {
    const N = Number(process.env.EVAL_N || 80), out: string[] = [];
    WORLD1.stages.forEach((st, i) => {
      if (process.env.ONLY && !process.env.ONLY.split(',').map(Number).includes(st.n)) return;
      const T = TARGET[i]; let best: { st: StageDef; rate: number; used: number } | null = null;
      const kind = st.goal.color ? 'color' : st.goal.boxes && !st.goal.kittens ? 'boxes' : st.goal.kittens && !st.goal.boxes ? 'kittens' : 'mixed';
      const variants: StageDef[] = [];
      if (kind === 'color') for (let v = 20; v <= 60; v += 4) variants.push({ ...st, goal: { color: [st.goal.color![0], v] } });
      if (kind === 'boxes') for (let v = 8; v <= 30; v += 2) variants.push({ ...st, goal: { boxes: v } });
      if (kind === 'kittens') for (const K of [2, 3, 4, 5]) for (const kr of [0, 1, 2, 3, 4]) if (kr < st.H - 1) variants.push({ ...st, goal: { kittens: K }, k0: Math.min(K, 2), kRow: kr });
      if (kind === 'mixed') for (let v = 10; v <= 40; v += 3) variants.push({ ...st, goal: { ...st.goal, boxes: v } });
      for (const v of variants) {
        // 手の数は15〜30の中で、ねらいのクリア率に届くいちばん少ない数
        let lo = Number(process.env.MINM || 15), hi = 30, M = -1;
        while (lo <= hi) { const m = (lo + hi) >> 1; if (run({ ...v, moves: m }, N).rate >= T) { M = m; hi = m - 1; } else lo = m + 1; }
        if (M < 0) continue;
        const cand = { ...v, moves: M }, r = run(cand, N);
        // ねらいのクリア率を大きく超える（やさしすぎる）ものは減点。手の数の6〜7割を使うものを選ぶ
        const sc = (x: { st: StageDef; rate: number; used: number }) => Math.abs(x.used - 0.68) + (x.st.moves > 26 ? 0.05 : 0) + 2 * Math.max(0, x.rate - (T + 0.06));
        const c2 = { st: cand, ...r };
        if (!best || sc(c2) < sc(best)) best = c2;
      }
      if (best) out.push(`${st.n}: moves ${best.st.moves} goal ${JSON.stringify(best.st.goal)} k0 ${best.st.k0} kRow ${best.st.kRow} | 初心者 ${Math.round(100 * best.rate)}% 使った手 ${Math.round(100 * best.used)}%`);
      else out.push(`${st.n}: 見つからない`);
    });
    console.log('\n' + out.join('\n'));
  }, 3600000);
});
