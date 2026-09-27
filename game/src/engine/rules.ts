// ルールの本体（画面から切り離す。同じ種なら同じ結果になる）
//   ねこの手で毛糸玉を1つ抜く → 上の玉が1段さがる → 同じ色が横か縦に3つ並ぶと巻き取られる → 連鎖
//   みかん箱は、となりで玉が巻かれると1回たたかれる。子猫はいちばん下まで下りると「ただいま」
//   4つ並ぶと「ころころ毛糸玉」、5つ以上や曲がった並びは「ねこパンチ」ができる。どちらもタップで使う

export type SpecialType = 'rollH' | 'rollV' | 'punch';
export type Piece =
  | { id: number; kind: 'ball'; color: number }
  | { id: number; kind: 'box'; hp: number; maxHp: number }
  | { id: number; kind: 'kitten'; look: number }
  | { id: number; kind: 'special'; sp: SpecialType; color: number };

export interface Goal { color?: [number, number]; boxes?: number; kittens?: number }
export interface StageDef {
  n: number; title: string; lead: string;
  W: number; H: number; nc: number; moves: number; goal: Goal;
  pB0: number; pB: number; boxHp: number; k0: number; kRow: number; specials: boolean;
}
export interface State {
  W: number; H: number; cells: number[]; pieces: Record<number, Piece>; nextId: number;
  got: { boxes: number; kittens: number; col: number[] };
  movesLeft: number; spawnK: number; onK: number; rng: number; stage: StageDef;
}
export type Cleared = { id: number; cell: number; color: number };
export type Ev =
  | { t: 'paw'; id: number; cell: number; color: number }
  | { t: 'fire'; id: number; cell: number; sp: SpecialType; area: number[]; cleared: Cleared[]; hits: { id: number; cell: number; hp: number }[]; broken: { id: number; cell: number }[] }
  | { t: 'clear'; wave: number; cleared: Cleared[]; hits: { id: number; cell: number; hp: number }[]; broken: { id: number; cell: number }[]; made: { id: number; cell: number; sp: SpecialType; color: number }[] }
  | { t: 'fall'; moves: { id: number; from: number; to: number }[] }
  | { t: 'exit'; kittens: { id: number; cell: number }[] }
  | { t: 'spawn'; items: { piece: Piece; cell: number; above: number }[] }
  | { t: 'shuffle'; moves: { id: number; from: number; to: number }[] }
  | { t: 'moves'; delta: number };

const MAX_K = 2, P_K = 0.3;

