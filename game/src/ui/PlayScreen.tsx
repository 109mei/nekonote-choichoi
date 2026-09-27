import { useCallback, useEffect, useRef, useState } from 'react';
import { bestMove, blastArea, candidates, isLost, isWon, newGame, paw, preview, progress, useItem, type Ev, type StageDef, type State } from '../engine/rules';
import { COLOR_NAMES } from '../engine/stages';
import { BoardView } from '../game/BoardView';
import { sfx } from '../game/sfx';
import { ALBUM } from '../art/palette';
import type { Save } from '../save';
import MainCat, { type CatHandle } from './MainCat';
import { BallIcon, BoxIcon, Hanamaru, KittenIcon, PunchIcon } from './icons';

type Phase = 'loading' | 'intro' | 'play' | 'won' | 'lost' | 'menu' | 'ad';
type Item = 'punch' | 'sweep';
const counters = (s: State) => ({ col: s.got.col.slice(), boxes: s.got.boxes, kittens: s.got.kittens, moves: s.movesLeft });
const seedNow = () => (Date.now() ^ (Math.random() * 1e9)) | 0;

export default function PlayScreen({ stage, save, setSave, onExit, onNext, hasNext, nextStage }: {
  stage: StageDef; save: Save; setSave: (f: (s: Save) => Save) => void; onExit: () => void; onNext: () => void; hasNext: boolean; nextStage?: StageDef;
}) {
  const host = useRef<HTMLDivElement>(null), view = useRef<BoardView | null>(null), cat = useRef<CatHandle>(null);
  const basket = useRef<HTMLDivElement>(null), kittenGoal = useRef<HTMLDivElement>(null), boxGoal = useRef<HTMLDivElement>(null);
  const stRef = useRef<State>(newGame(stage, seedNow()));
  const [shown, setShown] = useState(() => counters(stRef.current));
  const [phase, _setPhase] = useState<Phase>('loading'); const phaseRef = useRef<Phase>('loading');
  const setPhase = (p: Phase) => { phaseRef.current = p; _setPhase(p); };
  const [loadK, setLoadK] = useState(0);
  const selRef = useRef(-1); const itemRef = useRef<Item | null>(null); const [item, _setItem] = useState<Item | null>(null);
  const setItem = (i: Item | null) => { itemRef.current = i; _setItem(i); };
  const [toast, setToast] = useState<string | null>(null); const toastT = useRef(0);
  const [basketColor, setBasketColor] = useState(stage.goal.color ? stage.goal.color[0] : 0); const [bump, setBump] = useState(0);
  const [result, setResult] = useState<{ stars: number; newCard: boolean } | null>(null);
  const [adLeft, setAdLeft] = useState(0); const adThen = useRef<() => void>(() => {});
  const busy = useRef(false), hintT = useRef(0);
  const saveRef = useRef(save); saveRef.current = save;

  const say = useCallback((s: string, ms = 2200) => { setToast(s); clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToast(null), ms); }, []);
  const clearSel = () => { selRef.current = -1; view.current?.select(-1, null); };
  const scheduleHint = useCallback((ms = 9000) => {
    clearTimeout(hintT.current);
    hintT.current = window.setTimeout(() => {
      if (phaseRef.current !== 'play' || busy.current || selRef.current >= 0) return;
      const c = bestMove(stRef.current, 1); if (c == null) return;
      view.current?.hint(c); const p = view.current?.cellScreen(c); if (p) cat.current?.look(p.x, p.y);
    }, ms);
  }, []);

  // ---- 盤面の用意 ----
  useEffect(() => {
    const v = new BoardView(host.current!, {
      onTap: c => tapRef.current(c),
      onEvent: ev => eventRef.current(ev),
      collectPoint: kind => {
        const el = kind === 'kitten' ? kittenGoal.current : kind === 'box' ? boxGoal.current : basket.current;
        if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
    });
    view.current = v;
    void v.init(stage.nc, k => setLoadK(k)).then(() => { if (!v.app.stage) return; v.setState(stRef.current); setPhase('intro'); });
    return () => { clearTimeout(hintT.current); v.destroy(); };
  }, [stage]);

  // 開発中だけ：画面の確かめ用の入口（本番には入らない）
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__choi = { state: () => stRef.current, best: () => bestMove(stRef.current, 1), cands: () => candidates(stRef.current), tap: (c: number) => tapRef.current(c), at: (c: number) => view.current?.cellScreen(c), phase: () => phaseRef.current, render: () => view.current?.app.render() };
  }, []);

  // ---- 出来事ごとに数を減らし、ねこが反応する ----
  const eventRef = useRef<(ev: Ev) => void>(() => {});
  eventRef.current = (ev: Ev) => {
    setShown(sh => {
      const n = { ...sh, col: sh.col.slice() };
      if (ev.t === 'paw') n.col[ev.color]++;
      if (ev.t === 'clear' || ev.t === 'fire') { for (const c of ev.cleared) n.col[c.color]++; n.boxes += ev.broken.length; }
      if (ev.t === 'exit') n.kittens += ev.kittens.length;
      if (ev.t === 'moves') n.moves += ev.delta;
      return n;
    });
    if (ev.t === 'paw') { setBasketColor(ev.color); setBump(b => b + 1); }
    if (ev.t === 'clear' && ev.cleared.length) { setBasketColor(ev.cleared[0].color); setBump(b => b + 1); if (ev.wave >= 2) cat.current?.react('cheer'); }
    if (ev.t === 'fire') cat.current?.react('cheer');
    if (ev.t === 'exit') cat.current?.react('happy');
  };

  // ---- タップ ----
  const tapRef = useRef<(c: number) => void>(() => {});
  tapRef.current = (cell: number) => {
    if (busy.current || phaseRef.current !== 'play') return;
    clearTimeout(hintT.current); view.current?.hint(-1);
    const s = stRef.current, id = s.cells[cell], p = id ? s.pieces[id] : undefined;
    const it = itemRef.current;
    if (it) {
      let area: number[] = [];
      if (it === 'punch') { if (p && (p.kind === 'kitten' || p.kind === 'box')) { view.current?.nope(cell); say('毛糸玉の上をえらんでね'); return; } area = blastArea(s, cell, 'punch'); }
      else { if (!p || p.kind !== 'ball') { view.current?.nope(cell); say('毛糸玉をえらんでね'); return; } area = s.cells.map((q, i) => (q && s.pieces[q].kind === 'ball' && (s.pieces[q] as { color: number }).color === p.color ? i : -1)).filter(i => i >= 0); }
      if (selRef.current === cell) { void commitItem(it, cell); return; }
      selRef.current = cell; view.current?.select(cell, { match: [], shift: [], area }); sfx.tap(); say('もう一度タップすると使います');
      return;
    }
    const pv = preview(s, cell);
    if (!pv.valid) { view.current?.nope(cell); say(p && p.kind === 'ball' ? 'そこを抜いても、3つそろいません' : p && p.kind === 'kitten' ? '子猫はさわらずに、下の毛糸を抜いてね' : p && p.kind === 'box' ? '箱は、となりで毛糸を巻くとこわれます' : '毛糸玉をえらんでね'); scheduleHint(); return; }
    const pt = view.current?.cellScreen(cell); if (pt) cat.current?.look(pt.x, pt.y);
    if (saveRef.current.oneTap || selRef.current === cell) { void commit(cell); return; }
    selRef.current = cell; view.current?.select(cell, pv); sfx.tap();
    const up = cell >= s.W ? s.pieces[s.cells[cell - s.W]] : undefined;
    if (!pv.match.length && up && up.kind === 'kitten') say('ここを抜くと、子猫が1段 下りられます', 2600);
    else if (!saveRef.current.helpSeen) say('光ったところが そろいます。もう一度タップで ちょいっ', 3200);
  };

  async function runMove(r: { state: State; events: Ev[] } | null) {
    if (!r || !view.current) return;
    busy.current = true; clearSel();
    await view.current.play(r.events, r.state);
    stRef.current = r.state; setShown(counters(r.state)); busy.current = false;
    if (!saveRef.current.helpSeen) setSave(s => ({ ...s, helpSeen: true }));
    if (isWon(r.state)) await finishWin(r.state);
    else if (isLost(r.state)) { setPhase('lost'); cat.current?.react('sad'); sfx.lose(); }
    else { scheduleHint(); cat.current?.lookAway(); }
  }
  const commit = (cell: number) => runMove(paw(stRef.current, cell));
  async function commitItem(it: Item, cell: number) {
    const r = useItem(stRef.current, it, cell); if (!r) { view.current?.nope(cell); return; }
    setItem(null); setSave(s => ({ ...s, items: { ...s.items, [it]: s.items[it] - 1 } }));
    await runMove(r);
  }
  async function finishWin(s: State) {
    setPhase('won'); cat.current?.react('happy'); sfx.win();
    await view.current?.celebrate(Math.min(s.movesLeft, 6));
    const ratio = s.movesLeft / stage.moves, stars = ratio >= 0.3 ? 3 : ratio >= 0.1 ? 2 : 1;
    const newCard = !saveRef.current.album.includes(stage.n);
    setSave(sv => ({ ...sv, cleared: { ...sv.cleared, [stage.n]: Math.max(stars, sv.cleared[stage.n] || 0) }, album: newCard ? [...sv.album, stage.n] : sv.album }));
    setResult({ stars, newCard });
  }

  // ---- ボタン ----
  const start = () => { setPhase('play'); sfx.meow(); scheduleHint(stage.n === 1 && !save.helpSeen ? 1200 : 9000); if (stage.n === 1 && !save.helpSeen) say('光っている毛糸玉を、タップしてみてね', 4000); };
  const retry = () => { const s = newGame(stage, seedNow()); stRef.current = s; setShown(counters(s)); view.current?.setState(s); setResult(null); clearSel(); setItem(null); setPhase('play'); cat.current?.react('idle'); scheduleHint(); };
  const watchAd = (then: () => void) => { adThen.current = then; setAdLeft(5); setPhase('ad'); };
  useEffect(() => { if (phase !== 'ad' || adLeft <= 0) return; const t = setTimeout(() => setAdLeft(a => a - 1), 1000); return () => clearTimeout(t); }, [phase, adLeft]);
  const useMatatabi = async () => {
    if (save.items.matatabi <= 0) return;
    setSave(s => ({ ...s, items: { ...s.items, matatabi: s.items.matatabi - 1 } }));
    const r = useItem(stRef.current, 'matatabi')!; setPhase('play'); cat.current?.react('cheer'); await runMove(r);
  };
  const pickItem = (it: Item) => {
    if (busy.current || phase !== 'play') return;
    if (item === it) { setItem(null); clearSel(); return; }
    if (save.items[it] <= 0) { setConfirm({ it }); return; }
    setItem(it); clearSel(); say(it === 'punch' ? 'ねこパンチ：使いたい所をタップしてね' : '大そうじ：巻きたい色の毛糸玉をタップしてね', 3000);
  };
  const [confirm, setConfirm] = useState<{ it: Item | 'matatabi' } | null>(null);
  const itemName = { punch: 'ねこパンチ', sweep: '大そうじ', matatabi: 'またたび' } as const;

  const g = stage.goal, rem = {
    color: g.color ? Math.max(0, g.color[1] - shown.col[g.color[0]]) : 0,
    boxes: g.boxes ? Math.max(0, g.boxes - shown.boxes) : 0,
    kittens: g.kittens ? Math.max(0, g.kittens - shown.kittens) : 0,
  };
  const goalText = [g.color ? `${COLOR_NAMES[g.color[0]]}の毛糸を ${g.color[1]}玉` : '', g.boxes ? `みかん箱を ${g.boxes}こ` : '', g.kittens ? `子猫を ${g.kittens}ひき おろす` : ''].filter(Boolean).join('、');
  const near = progress(stRef.current) >= 0.7;
  const card = ALBUM[(stage.n - 1) % ALBUM.length];
  const kittenLook = (() => { const s = stRef.current; for (const id of s.cells) { const p = id ? s.pieces[id] : undefined; if (p && p.kind === 'kitten') return p.look; } return 1; })();

  return (
    <div className="play">
      <header className="hud">
        <button className="hud-menu" onClick={() => phase === 'play' && setPhase('menu')} aria-label="メニュー">メニュー</button>
        <div className="goals" aria-label="目標">
          {g.color && <div className={`goal ${rem.color === 0 ? 'done' : ''}`}><BallIcon color={g.color[0]} size={40} /><b>{rem.color === 0 ? '✓' : rem.color}</b></div>}
          {g.boxes && <div ref={boxGoal} className={`goal ${rem.boxes === 0 ? 'done' : ''}`}><BoxIcon size={40} hp={stage.boxHp} /><b>{rem.boxes === 0 ? '✓' : rem.boxes}</b></div>}
          {g.kittens && <div ref={kittenGoal} className={`goal ${rem.kittens === 0 ? 'done' : ''}`}><KittenIcon coat={kittenLook} size={42} /><b>{rem.kittens === 0 ? '✓' : rem.kittens}</b></div>}
        </div>
        <div className={`moves ${shown.moves <= 3 ? 'low' : ''}`} aria-label={`のこり ${shown.moves}手`}><small>のこり</small><b>{shown.moves}</b><small>手</small></div>
      </header>

      <div className="board-host" ref={host} />

      <footer className="dock">
        <MainCat ref={cat} coat={0} size={104} />
        <div className="items">
          <button className={`item ${item === 'punch' ? 'on' : ''}`} onClick={() => pickItem('punch')}><PunchIcon size={40} /><span>ねこパンチ</span>{save.items.punch > 0 ? <em>{save.items.punch}</em> : <em className="get">＋</em>}</button>
          <button className={`item ${item === 'sweep' ? 'on' : ''}`} onClick={() => pickItem('sweep')}><span className="broom" aria-hidden="true">🧹</span><span>大そうじ</span>{save.items.sweep > 0 ? <em>{save.items.sweep}</em> : <em className="get">＋</em>}</button>
        </div>
        <div className="basket" ref={basket} aria-hidden="true">
          <div className="basket-ball" key={bump}><BallIcon color={basketColor} size={54} /></div>
          <svg viewBox="0 0 100 60" className="basket-body"><path d="M6 12h88l-10 44H16z" fill="#C08850" stroke="#8A5A2E" strokeWidth="3" strokeLinejoin="round" /><path d="M12 24h76M16 36h68M20 48h60" stroke="#8A5A2E" strokeWidth="2.5" opacity=".6" /><path d="M30 12l-4 44M50 12v44M70 12l4 44" stroke="#8A5A2E" strokeWidth="2.5" opacity=".45" /></svg>
        </div>
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}

      {phase === 'loading' && <div className="overlay"><div className="panel"><p className="big">じゅんびしています…</p><div className="bar"><i style={{ width: `${Math.round(loadK * 100)}%` }} /></div></div></div>}

      {phase === 'intro' && (
        <div className="overlay"><div className="panel intro">
          <p className="stage-no">ステージ {stage.n}</p>
          <h2>{stage.title}</h2>
          <div className="goal-line">
            {g.color && <span><BallIcon color={g.color[0]} size={48} />×{g.color[1]}</span>}
            {g.boxes && <span><BoxIcon size={48} hp={stage.boxHp} />×{g.boxes}</span>}
            {g.kittens && <span><KittenIcon coat={kittenLook} size={50} />×{g.kittens}</span>}
          </div>
          <p className="goal-text">{goalText}<br /><b>{stage.moves}手</b>のうちに</p>
          <p className="lead">{stage.lead}</p>
          <button className="btn primary" onClick={start}>はじめる</button>
        </div></div>
      )}

      {phase === 'menu' && (
        <div className="overlay"><div className="panel">
          <h2>ひと休み</h2>
          <button className="btn primary" onClick={() => setPhase('play')}>つづける</button>
          <button className="btn" onClick={retry}>はじめから やりなおす</button>
          <button className="btn" onClick={() => setSave(s => ({ ...s, sound: !s.sound }))}>音：{save.sound ? 'あり' : 'なし'}</button>
          <button className="btn" onClick={() => setSave(s => ({ ...s, oneTap: !s.oneTap }))}>ちょいっ：{save.oneTap ? '1回タップで' : '2回タップで（たしかめてから）'}</button>
          <button className="btn ghost" onClick={onExit}>地図にもどる</button>
        </div></div>
      )}

      {phase === 'lost' && (
        <div className="overlay"><div className="panel">
          <h2>{near ? 'あと少し！' : 'ざんねん…'}</h2>
          <p className="goal-text">のこり：{[rem.color ? `${COLOR_NAMES[g.color![0]]}の毛糸 ${rem.color}玉` : '', rem.boxes ? `みかん箱 ${rem.boxes}こ` : '', rem.kittens ? `子猫 ${rem.kittens}ひき` : ''].filter(Boolean).join('・')}</p>
          {save.items.matatabi > 0
            ? <button className="btn primary" onClick={useMatatabi}>またたびで あと5手<small>（のこり {save.items.matatabi}こ）</small></button>
            : <button className="btn primary" onClick={() => setConfirm({ it: 'matatabi' })}>動画を見て またたびをもらう<small>（あと5手）</small></button>}
          <button className="btn" onClick={retry}>もう一度（はじめから）</button>
          <button className="btn ghost" onClick={onExit}>地図にもどる</button>
          <p className="note">毛糸の落ち方は毎回かわります。運がよければ、次はきっと。</p>
        </div></div>
      )}

      {phase === 'won' && result && (
        <div className="overlay"><div className="panel won">
          <div className="hanamaru-row">{[1, 2, 3].map(k => <Hanamaru key={k} size={60} dim={k > result.stars} />)}</div>
          <h2>はなまる！</h2>
          <div className={`card ${result.newCard ? 'new' : ''}`}>
            <KittenIcon coat={card.coat} size={150} expr="happy" />
            <p className="card-name">{card.name}</p>
            <p className="card-note">{card.note}</p>
            {result.newCard && <p className="card-new">こねこアルバムに 入りました</p>}
            <p className="note">（試作の絵です。本番では、許可をいただいた本物の子猫の写真や動画が入ります）</p>
          </div>
          {hasNext && nextStage && <p className="next-teaser">つぎは「{nextStage.title}」</p>}
          {hasNext && <button className="btn primary" onClick={onNext}>つぎへ</button>}
          <button className="btn ghost" onClick={onExit}>地図にもどる</button>
        </div></div>
      )}

      {confirm && (
        <div className="overlay"><div className="panel">
          <h2>{itemName[confirm.it]}をもらう</h2>
          <p className="goal-text">30秒ほどの動画（広告）を見ると、{itemName[confirm.it]}を1つもらえます。見ますか？</p>
          <button className="btn primary" onClick={() => { const it = confirm.it; setConfirm(null); watchAd(() => { setSave(s => ({ ...s, items: { ...s.items, [it]: s.items[it] + 1 } })); if (it === 'matatabi') setPhase('lost'); else setPhase('play'); }); }}>はい、見る</button>
          <button className="btn ghost" onClick={() => setConfirm(null)}>いいえ</button>
        </div></div>
      )}

      {phase === 'ad' && (
        <div className="overlay ad"><div className="panel">
          <p className="big">（試作）ここに動画の広告が入ります</p>
          <p className="goal-text">{adLeft > 0 ? `あと ${adLeft} 秒` : 'ありがとうございました'}</p>
          <button className="btn primary" disabled={adLeft > 0} onClick={() => adThen.current()}>{adLeft > 0 ? 'お待ちください' : 'もどる'}</button>
        </div></div>
      )}
    </div>
  );
}
