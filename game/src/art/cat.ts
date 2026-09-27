// かわいくて本物らしい子猫（正面のおすわり）。SVG の文字列を作る
// animated=true のときは、しっぽ・頭・耳・まぶた・ひとみ・前足を <g class> に分けて、動かせるようにする
import { COATS, type Coat } from './palette';

export type Expr = 'normal' | 'blink' | 'happy' | 'surprise' | 'sleepy';
let uid = 0;

function stripes(c: Coat, kind: 'head' | 'body' | 'tail' | 'leg') {
  if (c.pattern !== 'tabby') return '';
  const s = `fill="${c.dark}" opacity=".55"`;
  if (kind === 'head') return `
    <path ${s} d="M50 20.5c-1.2 0-1.7 1.2-1.6 3.4l.6 5.6c.2 1 1.8 1 2 0l.6-5.6c.1-2.2-.4-3.4-1.6-3.4z"/>
    <path ${s} d="M43.5 21.8c-1 .3-1.2 1.4-.8 3.3l1.6 4.2c.4.8 1.7.6 1.8-.3l-.2-4.4c-.2-2-1.2-3-2.4-2.8z"/>
    <path ${s} d="M56.5 21.8c1 .3 1.2 1.4.8 3.3l-1.6 4.2c-.4.8-1.7.6-1.8-.3l.2-4.4c.2-2 1.2-3 2.4-2.8z"/>
    <path ${s} d="M24.5 42.5c2.8-.8 5.6-.4 7.4.8-2.4.2-5 .6-7.6 1.6z"/><path ${s} d="M24.2 47.2c2.6-.2 5 .4 6.6 1.6-2.2-.1-4.5.1-6.9.8z"/>
    <path ${s} d="M75.5 42.5c-2.8-.8-5.6-.4-7.4.8 2.4.2 5 .6 7.6 1.6z"/><path ${s} d="M75.8 47.2c-2.6-.2-5 .4-6.6 1.6 2.2-.1 4.5.1 6.9.8z"/>`;
  if (kind === 'body') return `
    <path ${s} d="M33.5 66c3 .4 5.6 1.8 7 3.6-2.8-.6-5.4-.6-7.8-.2z"/><path ${s} d="M32 73c3.2.2 6 1.4 7.6 3.2-3-.4-5.8-.4-8.2.2z"/>
    <path ${s} d="M66.5 66c-3 .4-5.6 1.8-7 3.6 2.8-.6 5.4-.6 7.8-.2z"/><path ${s} d="M68 73c-3.2.2-6 1.4-7.6 3.2 3-.4 5.8-.4 8.2.2z"/>`;
  if (kind === 'leg') return `<path ${s} d="M38.6 80.5h7.2l-.2 1.6h-6.8z"/><path ${s} d="M54.4 80.5h7.2l-.2 1.6h-6.8z"/><path ${s} d="M38.4 85h7.4l-.2 1.4h-7z"/><path ${s} d="M54.2 85h7.4l-.2 1.4h-7z"/>`;
  return `<rect ${s} x="-1.3" y="-7" width="2.6" height="14" transform="translate(75.5 84.4) rotate(-12)"/><rect ${s} x="-1.3" y="-7" width="2.6" height="14" transform="translate(82.8 80) rotate(40)"/><rect ${s} x="-1.3" y="-7" width="2.6" height="14" transform="translate(86.4 72) rotate(78)"/><rect ${s} x="-1.3" y="-7" width="2.6" height="14" transform="translate(86.4 63.5) rotate(100)"/>`;
}
function patches(c: Coat, kind: 'head' | 'body') {
  if (c.pattern === 'calico') {
    if (kind === 'head') return `<path fill="#E3943F" d="M22.8 38c-.8-9 4.2-16.6 13.6-19.4l5.6 1.4c-2.6 5.4-4.8 12-12.2 17.8-2.6 1.6-5.4 1.6-7 .2z"/>
      <path fill="#35302E" d="M77.2 37.6c.6-8.4-3.8-15.6-12.4-18.8l-5.4 1.6c2.6 4.8 4.4 11 10.8 16.4 2.6 1.8 5.4 2.2 7 .8z"/>`;
    return `<path fill="#E3943F" d="M31 70c1-6 4.4-11 9-12.6-1 5-.6 11 1.6 17-3.6.6-7.8-.6-10.6-4.4z"/><path fill="#35302E" d="M69.2 72.4c-.4-5.6-3-10.8-7.4-13 .4 4.8-.2 10 -2.4 15 3.8.6 7.4-.2 9.8-2z"/>`;
  }
  if (c.pattern === 'tux') {
    if (kind === 'head') return `<path fill="#FFFFFF" d="M50 29c-3.4 5-8.8 12.6-12.6 20.2-2 4.4 1 9.8 5.8 11.4 2.2.8 4.6 1.2 6.8 1.2s4.6-.4 6.8-1.2c4.8-1.6 7.8-7 5.8-11.4C58.8 41.6 53.4 34 50 29z"/>`;
    return `<path fill="#FFFFFF" d="M41 58c2.6-1.4 5.6-2 9-2s6.4.6 9 2c1.6 7-1.4 15.2-9 19.4-7.6-4.2-10.6-12.4-9-19.4z"/>`;
  }
  return '';
}
function eyes(c: Coat, e: Expr, id: string, animated: boolean) {
  const line = c.pattern === 'solid' || c.pattern === 'tux' ? '#0E0B0B' : '#3A2519';
  const open = (cx: number, big = 0) => `
    <g>
      <ellipse cx="${cx}" cy="41.6" rx="${7.6 + big}" ry="${8.1 + big}" fill="#FFFDF7" opacity=".25"/>
      <ellipse cx="${cx}" cy="41.6" rx="${7.1 + big}" ry="${7.6 + big}" fill="url(#iris${id})" stroke="${line}" stroke-width="1.35"/>
      <path d="M${cx - 6.6 - big} ${39.6 - big}c${2.6} ${-4.6 - big} ${10.6 + 2 * big} ${-4.6 - big} ${13.2 + 2 * big} 0" fill="none" stroke="${line}" stroke-opacity=".35" stroke-width="2.4"/>
      <g class="pupil"><ellipse cx="${cx}" cy="42" rx="${e === 'surprise' ? 3.2 : 3.7}" ry="${e === 'surprise' ? 3.9 : 5.5}" fill="#120D0B"/>
      <circle cx="${cx - 2.5}" cy="38.6" r="2.35" fill="#fff"/><circle cx="${cx + 2.6}" cy="45" r="1.05" fill="#fff" opacity=".85"/></g>
    </g>`;
  const closed = (cx: number) => `<path d="M${cx - 6.4} 42.2q6.4 4.2 12.8 0" fill="none" stroke="${line}" stroke-width="1.9" stroke-linecap="round"/>`;
  const smile = (cx: number) => `<path d="M${cx - 6.2} 44q6.2-6.6 12.4 0" fill="none" stroke="${line}" stroke-width="2.1" stroke-linecap="round"/>`;
  const sleepy = (cx: number) => `<path d="M${cx - 6.4} 42.6q6.4 2.2 12.8 0" fill="none" stroke="${line}" stroke-width="1.9" stroke-linecap="round"/>`;
  if (animated) return `<g class="eyes-open">${open(38.6)}${open(61.4)}</g><g class="eyes-closed" style="display:none">${closed(38.6)}${closed(61.4)}</g><g class="eyes-happy" style="display:none">${smile(38.6)}${smile(61.4)}</g>`;
  if (e === 'blink') return closed(38.6) + closed(61.4);
  if (e === 'happy') return smile(38.6) + smile(61.4);
  if (e === 'sleepy') return sleepy(38.6) + sleepy(61.4);
  return open(38.6, e === 'surprise' ? 0.8 : 0) + open(61.4, e === 'surprise' ? 0.8 : 0);
}

