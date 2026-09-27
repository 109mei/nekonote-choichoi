// 手ざわりの評価：クリアまでに使った手の数、れんさ・特別な玉・箱がこわれる回数、「あと少し」で負けた割合。FEEL=1 のときだけ動く
import { describe, it } from 'vitest';
import { bestMove, candidates, isLost, isWon, newGame, paw, progress, type State } from './rules';
import { WORLD1 } from './stages';

function mulberry(a: number) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
describe.skipIf(!process.env.FEEL)('手ざわり', () => {
  it('初心者ボットで12ステージ', () => {
    const N = Number(process.env.EVAL_N || 100), rows: string[] = [];
    for (const st of WORLD1.stages) {
      let wins = 0, usedSum = 0, early = 0, near = 0, fails = 0, moves = 0, chain = 0, big = 0, made = 0, broken = 0;
      for (let k = 1; k <= N; k++) {
        let s: State = newGame(st, k * 7919 + 13); const R = mulberry(k * 104729 + 71); let g = 0;
        while (!isWon(s) && !isLost(s) && g++ < 200) {
          const cs = candidates(s); const c = R() < 0.3 ? cs[Math.floor(R() * cs.length)] : bestMove(s, 1, R); if (c == null) break;
          const r = paw(s, c)!; s = r.state; moves++;
          let waves = 0, balls = 0;
          for (const e of r.events) { if (e.t === 'clear') { waves = Math.max(waves, e.wave); balls += e.cleared.length; made += e.made.length; broken += e.broken.length; } if (e.t === 'fire') { balls += e.cleared.length; broken += e.broken.length; } }
          if (waves >= 2) chain++; if (balls >= 8) big++;
        }
        if (isWon(s)) { wins++; const used = st.moves - s.movesLeft; usedSum += used; if (used <= st.moves * 0.5) early++; }
        else { fails++; if (progress(s) >= 0.8) near++; }
      }
      rows.push(`${String(st.n).padStart(2)} ${st.title.padEnd(12, '　')} 手${st.moves} | 勝ち${Math.round(100 * wins / N)}% 使った手 平均${(usedSum / Math.max(1, wins)).toFixed(1)}（半分以下で終わる ${Math.round(100 * early / Math.max(1, wins))}%）| 負けのうち あと少し ${fails ? Math.round(100 * near / fails) : 0}% | 1手あたり れんさ ${Math.round(100 * chain / moves)}%・大きく消える ${Math.round(100 * big / moves)}%・特別な玉 ${(made / N).toFixed(1)}こ/回・箱 ${(broken / moves).toFixed(2)}こ/手`);
    }
    console.log('\n' + rows.join('\n'));
  }, 600000);
});
