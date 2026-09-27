// 本番のルールで、初心者のクリア率がねらいに合うよう目標の数（子猫の面は手の数）を決める。TUNE=1 のときだけ動く
import { describe, it } from 'vitest';
import { bestMove, candidates, isLost, isWon, newGame, paw, type StageDef, type State } from './rules';
import { WORLD1 } from './stages';

const TARGET = [0.97, 0.95, 0.93, 0.9, 0.9, 0.85, 0.8, 0.75, 0.72, 0.55, 0.88, 0.45];
function mulberry(a: number) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rate(st: StageDef, who: 'novice' | 'skilled' | 'random', n: number) {
  let w = 0;
  for (let k = 1; k <= n; k++) {
    let s: State = newGame(st, k * 7919 + 13); const R = mulberry(k * 104729 + 71); let g = 0;
    while (!isWon(s) && !isLost(s) && g++ < 200) {
      const cs = candidates(s);
      const c = who === 'random' || (who === 'novice' && R() < 0.3) ? cs[Math.floor(R() * cs.length)] : bestMove(s, who === 'skilled' ? 2 : 1, R);
      if (c == null) break; s = paw(s, c)!.state;
    }
    if (isWon(s)) w++;
  }
  return w / n;
}
describe.skipIf(!process.env.TUNE)('ねらいに合わせる', () => {
  it('12ステージ', () => {
    const N = Number(process.env.EVAL_N || 120), out: string[] = [];
    WORLD1.stages.forEach((st0, i) => {
      if (process.env.ONLY && Number(process.env.ONLY) !== st0.n) return;
      const st: StageDef = process.env.KROW ? { ...st0, kRow: Number(process.env.KROW) } : st0;
      const T = TARGET[i]; let best: StageDef = st;
      const knob = st.goal.kittens && !st.goal.boxes ? 'moves' : st.goal.boxes ? 'boxes' : 'color';
      const make = (v: number): StageDef => knob === 'moves' ? { ...st, moves: v } : knob === 'boxes' ? { ...st, goal: { ...st.goal, boxes: v } } : { ...st, goal: { color: [st.goal.color![0], v] } };
      if (knob === 'moves') { let lo = 10, hi = 40; while (lo <= hi) { const m = (lo + hi) >> 1; if (rate(make(m), 'novice', N) >= T) { best = make(m); hi = m - 1; } else lo = m + 1; } }
      else { let lo = 3, hi = 90; while (lo <= hi) { const m = (lo + hi) >> 1; if (rate(make(m), 'novice', N) >= T) { best = make(m); lo = m + 1; } else hi = m - 1; } }
      const g = best.goal;
      out.push(`${st.n}: moves ${best.moves} goal ${JSON.stringify(g)} | 上手 ${Math.round(100 * rate(best, 'skilled', 20))}% 初心者 ${Math.round(100 * rate(best, 'novice', N))}% でたらめ ${Math.round(100 * rate(best, 'random', N))}%`);
    });
    console.log('\n' + out.join('\n'));
  }, 1800000);
});