const hash = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// だ円のふちに沿って、外向きに短い毛を描く
function furRing(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, len: number, color: string, op: number, w: number, seed: number) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * (i + 0.5)) / n + (hash(seed + i) - 0.5) * 4) * Math.PI) / 180;
    const nx = Math.cos(a), ny = Math.sin(a), x = cx + nx * rx, y = cy + ny * ry, l = len * (0.65 + 0.7 * hash(seed + i * 7));
    const bend = (hash(seed + i * 3) - 0.5) * 0.8;
    d += `M${(x - nx * l).toFixed(1)} ${(y - ny * l).toFixed(1)}Q${(x + ny * l * bend).toFixed(1)} ${(y - nx * l * bend).toFixed(1)} ${(x + nx * l * 0.35).toFixed(1)} ${(y + ny * l * 0.35).toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function furTexture(c: Coat, kind: 'head' | 'body') {
  const dark = c.pattern === 'solid' || c.pattern === 'tux' ? '#000' : c.dark;
  if (kind === 'head') return furRing(50, 41.5, 24.6, 20.8, 190, 350, 26, 2.4, c.light, 0.5, 0.75, 11) + furRing(50, 41.5, 24.5, 20.5, 195, 345, 22, 2.2, dark, 0.28, 0.6, 29)
    + furRing(50, 46, 26, 13, 160, 200, 5, 2.4, c.light, 0.7, 0.8, 41) + furRing(50, 46, 26, 13, -20, 20, 5, 2.4, c.light, 0.7, 0.8, 53)
    + furRing(50, 30, 9, 6, 200, 340, 7, 1.6, dark, 0.18, 0.5, 67);
  return furRing(50, 72, 18.5, 18, 150, 390, 30, 2.4, c.light, 0.6, 0.75, 71) + furRing(50, 72, 17.5, 17, 160, 380, 22, 2, dark, 0.22, 0.55, 97)
    + furRing(50, 66, 7.5, 6, 20, 160, 9, 2.2, c.pattern === 'solid' ? c.light : '#FFFFFF', 0.8, 0.8, 131);
}

export function catSVG(coatIndex: number, expr: Expr = 'normal', opts: { animated?: boolean; fur?: boolean; shadow?: boolean } = {}) {
  const c = COATS[coatIndex % COATS.length], id = `c${uid++}`, A = !!opts.animated;
  const g = (cls: string, inner: string, origin?: string) => (A ? `<g class="${cls}"${origin ? ` style="transform-origin:${origin}"` : ''}>${inner}</g>` : inner);
  const outline = c.pattern === 'solid' || c.pattern === 'tux' ? '#120E0E' : c.pattern === 'white' || c.pattern === 'calico' ? '#CDBFB0' : c.dark;
  const earInner = c.pattern === 'solid' ? '#6A4B4B' : '#F2AFA8';
  const mouthLine = c.pattern === 'solid' ? '#110D0D' : '#5A3A2E';
  const TAIL = 'M64 86c10 1 20-3 23-12 3-8 1-16-3-20-2.6-2.6-6.4-2.2-6.8 1.2-.3 2.4 1.6 3.4 2.4 5.6 1.8 5 .8 10.6-3.6 14-3.6 2.8-8.6 3.4-13 3.2z';
  const tail = `
    <clipPath id="tc${id}"><path d="${TAIL}"/></clipPath>
    <path d="${TAIL}" fill="url(#body${id})" stroke="${outline}" stroke-width=".8" stroke-opacity=".45"/>
    <g clip-path="url(#tc${id})">${stripes(c, 'tail')}</g>
    ${c.pattern === 'white' || c.pattern === 'calico' ? '' : `<path d="M80.6 55.4c1.4-1.6 3.4-1.6 4.6-.4" stroke="${c.light}" stroke-width=".8" fill="none" opacity=".8"/>`}`;
  const body = `
    <path d="M30.5 90.5c-3.6-10.4-3-22.6 3.4-31.6 4-5.6 9.6-8.2 16.1-8.2s12.1 2.6 16.1 8.2c6.4 9 7 21.2 3.4 31.6z" fill="url(#body${id})" stroke="${outline}" stroke-width=".8" stroke-opacity=".45"/>
    <clipPath id="bc${id}"><path d="M30.5 90.5c-3.6-10.4-3-22.6 3.4-31.6 4-5.6 9.6-8.2 16.1-8.2s12.1 2.6 16.1 8.2c6.4 9 7 21.2 3.4 31.6z"/></clipPath>
    <g clip-path="url(#bc${id})">${patches(c, 'body')}${stripes(c, 'body')}</g>
    ${furTexture(c, 'body')}
    <path d="M40.2 58.5c2.8-1.4 6.2-2.1 9.8-2.1s7 .7 9.8 2.1c1.2 6.4-.8 13-4.4 17.4l-2.2-2.2-1.6 3.2-1.6-3.2-1.6 3.2-1.6-3.2-2.2 2.2c-3.6-4.4-5.6-11-4.4-17.4z" fill="${c.belly}" opacity="${c.pattern === 'solid' ? 0 : 0.92}"/>`;
  const legL = `<path d="M37.6 74.5h9.2v14.6c0 2.6-2 4.2-4.6 4.2s-4.6-1.6-4.6-4.2z" fill="url(#leg${id})" stroke="${outline}" stroke-width=".7" stroke-opacity=".5"/>
    <path d="M40.4 91.2v1.6M43.6 91.4v1.6" stroke="${outline}" stroke-width=".7" stroke-opacity=".6"/>`;
  const legR = `<path d="M53.2 74.5h9.2v14.6c0 2.6-2 4.2-4.6 4.2s-4.6-1.6-4.6-4.2z" fill="url(#leg${id})" stroke="${outline}" stroke-width=".7" stroke-opacity=".5"/>
    <path d="M56 91.4v1.6M59.2 91.2v1.6" stroke="${outline}" stroke-width=".7" stroke-opacity=".6"/>`;
  const legs = legL + (A ? '' : legR) + stripes(c, 'leg');
  const earL = `<path d="M24.2 33.4 22 9.8c-.2-2 1.4-3 3-1.8l17.4 12.6z" fill="url(#head${id})" stroke="${outline}" stroke-width=".8" stroke-opacity=".5"/>
    <path d="M27.4 29.4 26.4 13.6l11.6 8.8z" fill="${earInner}"/><path d="M27.8 27.6l3.6-1.2M28 24.4l3.4-.2M28.4 21.4l2.6.6" stroke="#FFF7EE" stroke-width=".7" opacity=".9"/>`;
  const earR = `<path d="M75.8 33.4 78 9.8c.2-2-1.4-3-3-1.8L57.6 20.6z" fill="url(#head${id})" stroke="${outline}" stroke-width=".8" stroke-opacity=".5"/>
    <path d="M72.6 29.4 73.6 13.6 62 22.4z" fill="${earInner}"/><path d="M72.2 27.6l-3.6-1.2M72 24.4l-3.4-.2M71.6 21.4l-2.6.6" stroke="#FFF7EE" stroke-width=".7" opacity=".9"/>`;
  const headShape = `
    <path d="M50 17.6c-15.6 0-27.2 9.8-27.6 24-.1 3.8.6 7.4 2.2 10.2l-3 1.8 3.8.4-2 2.6 4-.8c4.8 5.4 13 8.8 22.6 8.8s17.8-3.4 22.6-8.8l4 .8-2-2.6 3.8-.4-3-1.8c1.6-2.8 2.3-6.4 2.2-10.2-.4-14.2-12-24-27.6-24z" fill="url(#head${id})" stroke="${outline}" stroke-width=".8" stroke-opacity=".5"/>
    ${patches(c, 'head')}${stripes(c, 'head')}${furTexture(c, 'head')}`;
  const face = `
    <ellipse cx="45.4" cy="54.6" rx="6" ry="4.6" fill="${c.pattern === 'solid' ? c.light : c.belly}" opacity="${c.pattern === 'solid' ? 0.5 : 0.95}"/>
    <ellipse cx="54.6" cy="54.6" rx="6" ry="4.6" fill="${c.pattern === 'solid' ? c.light : c.belly}" opacity="${c.pattern === 'solid' ? 0.5 : 0.95}"/>
    <ellipse cx="29.5" cy="51.5" rx="5" ry="3" fill="#FF8C8C" opacity="${c.pattern === 'solid' ? 0.08 : 0.22}"/><ellipse cx="70.5" cy="51.5" rx="5" ry="3" fill="#FF8C8C" opacity="${c.pattern === 'solid' ? 0.08 : 0.22}"/>
    <path d="M46.6 50.4c0-1 1.4-1.6 3.4-1.6s3.4.6 3.4 1.6c0 1.2-2 2.8-3.4 3.4-1.4-.6-3.4-2.2-3.4-3.4z" fill="${c.nose}"/>
    <ellipse cx="49" cy="49.8" rx="1.2" ry=".6" fill="#fff" opacity=".6"/>
    ${expr === 'happy' && !A ? `<path d="M46.4 55.4q3.6 5.6 7.2 0z" fill="#C4555A"/>` : ''}
    ${expr === 'surprise' && !A ? `<ellipse cx="50" cy="57" rx="1.8" ry="2.2" fill="#8E3E42"/>` : `<path d="M50 53.8v1.4c0 1.4-1.2 2.4-2.6 2.4s-2.2-.8-2.4-1.8M50 55.2c0 1.4 1.2 2.4 2.6 2.4s2.2-.8 2.4-1.8" fill="none" stroke="${mouthLine}" stroke-width="1.05" stroke-linecap="round"/>`}
    <g stroke="${c.whisker}" stroke-width=".7" stroke-linecap="round" opacity=".95">
      <path d="M40.6 53.4 20.6 50.2M40.4 55.4l-20.6.8M40.8 57.2 22 61.4"/><path d="M59.4 53.4l20-3.2M59.6 55.4l20.6.8M59.2 57.2 78 61.4"/>
    </g>`;
  const fur = opts.fur ? ` filter="url(#fur${id})"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="head${id}" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="${c.light}"/><stop offset=".62" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
    <radialGradient id="body${id}" cx="45%" cy="25%" r="85%"><stop offset="0" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
    <linearGradient id="leg${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.pattern === 'tux' ? '#FFFFFF' : c.base}"/><stop offset="1" stop-color="${c.pattern === 'tux' || c.pattern === 'calico' || c.pattern === 'white' ? '#F4EEE6' : c.light}"/></linearGradient>
    <radialGradient id="iris${id}" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="${c.eye[0]}"/><stop offset=".7" stop-color="${c.eye[1]}"/><stop offset="1" stop-color="#2D2A18"/></radialGradient>
    <radialGradient id="sh${id}"><stop offset="0" stop-color="#3B2A1C" stop-opacity=".32"/><stop offset="1" stop-color="#3B2A1C" stop-opacity="0"/></radialGradient>
    <filter id="fur${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.8"/></filter>
  </defs>
  ${opts.shadow === false ? '' : `<ellipse cx="50" cy="93.5" rx="26" ry="4.4" fill="url(#sh${id})"/>`}
  ${g('tail', tail, '66px 86px')}
  <g${fur}>${g('body', body + legs, '50px 92px')}</g>
  ${A ? g('pawR', `<g${fur}>${legR}</g>`, '58px 76px') : ''}
  ${g('head', `${g('earL', `<g${fur}>${earL}</g>`, '30px 26px')}${g('earR', `<g${fur}>${earR}</g>`, '70px 26px')}<g${fur}>${headShape}</g>${eyes(c, expr, id, A)}${face}`, '50px 60px')}
</svg>`;
}
export const catDataURL = (coat: number, expr: Expr = 'normal', fur = true) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(catSVG(coat, expr, { fur }));