export function rand(s: { rng: number }): number {
  const a = (s.rng + 0x6D2B79F5) | 0; s.rng = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function clone(s: State): State {
  const pieces: Record<number, Piece> = {};
  for (const k in s.pieces) pieces[k] = { ...s.pieces[k] };
  return { ...s, cells: s.cells.slice(), pieces, got: { ...s.got, col: s.got.col.slice() } };
}
const at = (s: State, i: number): Piece | undefined => (s.cells[i] ? s.pieces[s.cells[i]] : undefined);
const isBall = (p?: Piece): p is Extract<Piece, { kind: 'ball' }> => !!p && p.kind === 'ball';
function neighbors(s: State, i: number): number[] {
  const { W, H } = s, r = (i / W) | 0, c = i % W, o: number[] = [];
  if (r > 0) o.push(i - W); if (r < H - 1) o.push(i + W); if (c > 0) o.push(i - 1); if (c < W - 1) o.push(i + 1);
  return o;
}
type NewPiece = Piece extends infer P ? (P extends Piece ? Omit<P, 'id'> : never) : never;
function put(s: State, cell: number, p: NewPiece): Piece {
  const piece = { ...p, id: s.nextId++ } as Piece; s.pieces[piece.id] = piece; s.cells[cell] = piece.id; return piece;
}
function remove(s: State, cell: number) { const id = s.cells[cell]; if (id) { delete s.pieces[id]; s.cells[cell] = 0; } }

// 横か縦に3つ以上そろった玉を、同じ色のつながりごとにまとめる
export function findMatches(s: State): number[][] {
  const { W, H } = s, mark = new Uint8Array(W * H);
  const col = (i: number) => { const p = at(s, i); return isBall(p) ? p.color : -1; };
  for (let r = 0; r < H; r++) for (let c = 0; c + 2 < W; c++) { const i = r * W + c, v = col(i); if (v >= 0 && col(i + 1) === v && col(i + 2) === v) mark[i] = mark[i + 1] = mark[i + 2] = 1; }
  for (let r = 0; r + 2 < H; r++) for (let c = 0; c < W; c++) { const i = r * W + c, v = col(i); if (v >= 0 && col(i + W) === v && col(i + 2 * W) === v) mark[i] = mark[i + W] = mark[i + 2 * W] = 1; }
  const out: number[][] = [], seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!mark[i] || seen[i]) continue;
    const v = col(i), st = [i], grp: number[] = []; seen[i] = 1;
    while (st.length) { const j = st.pop()!; grp.push(j); for (const k of neighbors(s, j)) if (!seen[k] && mark[k] && col(k) === v) { seen[k] = 1; st.push(k); } }
    out.push(grp);
  }
  return out;
}
function gravity(s: State): { id: number; from: number; to: number }[] {
  const { W, H } = s, moves: { id: number; from: number; to: number }[] = [];
  for (let c = 0; c < W; c++) {
    let w = H - 1;
    for (let r = H - 1; r >= 0; r--) {
      const i = r * W + c, id = s.cells[i]; if (!id) continue;
      const to = w * W + c; if (to !== i) { s.cells[to] = id; s.cells[i] = 0; moves.push({ id, from: i, to }); } w--;
    }
  }
  return moves;
}
function exitKittens(s: State): { id: number; cell: number }[] {
  const out: { id: number; cell: number }[] = [];
  for (let c = 0; c < s.W; c++) { const i = (s.H - 1) * s.W + c, p = at(s, i); if (p && p.kind === 'kitten') { out.push({ id: p.id, cell: i }); remove(s, i); s.got.kittens++; s.onK--; } }
  return out;
}
function refill(s: State): { piece: Piece; cell: number; above: number }[] {
  const { W, H } = s, st = s.stage, out: { piece: Piece; cell: number; above: number }[] = [];
  for (let c = 0; c < W; c++) {
    let n = 0; while (n < H && !s.cells[n * W + c]) n++;
    for (let r = 0; r < n; r++) {
      const i = r * W + c; let piece: Piece;
      if (r === 0 && s.spawnK > 0 && s.onK < MAX_K && rand(s) < P_K) { piece = put(s, i, { kind: 'kitten', look: Math.floor(rand(s) * 6) }); s.spawnK--; s.onK++; }
      else if (st.pB && rand(s) < st.pB) piece = put(s, i, { kind: 'box', hp: st.boxHp, maxHp: st.boxHp });
      else piece = put(s, i, { kind: 'ball', color: Math.floor(rand(s) * st.nc) });
      out.push({ piece, cell: i, above: n });
    }
  }
  return out;
}
function hitBoxes(s: State, cells: number[], ev: { hits: { id: number; cell: number; hp: number }[]; broken: { id: number; cell: number }[] }) {
  const hit = new Set<number>();
  for (const i of cells) for (const k of neighbors(s, i)) { const p = at(s, k); if (p && p.kind === 'box') hit.add(k); }
  for (const k of hit) {
    const p = at(s, k) as Extract<Piece, { kind: 'box' }>; p.hp--;
    if (p.hp <= 0) { ev.broken.push({ id: p.id, cell: k }); remove(s, k); s.got.boxes++; } else ev.hits.push({ id: p.id, cell: k, hp: p.hp });
  }
}
export function blastArea(s: State, i: number, sp: SpecialType): number[] {
  const { W, H } = s, r = (i / W) | 0, c = i % W, o: number[] = [];
  if (sp === 'rollH') for (let x = 0; x < W; x++) o.push(r * W + x);
  else if (sp === 'rollV') for (let y = 0; y < H; y++) o.push(y * W + c);
  else for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && y < H && x >= 0 && x < W) o.push(y * W + x);
  return o;
}
function fire(s: State, i: number, sp: SpecialType, id: number, events: Ev[]) {
  remove(s, i);
  const area = blastArea(s, i, sp), ev: Extract<Ev, { t: 'fire' }> = { t: 'fire', id, cell: i, sp, area, cleared: [], hits: [], broken: [] };
  const chain: number[] = [];
  for (const k of area) {
    const p = at(s, k); if (!p) continue;
    if (p.kind === 'ball') { ev.cleared.push({ id: p.id, cell: k, color: p.color }); s.got.col[p.color]++; remove(s, k); }
    else if (p.kind === 'special') chain.push(k);
    else if (p.kind === 'box') { p.hp--; if (p.hp <= 0) { ev.broken.push({ id: p.id, cell: k }); remove(s, k); s.got.boxes++; } else ev.hits.push({ id: p.id, cell: k, hp: p.hp }); }
  }
  events.push(ev);
  for (const k of chain) { const p = at(s, k); if (p && p.kind === 'special') fire(s, k, p.sp, p.id, events); }
}
function resolve(s: State, events: Ev[], withRefill = true) {
  for (let wave = 1; wave < 60; wave++) {
    const f1 = gravity(s); if (f1.length) events.push({ t: 'fall', moves: f1 });
    const ex = exitKittens(s);
    if (ex.length) { events.push({ t: 'exit', kittens: ex }); const f2 = gravity(s); if (f2.length) events.push({ t: 'fall', moves: f2 }); }
    if (withRefill) { const sp = refill(s); if (sp.length) events.push({ t: 'spawn', items: sp }); }
    const gs = findMatches(s); if (!gs.length) return;
    const ev: Extract<Ev, { t: 'clear' }> = { t: 'clear', wave, cleared: [], hits: [], broken: [], made: [] };
    const all: number[] = [];
    for (const grp of gs) {
      let spot = -1, sp: SpecialType = 'punch'; const color = (at(s, grp[0]) as Extract<Piece, { kind: 'ball' }>).color;
      if (s.stage.specials && grp.length >= 4) {
        const rows = new Set(grp.map(i => (i / s.W) | 0)), cols = new Set(grp.map(i => i % s.W));
        sp = grp.length >= 5 ? 'punch' : rows.size === 1 ? 'rollH' : cols.size === 1 ? 'rollV' : 'punch';
        spot = grp[Math.floor(grp.length / 2)];
      }
      for (const i of grp) { const p = at(s, i) as Extract<Piece, { kind: 'ball' }>; ev.cleared.push({ id: p.id, cell: i, color: p.color }); s.got.col[p.color]++; remove(s, i); all.push(i); }
      if (spot >= 0) { const p = put(s, spot, { kind: 'special', sp, color }); ev.made.push({ id: p.id, cell: spot, sp, color }); }
    }
    hitBoxes(s, all, ev);
    events.push(ev);
  }
}

