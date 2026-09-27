// 盤面の絵と動き（PixiJS）。ルールの出来事（Ev）を順に動きで見せる
import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import type { Ev, Piece, State } from '../engine/rules';
import { YARN } from '../art/palette';
import { loadTextures, pieceKey, svgToCanvas, tex } from './textures';
import { ease, lerp, Tweener } from './tween';
import { sfx } from './sfx';

export interface BoardHooks {
  onTap(cell: number): void;
  onEvent(ev: Ev): void;             // 目標の数を減らす・ねこの反応などに使う
  collectPoint(kind: 'yarn' | 'box' | 'kitten'): { x: number; y: number } | null; // 画面上の位置（CSS px）
}
type PS = { id: number; piece: Piece; node: Container; spr: Sprite; blinkAt: number };
type Particle = { g: Container; vx: number; vy: number; vr: number; life: number; max: number; grav: number; fade: boolean };

const hex = (s: string) => parseInt(s.slice(1), 16);
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class BoardView {
  app = new Application();
  private host: HTMLElement; private hooks: BoardHooks;
  private root = new Container(); private back = new Container(); private pieces = new Container(); private fx = new Container(); private top = new Container();
  private mask = new Graphics(); private sel = new Graphics(); private glow = new Graphics();
  private sprites = new Map<number, PS>();
  private tw = new Tweener(); private parts: Particle[] = [];
  private W = 7; private H = 9; cell = 56; private ox = 0; private oy = 0;
  private state: State | null = null; private destroyed = false; private ready = false;
  private selCells: { cell: number; match: number[]; shift: number[]; area: number[] } | null = null;
  private hintCell = -1; private t = 0; private paw: Sprite | null = null; private hiddenTick = 0;

  constructor(host: HTMLElement, hooks: BoardHooks) { this.host = host; this.hooks = hooks; }

  async init(nc: number, onProgress?: (k: number) => void) {
    await this.app.init({ backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, resizeTo: this.host });
    if (this.destroyed) { this.app.destroy(true); return; }
    this.app.canvas.style.touchAction = 'none';
    this.host.appendChild(this.app.canvas);
    await loadTextures(nc, onProgress);
    await document.fonts?.load('900 40px "Zen Maru Gothic"').catch(() => {});
    if (this.destroyed) return;
    this.root.addChild(this.back, this.glow, this.pieces, this.sel, this.fx, this.top, this.mask);
    this.pieces.mask = this.mask;
    this.app.stage.addChild(this.root);
    this.root.eventMode = 'static';
    this.root.on('pointertap', e => {
      if (!this.state) return; const p = e.getLocalPosition(this.root);
      const c = Math.floor((p.x - this.ox) / this.cell), r = Math.floor((p.y - this.oy) / this.cell);
      if (c >= 0 && c < this.W && r >= 0 && r < this.H) this.hooks.onTap(r * this.W + c);
    });
    this.app.ticker.add(t => this.frame(t.deltaMS));
    // 画面が隠れている間は描画が止まるので、動きだけ先に進めて、遊びが止まらないようにする
    this.hiddenTick = window.setInterval(() => { if (document.hidden) this.frame(120); }, 60);
    this.app.renderer.on('resize', () => this.layout());
    this.paw = new Sprite(tex('paw')); this.paw.anchor.set(0.5, 0.06); this.paw.visible = false; this.top.addChild(this.paw);
    this.ready = true;
  }
  destroy() { this.destroyed = true; clearInterval(this.hiddenTick); this.tw.clear(); if (this.ready) this.app.destroy(true, { children: true }); }

  // ---- 並べ方 ----
  private layout() {
    if (!this.state) return;
    const w = this.app.screen.width, h = this.app.screen.height;
    this.cell = Math.floor(Math.min((w - 16) / this.W, (h - 16) / this.H));
    this.ox = Math.round((w - this.cell * this.W) / 2); this.oy = Math.round((h - this.cell * this.H) / 2);
    this.root.hitArea = new Rectangle(0, 0, w, h);
    void this.drawBack();
    this.mask.clear().roundRect(this.ox - 4, this.oy - 4, this.cell * this.W + 8, this.cell * this.H + 8, 14).fill(0xffffff);
    for (const ps of this.sprites.values()) { this.fit(ps); const p = this.pos(this.cellOf(ps.id)); ps.node.position.set(p.x, p.y); }
    this.drawSelection();
  }
  private async drawBack() {
    this.back.removeChildren();
    const { ox, oy, cell, W, H } = this, bw = cell * W, bh = cell * H;
    const frame = new Graphics();
    frame.roundRect(ox - 14, oy - 14, bw + 28, bh + 28, 22).fill(0x9A6536);
    frame.roundRect(ox - 10, oy - 10, bw + 20, bh + 20, 18).fill(0xC08850);
    frame.roundRect(ox - 10, oy - 10, bw + 20, 8, 6).fill({ color: 0xffffff, alpha: 0.18 });
    frame.roundRect(ox - 5, oy - 5, bw + 10, bh + 10, 12).fill(0x7A4B25);
    this.back.addChild(frame);
    // 奥の板：編み目の模様（ニット）
    const knit = await knitTexture();
    const bg = new TilingSprite({ texture: knit, width: bw + 6, height: bh + 6 });
    bg.position.set(ox - 3, oy - 3); bg.tileScale.set(cell / 96); this.back.addChild(bg);
    const cups = new Graphics();
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cups.roundRect(ox + c * cell + 3, oy + r * cell + 3, cell - 6, cell - 6, cell * 0.28).fill({ color: 0xffffff, alpha: 0.16 });
    cups.rect(ox - 3, oy - 3, bw + 6, 10).fill({ color: 0x000000, alpha: 0.12 });
    this.back.addChild(cups);
  }
  private pos(cell: number) { const r = Math.floor(cell / this.W), c = cell % this.W; return { x: this.ox + (c + 0.5) * this.cell, y: this.oy + (r + 0.5) * this.cell }; }
  private cellOf(id: number) { return this.state ? this.state.cells.indexOf(id) : -1; }
  private fit(ps: PS) { const k = this.cell * (ps.piece.kind === 'kitten' ? 1.12 : ps.piece.kind === 'box' ? 1.0 : 0.98) / ps.spr.texture.width; ps.spr.scale.set(k); }
  private makeSprite(piece: Piece, cell: number): PS {
    const node = new Container(), spr = new Sprite(tex(pieceKey(piece)));
    spr.anchor.set(0.5, piece.kind === 'kitten' ? 0.56 : 0.5);
    if (piece.kind === 'special') {
      const halo = new Graphics(); const r = this.cell * 0.5;
      halo.circle(0, 0, r * 1.12).fill({ color: 0xFFF3B8, alpha: 0.95 }).circle(0, 0, r * 1.12).stroke({ width: 4, color: 0xF2A21B, alpha: 1 });
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; halo.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2).lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5).stroke({ width: 4.5, color: 0xF2A21B, alpha: 1, cap: 'round' }); }
      halo.label = 'halo'; node.addChild(halo);
    }
    node.addChild(spr); this.pieces.addChild(node);
    const p = this.pos(cell); node.position.set(p.x, p.y);
    const ps: PS = { id: piece.id, piece, node, spr, blinkAt: performance.now() + 1500 + Math.random() * 4000 };
    this.fit(ps); this.sprites.set(piece.id, ps); return ps;
  }
  setState(s: State) {
    const first = !this.state || this.state.W !== s.W || this.state.H !== s.H;
    this.state = s; this.W = s.W; this.H = s.H;
    for (const ps of this.sprites.values()) ps.node.destroy({ children: true });
    this.sprites.clear();
    s.cells.forEach((id, i) => { if (id) this.makeSprite(s.pieces[id], i); });
    if (first) this.layout(); else this.layout();
  }
  // 画面（CSS px）の点を、盤面の座標に
  private toLocal(pt: { x: number; y: number } | null, fallback: { x: number; y: number }) {
    if (!pt) return fallback; const r = this.app.canvas.getBoundingClientRect(); return { x: pt.x - r.left, y: pt.y - r.top };
  }

  // ---- 選んだときの見せ方 ----
  private spriteAt(cell: number) { const id = this.state?.cells[cell]; return id ? this.sprites.get(id) : undefined; }
  select(cell: number, pv: { match: number[]; shift: number[]; area: number[] } | null) {
    if (this.selCells) this.spriteAt(this.selCells.cell)?.node.scale.set(1);
    this.selCells = pv && cell >= 0 ? { cell, ...pv } : null; this.drawSelection();
  }
  hint(cell: number) { if (this.hintCell >= 0) this.spriteAt(this.hintCell)?.node.scale.set(1); this.hintCell = cell; }
  cellScreen(cell: number) { const r = this.app.canvas.getBoundingClientRect(), p = this.pos(cell); return { x: r.left + p.x, y: r.top + p.y }; }
  // クリアのお祝い：のこりの手の数だけ、毛糸玉がぽんぽん跳ねる
  async celebrate(n: number) {
    const balls = [...this.sprites.values()].filter(ps => ps.piece.kind === 'ball');
    for (let i = 0; i < n && balls.length; i++) {
      const ps = balls.splice(Math.floor(Math.random() * balls.length), 1)[0]; const x = ps.node.x, y = ps.node.y;
      sfx.pop(); this.ring(x, y, 0xFFE27A, this.cell * 0.9); this.fluff(x, y, YARN[(ps.piece as { color: number }).color].base, 8); this.hearts(x, y);
      void this.tw.run(360, k => { ps.node.y = y - Math.sin(k * Math.PI) * this.cell * 0.7; ps.node.rotation = k * Math.PI * 2; }, ease.outQuad);
      await this.tw.wait(150);
    }
    await this.tw.wait(420);
  }
  private drawSelection() {
    this.sel.clear(); this.glow.clear();
    const s = this.selCells; if (!s || !this.state) return;
    const { cell } = this;
    for (const c of s.area) { const p = this.pos(c); this.glow.roundRect(p.x - cell / 2 + 2, p.y - cell / 2 + 2, cell - 4, cell - 4, cell * 0.25).fill({ color: 0xFFE27A, alpha: 0.45 }); }
    for (const c of s.match) {
      const p = this.pos(c);
      this.glow.circle(p.x, p.y, cell * 0.56).fill({ color: 0xFFF0A0, alpha: 0.9 });
      this.sel.circle(p.x, p.y, cell * 0.47).stroke({ width: 4, color: 0xFFFFFF, alpha: 0.95 });
      this.sel.circle(p.x, p.y, cell * 0.53).stroke({ width: 3, color: 0xF2A93B, alpha: 0.9 });
    }
    for (const c of s.shift) { const p = this.pos(c); this.sel.moveTo(p.x, p.y + cell * 0.3).lineTo(p.x - 6, p.y + cell * 0.18).moveTo(p.x, p.y + cell * 0.3).lineTo(p.x + 6, p.y + cell * 0.18).stroke({ width: 3, color: 0x7A4B25, alpha: 0.55, cap: 'round' }); }
    const p = this.pos(s.cell);
    this.sel.circle(p.x, p.y, cell * 0.52).stroke({ width: 5, color: 0xFF7A3D, alpha: 0.95 });
    this.sel.circle(p.x, p.y, cell * 0.6).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
  }
  nope(cell: number) {
    const id = this.state?.cells[cell]; const ps = id ? this.sprites.get(id) : undefined; sfx.nope(); if (!ps) return;
    const x0 = this.pos(cell).x; void this.tw.run(260, k => { ps.node.x = x0 + Math.sin(k * Math.PI * 6) * 5 * (1 - k); }, ease.linear);
  }

  // ---- 毎フレーム ----
  private frame(ms: number) {
    this.t += ms; this.tw.update(ms);
    const now = performance.now();
    for (const ps of this.sprites.values()) {
      if (ps.piece.kind === 'kitten') {
        if (now > ps.blinkAt) { ps.spr.texture = tex(pieceKey(ps.piece, 'blink')); if (now > ps.blinkAt + 140) { ps.spr.texture = tex(pieceKey(ps.piece)); ps.blinkAt = now + 2200 + Math.random() * 4200; } }
        ps.spr.scale.y = ps.spr.scale.x * (1 + Math.sin(this.t / 520 + ps.id) * 0.018);
      }
      if (ps.piece.kind === 'special') { ps.spr.rotation = Math.sin(this.t / 300 + ps.id) * 0.08; const h = ps.node.getChildByLabel('halo'); if (h) { h.rotation = this.t / 1400; h.alpha = 0.75 + Math.sin(this.t / 260) * 0.25; h.scale.set(1 + Math.sin(this.t / 260) * 0.06); } }
    }
    if (this.selCells) { const k = 1 + Math.sin(this.t / 160) * 0.06; this.glow.alpha = 0.75 + Math.sin(this.t / 200) * 0.25; this.sel.alpha = 0.8 + Math.sin(this.t / 200) * 0.2; const id = this.state?.cells[this.selCells.cell]; const ps = id ? this.sprites.get(id) : undefined; if (ps) ps.node.scale.set(k); }
    if (this.hintCell >= 0 && this.state) { const id = this.state.cells[this.hintCell]; const ps = id ? this.sprites.get(id) : undefined; if (ps && !this.selCells) ps.node.scale.set(1 + Math.max(0, Math.sin(this.t / 260)) * 0.1); }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life += ms; const dt = ms / 1000;
      p.vy += p.grav * dt; p.g.x += p.vx * dt; p.g.y += p.vy * dt; p.g.rotation += p.vr * dt;
      if (p.fade) p.g.alpha = Math.max(0, 1 - p.life / p.max);
      if (p.life >= p.max) { p.g.destroy({ children: true }); this.parts.splice(i, 1); }
    }
  }
  private resetScale(id: number) { const ps = this.sprites.get(id); if (ps) ps.node.scale.set(1); }

  // ---- 出来事を順に動かす ----
  async play(events: Ev[], after: State) {
    this.selCells = null; this.drawSelection();
    if (this.hintCell >= 0) { const id = this.state?.cells[this.hintCell]; if (id) this.resetScale(id); this.hintCell = -1; }
    let lastWave = 0;
    for (const ev of events) {
      this.hooks.onEvent(ev);
      switch (ev.t) {
        case 'paw': await this.animPaw(ev); break;
        case 'fire': await this.animFire(ev); break;
        case 'clear': lastWave = ev.wave; await this.animClear(ev); break;
        case 'fall': await this.animFall(ev.moves); break;
        case 'spawn': await this.animSpawn(ev.items); break;
        case 'exit': await this.animExit(ev.kittens); break;
        case 'shuffle': await this.animShuffle(ev.moves); break;
        case 'moves': break;
      }
    }
    void lastWave;
    this.state = after; this.cellNow.clear();
    // 念のため、絵とルールの位置をそろえる
    for (const [id, ps] of this.sprites) { const c = after.cells.indexOf(id); if (c < 0) { ps.node.destroy({ children: true }); this.sprites.delete(id); } else { const p = this.pos(c); ps.node.position.set(p.x, p.y); ps.node.scale.set(1); ps.node.alpha = 1; ps.piece = after.pieces[id]; ps.spr.texture = tex(pieceKey(ps.piece)); this.fit(ps); } }
    after.cells.forEach((id, i) => { if (id && !this.sprites.has(id)) this.makeSprite(after.pieces[id], i); });
  }
  private cellNow = new Map<number, number>(); // 動きの途中の位置（id → マス）
  private where(id: number) { return this.cellNow.get(id) ?? this.cellOf(id); }

  private async animPaw(ev: Extract<Ev, { t: 'paw' }>) {
    const ps = this.sprites.get(ev.id); if (!ps || !this.paw) return;
    const p = this.pos(ev.cell), paw = this.paw, sc = (this.cell * 0.95) / paw.texture.width;
    paw.scale.set(sc); paw.visible = true; paw.alpha = 0;
    const y0 = p.y + this.cell * 1.15, x0 = p.x + this.cell * 0.45;
    paw.position.set(x0, y0); paw.rotation = -0.35;
    await this.tw.run(reduceMotion ? 60 : 210, k => { paw.x = lerp(x0, p.x + this.cell * 0.1, k); paw.y = lerp(y0, p.y + this.cell * 0.22, k); paw.rotation = lerp(-0.35, -0.08, k); paw.alpha = Math.min(1, k * 2.2); }, ease.outCubic);
    sfx.pop();
    // ちょいっ：玉がつぶれて、はじかれる
    await this.tw.run(90, k => { ps.node.scale.set(1 + 0.18 * Math.sin(k * Math.PI), 1 - 0.15 * Math.sin(k * Math.PI)); }, ease.linear);
    const dest = this.toLocal(this.hooks.collectPoint('yarn'), { x: this.app.screen.width - 30, y: this.app.screen.height - 10 });
    const sx = ps.node.x, sy = ps.node.y;
    void this.tw.run(420, k => { ps.node.x = lerp(sx, dest.x, k); ps.node.y = lerp(sy, dest.y, k) - Math.sin(k * Math.PI) * this.cell * 1.6; ps.node.rotation = k * 7; ps.node.scale.set(1 - 0.6 * k); ps.node.alpha = 1 - k * 0.3; }, ease.inOutSine)
      .then(() => { ps.node.destroy({ children: true }); this.sprites.delete(ev.id); });
    this.fluff(sx, sy, YARN[ev.color].base, 6);
    await this.tw.run(reduceMotion ? 60 : 190, k => { paw.x = lerp(p.x + this.cell * 0.1, x0, k); paw.y = lerp(p.y + this.cell * 0.22, y0, k); paw.alpha = 1 - k; }, ease.inQuad);
    paw.visible = false;
  }
  private async animFire(ev: Extract<Ev, { t: 'fire' }>) {
    const ps = this.sprites.get(ev.id); const p = this.pos(ev.cell);
    sfx[ev.sp === 'punch' ? 'punch' : 'special']();
    const color = ps && ps.piece.kind === 'special' ? ps.piece.color : 0;
    if (ps) { await this.tw.run(180, k => ps.node.scale.set(1 + 0.4 * k), ease.outBack); ps.node.destroy({ children: true }); this.sprites.delete(ev.id); }
    if (ev.sp === 'punch') {
      const stamp = new Sprite(tex('paw')); stamp.anchor.set(0.5, 0.2); stamp.scale.set((this.cell * 2.6) / stamp.texture.width); stamp.position.set(p.x, p.y); stamp.alpha = 0; this.top.addChild(stamp);
      await this.tw.run(160, k => { stamp.alpha = k; stamp.scale.set(((this.cell * 2.6) / stamp.texture.width) * (1.5 - 0.5 * k)); }, ease.inQuad);
      this.ring(p.x, p.y, 0xFFE27A, this.cell * 1.8); this.shake(6);
      void this.tw.run(320, k => { stamp.alpha = 1 - k; }, ease.linear).then(() => stamp.destroy());
      await this.clearBalls(ev.cleared, 0); await this.hitBoxes(ev.hits, ev.broken);
    } else {
      // ころころ毛糸玉：左右（または上下）に転がりながら巻き取る
      const horiz = ev.sp === 'rollH'; const cells = ev.area.slice().sort((a, b) => Math.abs(a - ev.cell) - Math.abs(b - ev.cell));
      const roller = (dir: number) => { const s = new Sprite(tex(`ball${color}`)); s.anchor.set(0.5); s.scale.set((this.cell * 0.9) / s.texture.width); s.position.set(p.x, p.y); this.top.addChild(s); const len = (horiz ? this.W : this.H) * this.cell; return this.tw.run(420, k => { if (horiz) s.x = p.x + dir * k * len; else s.y = p.y + dir * k * len; s.rotation += dir * 0.3; }, ease.linear).then(() => s.destroy()); };
      void roller(-1); void roller(1);
      const byDist = new Map<number, typeof ev.cleared>();
      for (const c of ev.cleared) { const d = horiz ? Math.abs((c.cell % this.W) - (ev.cell % this.W)) : Math.abs(Math.floor(c.cell / this.W) - Math.floor(ev.cell / this.W)); byDist.set(d, [...(byDist.get(d) || []), c]); }
      void cells;
      const jobs: Promise<void>[] = [];
      for (const [d, list] of byDist) jobs.push(this.clearBalls(list, d * 55));
      await Promise.all(jobs); await this.hitBoxes(ev.hits, ev.broken);
    }
  }
  private async clearBalls(list: { id: number; cell: number; color: number }[], delay: number) {
    if (delay) await this.tw.wait(delay);
    const dest = this.toLocal(this.hooks.collectPoint('yarn'), { x: this.app.screen.width - 30, y: this.app.screen.height - 10 });
    const jobs = list.map((c, i) => {
      const ps = this.sprites.get(c.id); if (!ps) return Promise.resolve();
      const x = ps.node.x, y = ps.node.y, col = hex(YARN[c.color].base);
      // 糸がほどけて、かごへ飛んでいく
      const line = new Graphics(); this.fx.addChild(line);
      const mx = lerp(x, dest.x, 0.5) + (Math.random() - 0.5) * this.cell * 2, my = Math.min(y, dest.y) - this.cell * (1 + Math.random());
      const flight = this.tw.run(520, k => {
        line.clear(); const k0 = Math.max(0, k - 0.35);
        const bz = (t: number) => ({ x: (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * dest.x, y: (1 - t) * (1 - t) * y + 2 * (1 - t) * t * my + t * t * dest.y });
        const a = bz(k0), b = bz(k); line.moveTo(a.x, a.y);
        for (let s = 1; s <= 8; s++) { const q = bz(lerp(k0, k, s / 8)); line.lineTo(q.x + Math.sin(s * 1.7 + k * 9) * 2, q.y); }
        line.stroke({ width: Math.max(2, this.cell * 0.1), color: col, cap: 'round', join: 'round' }); void b;
      }, ease.inOutSine, 80 + i * 18).then(() => line.destroy());
      const spin = this.tw.run(300, k => { ps.node.rotation = k * 5; ps.node.scale.set(1 + 0.15 * Math.sin(k * Math.PI) - 0.9 * k * k); }, ease.inQuad, i * 18)
        .then(() => { this.fluff(x, y, YARN[c.color].base, 4); ps.node.destroy({ children: true }); this.sprites.delete(c.id); });
      return Promise.all([spin, flight]).then(() => {});
    });
    await Promise.race([Promise.all(jobs), this.tw.wait(360)]);
  }
  private async hitBoxes(hits: { id: number; cell: number; hp: number }[], broken: { id: number; cell: number }[]) {
    for (const h of hits) { const ps = this.sprites.get(h.id); if (!ps) continue; sfx.hit(); ps.piece = { ...(ps.piece as Extract<Piece, { kind: 'box' }>), hp: h.hp }; ps.spr.texture = tex(pieceKey(ps.piece)); const x0 = ps.node.x; void this.tw.run(240, k => { ps.node.x = x0 + Math.sin(k * Math.PI * 5) * 4 * (1 - k); }, ease.linear); }
    if (broken.length) sfx.box();
    await Promise.all(broken.map(b => {
      const ps = this.sprites.get(b.id); if (!ps) return Promise.resolve();
      const x = ps.node.x, y = ps.node.y; this.sprites.delete(b.id);
      return this.tw.run(140, k => ps.node.scale.set(1 + 0.2 * k, 1 - 0.25 * k), ease.outQuad).then(() => { ps.node.destroy({ children: true }); this.burstBox(x, y); });
    }));
  }
  private async animClear(ev: Extract<Ev, { t: 'clear' }>) {
    sfx.wind(ev.wave);
    if (ev.wave >= 2) this.popText(`${ev.wave}れんさ！`, ev.wave);
    await Promise.all([this.clearBalls(ev.cleared, 0), this.hitBoxes(ev.hits, ev.broken)]);
    for (const m of ev.made) {
      const piece: Piece = { id: m.id, kind: 'special', sp: m.sp, color: m.color };
      const ps = this.makeSprite(piece, m.cell); ps.node.scale.set(0); this.cellNow.set(m.id, m.cell);
      this.ring(ps.node.x, ps.node.y, 0xFFE27A, this.cell); sfx.special();
      void this.tw.run(360, k => ps.node.scale.set(k), ease.outBack);
    }
  }
  private async animFall(moves: { id: number; from: number; to: number }[]) {
    let maxT = 0; const jobs: Promise<void>[] = [];
    for (const m of moves) {
      const ps = this.sprites.get(m.id); if (!ps) continue;
      const a = this.pos(m.from), b = this.pos(m.to), rows = (m.to - m.from) / this.W, d = (reduceMotion ? 80 : 120) + 70 * Math.sqrt(rows);
      maxT = Math.max(maxT, d); this.cellNow.set(m.id, m.to);
      if (ps.piece.kind === 'kitten') ps.spr.texture = tex(pieceKey(ps.piece, 'surprise'));
      const y0 = ps.node.y > a.y + 1 ? ps.node.y : a.y;
      jobs.push(this.tw.run(d, k => { ps.node.y = lerp(y0, b.y, k); ps.node.x = b.x; }, ease.inQuad).then(() => this.land(ps)));
    }
    if (moves.length) await Promise.race([Promise.all(jobs), this.tw.wait(maxT + 60)]);
  }
  private land(ps: PS) {
    if (ps.piece.kind === 'kitten') { ps.spr.texture = tex(pieceKey(ps.piece)); sfx.land(); }
    void this.tw.run(160, k => { const s = Math.sin(k * Math.PI) * 0.1; ps.node.scale.set(1 + s, 1 - s); }, ease.linear);
  }
  private async animSpawn(items: { piece: Piece; cell: number; above: number }[]) {
    const moves: { id: number; from: number; to: number }[] = [];
    for (const it of items) {
      const ps = this.makeSprite(it.piece, it.cell); const b = this.pos(it.cell);
      ps.node.y = b.y - it.above * this.cell - this.cell * 0.2; this.cellNow.set(it.piece.id, it.cell);
      moves.push({ id: it.piece.id, from: it.cell - it.above * this.W, to: it.cell });
    }
    // 上から落ちてくる
    let maxT = 0; const jobs: Promise<void>[] = [];
    for (const m of moves) {
      const ps = this.sprites.get(m.id)!, b = this.pos(m.to), y0 = ps.node.y, rows = (b.y - y0) / this.cell, d = (reduceMotion ? 80 : 120) + 70 * Math.sqrt(Math.max(0.5, rows));
      maxT = Math.max(maxT, d);
      jobs.push(this.tw.run(d, k => { ps.node.y = lerp(y0, b.y, k); }, ease.inQuad).then(() => this.land(ps)));
    }
    await Promise.race([Promise.all(jobs), this.tw.wait(maxT + 60)]);
  }
  private async animExit(kittens: { id: number; cell: number }[]) {
    sfx.kitten();
    const dest = this.toLocal(this.hooks.collectPoint('kitten'), { x: this.app.screen.width / 2, y: 0 });
    await Promise.all(kittens.map(k => {
      const ps = this.sprites.get(k.id); if (!ps) return Promise.resolve();
      ps.spr.texture = tex(pieceKey(ps.piece, 'happy')); this.sprites.delete(k.id); this.top.addChild(ps.node);
      const x = ps.node.x, y = ps.node.y;
      this.hearts(x, y);
      this.popText('ただいま！', 1, x, y - this.cell);
      return this.tw.run(260, t => { ps.node.y = y - Math.sin(t * Math.PI) * this.cell * 0.6; }, ease.linear)
        .then(() => this.tw.run(620, t => { ps.node.x = lerp(x, dest.x, t); ps.node.y = lerp(y, dest.y, t) - Math.sin(t * Math.PI) * this.cell * 1.5; ps.node.scale.set(1 - 0.4 * t); ps.node.alpha = 1 - t * 0.5; }, ease.inOutSine))
        .then(() => ps.node.destroy({ children: true }));
    }));
  }
  private async animShuffle(moves: { id: number; from: number; to: number }[]) {
    this.popText('まぜまぜ', 1);
    const cx = this.ox + (this.W * this.cell) / 2, cy = this.oy + (this.H * this.cell) / 2;
    await Promise.all(moves.map(m => { const ps = this.sprites.get(m.id); if (!ps) return Promise.resolve(); const a = this.pos(m.from), b = this.pos(m.to); this.cellNow.set(m.id, m.to); return this.tw.run(700, k => { const t = k < 0.5 ? k * 2 : (1 - k) * 2; const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k); ps.node.x = lerp(x, cx, t * 0.6); ps.node.y = lerp(y, cy, t * 0.6); ps.node.rotation = k * 6; }, ease.inOutSine).then(() => { ps.node.rotation = 0; }); }));
  }

  // ---- 飾り ----
  private popText(s: string, level: number, x?: number, y?: number) {
    const t = new Text({ text: s, style: { fontFamily: '"Zen Maru Gothic", "BIZ UDPGothic", sans-serif', fontSize: Math.round(this.cell * (0.62 + Math.min(level, 6) * 0.06)), fontWeight: '900', fill: level >= 4 ? '#FFE56B' : '#FFFFFF', stroke: { color: level >= 3 ? '#D9482B' : '#E07B2E', width: Math.round(this.cell * 0.14), join: 'round' }, align: 'center' } });
    t.anchor.set(0.5); t.position.set(x ?? this.ox + (this.W * this.cell) / 2, y ?? this.oy + this.H * this.cell * 0.42); t.scale.set(0.3); this.top.addChild(t);
    void this.tw.run(260, k => t.scale.set(0.3 + 0.8 * k), ease.outBack).then(() => this.tw.run(520, k => { t.alpha = 1 - k; t.y -= 0.5; }, ease.inQuad, 380)).then(() => t.destroy());
  }
  private ring(x: number, y: number, color: number, r: number) {
    const g = new Graphics(); g.position.set(x, y); this.fx.addChild(g);
    void this.tw.run(420, k => { g.clear().circle(0, 0, r * (0.3 + k)).stroke({ width: 6 * (1 - k) + 1, color, alpha: 1 - k }); }, ease.outQuad).then(() => g.destroy());
  }
  private shake(px: number) { if (reduceMotion) return; void this.tw.run(260, k => { this.root.x = Math.sin(k * 40) * px * (1 - k); this.root.y = Math.cos(k * 33) * px * 0.6 * (1 - k); }, ease.linear).then(() => { this.root.position.set(0, 0); }); }
  private add(g: Container, x: number, y: number, vx: number, vy: number, max: number, grav = 900, vr = 0, fade = true) { g.position.set(x, y); this.fx.addChild(g); this.parts.push({ g, vx, vy, vr, life: 0, max, grav, fade }); }
  private fluff(x: number, y: number, color: string, n: number) {
    const col = hex(color);
    for (let i = 0; i < n; i++) { const g = new Graphics(); const r = this.cell * 0.12; g.moveTo(-r, 0).bezierCurveTo(-r / 2, -r, r / 2, r, r, 0).stroke({ width: 2.2, color: col, cap: 'round' }); const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120; this.add(g, x, y, Math.cos(a) * v, Math.sin(a) * v - 60, 520, 300, (Math.random() - 0.5) * 8); }
  }
  private burstBox(x: number, y: number) {
    const c = this.cell;
    for (let i = 0; i < 6; i++) { const g = new Graphics(); g.roundRect(-c * 0.22, -c * 0.07, c * 0.44, c * 0.14, 3).fill(i % 2 ? 0xC99058 : 0xE2B274).stroke({ width: 1.5, color: 0x9C6A36 }); this.add(g, x, y, (Math.random() - 0.5) * 420, -150 - Math.random() * 260, 800, 1300, (Math.random() - 0.5) * 12); }
    for (let i = 0; i < 3; i++) { const g = new Graphics(); g.circle(0, 0, c * 0.14).fill(0xF39A2E).stroke({ width: 1.5, color: 0xC86F12 }); g.circle(-c * 0.04, -c * 0.04, c * 0.05).fill({ color: 0xFFC477, alpha: 0.8 }); g.ellipse(c * 0.05, -c * 0.14, c * 0.06, c * 0.03).fill(0x4E9B45); this.add(g, x, y, (Math.random() - 0.5) * 300, -220 - Math.random() * 200, 1000, 1100, (Math.random() - 0.5) * 6); }
    this.ring(x, y, 0xFFD08A, c * 0.8);
  }
  private hearts(x: number, y: number) {
    for (let i = 0; i < 5; i++) { const g = new Graphics(); const s = this.cell * 0.012; g.moveTo(0, 6 * s * 2).bezierCurveTo(-10 * s * 2, 0, -8 * s * 2, -9 * s * 2, 0, -4 * s * 2).bezierCurveTo(8 * s * 2, -9 * s * 2, 10 * s * 2, 0, 0, 6 * s * 2).fill(0xFF7A9A); this.add(g, x + (Math.random() - 0.5) * this.cell, y, (Math.random() - 0.5) * 60, -140 - Math.random() * 80, 1100, -40, 0); }
  }
}

let knitTex: Texture | null = null;
async function knitTexture() {
  if (knitTex) return knitTex;
  const v = (x: number, y: number) => `<path d="M${x} ${y}c2 9 6 14 12 16M${x + 24} ${y}c-2 9-6 14-12 16" fill="none" stroke="#E9D6BC" stroke-width="7" stroke-linecap="round"/><path d="M${x} ${y}c2 9 6 14 12 16M${x + 24} ${y}c-2 9-6 14-12 16" fill="none" stroke="#FFF6EA" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;
  let body = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) body += v(c * 24, r * 24 - 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#DCC3A2"/>${body}</svg>`;
  knitTex = Texture.from(await svgToCanvas(svg, 192, 192));
  return knitTex;
}
