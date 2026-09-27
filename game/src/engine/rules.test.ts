import { describe, expect, it } from 'vitest';
import { bestMove, candidates, hasMove, isLost, isWon, newGame, paw, progress, useItem, findMatches, type State } from './rules';
import { WORLD1 } from './stages';

function mulberry(a: number) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
type Who = 'skilled' | 'novice' | 'random';
function playOnce(stageIdx: number, seed: number, who: Who, extra = 0) {
  const st = WORLD1.stages[stageIdx]; let s: State = newGame(st, seed * 7919 + 13); s.movesLeft += extra;
  const R = mulberry(seed * 104729 + 71);
  let guard = 0;
  while (!isWon(s) && !isLost(s) && guard++ < 200) {
    let c: number | null;
    const cs = candidates(s);
    if (who === 'random' || (who === 'novice' && R() < 0.3)) c = cs[Math.floor(R() * cs.length)];
    else c = bestMove(s, who === 'skilled' ? 2 : 1, R);
    if (c == null) break;
    const r = paw(s, c); if (!r) throw new Error('選べない手を選んだ');
    s = r.state;
  }
  return { won: isWon(s), prog: progress(s) };
}

describe('ルール', () => {
  it('同じ種なら同じ盤面になる', () => {
    const a = newGame(WORLD1.stages[5], 42), b = newGame(WORLD1.stages[5], 42);
    expect(a.cells.map(i => (i ? JSON.stringify({ ...a.pieces[i], id: 0 }) : '')).join()).toEqual(b.cells.map(i => (i ? JSON.stringify({ ...b.pieces[i], id: 0 }) : '')).join());
  });
  it('はじめの盤面にそろった所がなく、選べる手がある', () => {
    for (const st of WORLD1.stages) for (let k = 1; k <= 20; k++) { const s = newGame(st, k); expect(findMatches(s).length).toBe(0); expect(hasMove(s)).toBe(true); }
  });
  it('1手ごとに盤面がうまり、そろいが残らない', () => {
    for (const st of WORLD1.stages) {
      let s = newGame(st, 7);
      for (let m = 0; m < 10 && !isWon(s) && !isLost(s); m++) {
        const c = candidates(s)[0]; const r = paw(s, c)!; s = r.state;
        expect(s.cells.every(x => x > 0)).toBe(true);
        expect(findMatches(s).length).toBe(0);
        const ids = new Set(s.cells); expect(ids.size).toBe(s.cells.length);
      }
    }
  });
  it('そろわない所は選べない', () => {
    const s = newGame(WORLD1.stages[0], 3);
    for (let i = 0; i < s.cells.length; i++) if (!candidates(s).includes(i)) expect(paw(s, i)).toBeNull();
  });
  it('またたびで5手ふえる', () => {
    const s = newGame(WORLD1.stages[0], 3); const r = useItem(s, 'matatabi')!; expect(r.state.movesLeft).toBe(s.movesLeft + 5);
  });
});

// 評価：ステージごとのクリア率（ねらい：初心者で 98%→49% へ少しずつ難しく、でたらめは後半ほど通らない）
describe('評価（クリア率）', () => {
  it('12ステージを上手・初心者・でたらめで遊ぶ', () => {
    const N = Number(process.env.EVAL_N || 60), NS = Number(process.env.EVAL_NS || 20);
    const rows: string[] = [];
    WORLD1.stages.forEach((st, idx) => {
      const rate = (who: Who, n: number, extra = 0) => { let w = 0; for (let k = 1; k <= n; k++) if (playOnce(idx, k, who, extra).won) w++; return Math.round((100 * w) / n); };
      rows.push(`${String(st.n).padStart(2)} ${st.title.padEnd(12, '　')} 手${st.moves} | 上手 ${rate('skilled', NS)}% 初心者 ${rate('novice', N)}% でたらめ ${rate('random', N)}% | 初心者＋5手 ${rate('novice', N, 5)}%`);
    });
    console.log('\n' + rows.join('\n'));
  }, 600000);
});