export function newGame(stage: StageDef, seed: number): State {
  const W = stage.W, H = stage.H;
  const s: State = { W, H, cells: new Array(W * H).fill(0), pieces: {}, nextId: 1, got: { boxes: 0, kittens: 0, col: [0, 0, 0, 0, 0, 0] }, movesLeft: stage.moves, spawnK: stage.goal.kittens || 0, onK: 0, rng: seed | 0, stage };
  const cols = [...Array(W).keys()];
  for (let k = 0; k < Math.min(stage.k0, s.spawnK); k++) { const c = cols.splice(Math.floor(rand(s) * cols.length), 1)[0]; put(s, stage.kRow * W + c, { kind: 'kitten', look: Math.floor(rand(s) * 6) }); s.spawnK--; s.onK++; }
  for (let i = 0; i < W * H; i++) {
    if (s.cells[i]) continue;
    if (stage.pB0 && rand(s) < stage.pB0 && i >= W * 2) { put(s, i, { kind: 'box', hp: stage.boxHp, maxHp: stage.boxHp }); continue; }
    put(s, i, { kind: 'ball', color: 0 });
    const p = s.pieces[s.cells[i]] as Extract<Piece, { kind: 'ball' }>;
    for (let t = 0; t < 20; t++) { p.color = Math.floor(rand(s) * stage.nc); if (!findMatches(s).length) break; }
  }
  if (!hasMove(s)) shuffle(s, []);
  return s;
}

