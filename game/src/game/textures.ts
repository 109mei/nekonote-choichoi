import { Texture } from 'pixi.js';
import { ballSVG, boxSVG, pawSVG } from '../art/pieces';
import { catSVG, type Expr } from '../art/cat';
import type { Piece } from '../engine/rules';

const PX = 160; // 1マスぶんの絵の大きさ（画面の2〜3倍の細かさで作っておく）
const cache = new Map<string, Texture>();

export async function svgToCanvas(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.decoding = 'async';
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg load')); img.src = url; });
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return cv;
}
const pending = new Map<string, Promise<Texture>>();
function make(key: string, svg: () => string, w = PX, h = PX): Promise<Texture> {
  if (cache.has(key)) return Promise.resolve(cache.get(key)!);
  if (!pending.has(key)) pending.set(key, svgToCanvas(svg(), w, h).then(cv => { const t = Texture.from(cv); cache.set(key, t); return t; }));
  return pending.get(key)!;
}
export const EXPRS: Expr[] = ['normal', 'blink', 'surprise', 'happy'];
export async function loadTextures(colors: number, onProgress?: (k: number) => void) {
  const jobs: Promise<unknown>[] = [];
  for (let c = 0; c < Math.max(colors, 5); c++) {
    jobs.push(make(`ball${c}`, () => ballSVG(c)));
    jobs.push(make(`rollH${c}`, () => ballSVG(c, { special: 'rollH' })));
    jobs.push(make(`rollV${c}`, () => ballSVG(c, { special: 'rollV' })));
  }
  jobs.push(make('punch', () => ballSVG(0, { special: 'punch' })));
  jobs.push(make('box1_1', () => boxSVG(1, 1)), make('box2_2', () => boxSVG(2, 2)), make('box1_2', () => boxSVG(1, 2)));
  for (let k = 0; k < 6; k++) for (const e of EXPRS) jobs.push(make(`kit${k}_${e}`, () => catSVG(k, e, { fur: true })));
  jobs.push(make('paw', () => pawSVG(), 80 * 2, 160 * 2));
  let done = 0; jobs.forEach(j => j.then(() => onProgress?.(++done / jobs.length)));
  await Promise.all(jobs);
}
export const tex = (key: string) => cache.get(key) ?? Texture.WHITE;
export function pieceKey(p: Piece, expr: Expr = 'normal'): string {
  switch (p.kind) {
    case 'ball': return `ball${p.color}`;
    case 'special': return p.sp === 'punch' ? 'punch' : `${p.sp}${p.color}`;
    case 'box': return `box${p.hp}_${p.maxHp}`;
    case 'kitten': return `kit${p.look}_${expr}`;
  }
}