// その玉を抜いたら、何かがそろうか（そろわない所は選べない）
export function preview(s: State, cell: number): { valid: boolean; match: number[]; shift: number[]; area: number[] } {
  const p = at(s, cell);
  if (!p) return { valid: false, match: [], shift: [], area: [] };
  if (p.kind === 'special') return { valid: true, match: [], shift: [], area: blastArea(s, cell, p.sp) };
  if (p.kind !== 'ball') return { valid: false, match: [], shift: [], area: [] };
  const t = clone(s); remove(t, cell); const mv = gravity(t);
  const gs = findMatches(t);
  // 画面の上での位置（抜く前のマス）で返す
  const back = new Map<number, number>(); for (const m of mv) back.set(m.to, m.from);
  const match = gs.flat().map(i => back.get(i) ?? i);
  // 子猫の真下の毛糸玉は、そろわなくても抜ける（子猫を下ろす手が、いつでもある）
  const above = cell >= s.W ? at(s, cell - s.W) : undefined;
  return { valid: gs.length > 0 || (!!above && above.kind === 'kitten'), match, shift: mv.map(m => m.from), area: [] };
}
export function hasMove(s: State): boolean {
  for (let i = 0; i < s.cells.length; i++) { const p = at(s, i); if (!p) continue; if (p.kind === 'special') return true; if (p.kind === 'ball' && preview(s, i).valid) return true; }
  return false;
}
function shuffle(s: State, events: Ev[]) {
  const cells: number[] = []; for (let i = 0; i < s.cells.length; i++) if (isBall(at(s, i))) cells.push(i);
  const ids = cells.map(i => s.cells[i]);
  for (let tries = 0; tries < 200; tries++) {
    const perm = ids.slice(); for (let k = perm.length - 1; k > 0; k--) { const j = Math.floor(rand(s) * (k + 1)); [perm[k], perm[j]] = [perm[j], perm[k]]; }
    cells.forEach((c, k) => { s.cells[c] = perm[k]; });
    if (tries > 100) for (const id of perm) (s.pieces[id] as Extract<Piece, { kind: 'ball' }>).color = Math.floor(rand(s) * s.stage.nc);
    if (!findMatches(s).length && hasMove(s)) break;
  }
  const where = new Map<number, number>(); cells.forEach((c, k) => where.set(ids[k], c));
  const moves: { id: number; from: number; to: number }[] = [];
  cells.forEach(c => { const id = s.cells[c]; const from = where.get(id)!; if (from !== c) moves.push({ id, from, to: c }); });
  events.push({ t: 'shuffle', moves });
}
function settleAfter(s: State, events: Ev[]) {
  resolve(s, events);
  if (!isWon(s) && !hasMove(s)) shuffle(s, events);
}

// ねこの手でちょいっ（1手）。そろわない所なら null
export function paw(s0: State, cell: number): { state: State; events: Ev[] } | null {
  if (s0.movesLeft <= 0 || isWon(s0)) return null;
  const pv = preview(s0, cell); if (!pv.valid) return null;
  const s = clone(s0), events: Ev[] = [], p = at(s, cell)!;
  if (p.kind === 'special') fire(s, cell, p.sp, p.id, events);
  else if (p.kind === 'ball') { events.push({ t: 'paw', id: p.id, cell, color: p.color }); s.got.col[p.color]++; remove(s, cell); }
  s.movesLeft--; events.push({ t: 'moves', delta: -1 });
  settleAfter(s, events);
  return { state: s, events };
}
// お助けアイテム（手は減らない）
export function useItem(s0: State, item: 'punch' | 'sweep' | 'matatabi', cell = -1): { state: State; events: Ev[] } | null {
  const s = clone(s0), events: Ev[] = [];
  if (item === 'matatabi') { s.movesLeft += 5; events.push({ t: 'moves', delta: 5 }); return { state: s, events }; }
  if (item === 'punch') {
    if (cell < 0) return null; const old = at(s, cell);
    if (old && (old.kind === 'kitten' || old.kind === 'box')) return null;
    if (old) remove(s, cell);
    const p = put(s, cell, { kind: 'special', sp: 'punch', color: 0 }); fire(s, cell, 'punch', p.id, events);
  }
  if (item === 'sweep') {
    const p = at(s, cell); if (!isBall(p)) return null;
    const ev: Extract<Ev, { t: 'clear' }> = { t: 'clear', wave: 1, cleared: [], hits: [], broken: [], made: [] }; const all: number[] = [];
    for (let i = 0; i < s.cells.length; i++) { const q = at(s, i); if (isBall(q) && q.color === p.color) { ev.cleared.push({ id: q.id, cell: i, color: q.color }); s.got.col[q.color]++; remove(s, i); all.push(i); } }
    hitBoxes(s, all, ev); events.push(ev);
  }
  settleAfter(s, events);
  return { state: s, events };
}

export function isWon(s: State): boolean {
  const g = s.stage.goal;
  return s.got.boxes >= (g.boxes || 0) && s.got.kittens >= (g.kittens || 0) && (!g.color || s.got.col[g.color[0]] >= g.color[1]);
}
export const isLost = (s: State) => !isWon(s) && s.movesLeft <= 0;
export function remaining(s: State) {
  const g = s.stage.goal;
  return {
    color: g.color ? Math.max(0, g.color[1] - s.got.col[g.color[0]]) : 0,
    boxes: g.boxes ? Math.max(0, g.boxes - s.got.boxes) : 0,
    kittens: g.kittens ? Math.max(0, g.kittens - s.got.kittens) : 0,
  };
}
// どれだけ進んだか（0〜1）。「あと少し」の判定に使う
export function progress(s: State): number {
  const g = s.stage.goal; let need = 0, have = 0;
  if (g.color) { need += g.color[1]; have += Math.min(s.got.col[g.color[0]], g.color[1]); }
  if (g.boxes) { need += g.boxes; have += Math.min(s.got.boxes, g.boxes); }
  if (g.kittens) {
    need += g.kittens; let k = Math.min(s.got.kittens, g.kittens);
    const rows: number[] = []; for (let i = 0; i < s.cells.length; i++) { const p = at(s, i); if (p && p.kind === 'kitten') rows.push(((i / s.W) | 0) / (s.H - 1)); }
    rows.sort((a, b) => b - a); for (const f of rows) if (k < g.kittens) k += f; have += Math.min(k, g.kittens);
  }
  return need ? have / need : 1;
}

// 手の良さ（ヒントとボット用）
function kittenRows(s: State) { let t = 0; for (let i = 0; i < s.cells.length; i++) { const p = at(s, i); if (p && p.kind === 'kitten') t += (i / s.W) | 0; } return t; }
export function value(s0: State, s1: State): number {
  const g = s0.stage.goal; let v = 0;
  if (g.boxes) v += Math.min(s1.got.boxes - s0.got.boxes, Math.max(0, g.boxes - s0.got.boxes));
  if (g.kittens) { const need = Math.max(0, g.kittens - s0.got.kittens), got = s1.got.kittens - s0.got.kittens; v += 3 * Math.min(got, need); if (need) v += 0.3 * (kittenRows(s1) - kittenRows(s0) + got * (s0.H - 1)); }
  if (g.color) { const c = g.color[0], got = s1.got.col[c] - s0.got.col[c]; v += 0.5 * Math.min(got, Math.max(0, g.color[1] - s0.got.col[c])); }
  let balls = 0; for (let k = 0; k < s1.got.col.length; k++) balls += s1.got.col[k] - s0.got.col[k];
  return v + 0.02 * balls;
}
// 上の段のたしかな所だけで考える（上から何が落ちてくるかは分からないので、足さないで試す）
function tryNoRefill(s0: State, cell: number): State | null {
  const p = at(s0, cell); if (!p) return null;
  const s = clone(s0), events: Ev[] = [];
  if (p.kind === 'special') fire(s, cell, p.sp, p.id, events);
  else if (p.kind === 'ball') { if (!preview(s0, cell).valid) return null; s.got.col[p.color]++; remove(s, cell); }
  else return null;
  resolve(s, events, false);
  return s;
}
export function candidates(s: State): number[] {
  const o: number[] = []; for (let i = 0; i < s.cells.length; i++) { const p = at(s, i); if (p && (p.kind === 'special' || (p.kind === 'ball' && preview(s, i).valid))) o.push(i); }
  return o;
}
export function bestMove(s: State, depth: 1 | 2 = 1, pick: () => number = Math.random): number | null {
  const cs = candidates(s); if (!cs.length) return null;
  let best = -Infinity, cand: number[] = [];
  for (const c of cs) {
    const s1 = tryNoRefill(s, c); if (!s1) continue;
    let v = value(s, s1);
    if (depth === 2) { let b2 = 0; for (const c2 of candidates(s1)) { const s2 = tryNoRefill(s1, c2); if (s2) b2 = Math.max(b2, value(s1, s2)); } v += 0.6 * b2; }
    if (v > best + 1e-9) { best = v; cand = [c]; } else if (Math.abs(v - best) <= 1e-9) cand.push(c);
  }
  return cand.length ? cand[Math.floor(pick() * cand.length)] : null;
}
