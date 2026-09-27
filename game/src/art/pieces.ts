// 毛糸玉・特別な玉・みかん箱・ねこの手の絵（SVG 文字列）
import { YARN } from './palette';

const MARKS: Record<string, string> = {
  heart: 'M0 6.5C-5-2.5-9.5-4.5-9.5-8.5c0-3 2.4-5 5-5 2 0 3.6 1.2 4.5 2.8.9-1.6 2.5-2.8 4.5-2.8 2.6 0 5 2 5 5 0 4-4.5 6-9.5 15z',
  star: 'M0-10.5l3 6.6 7.2.7-5.4 4.8 1.6 7.1L0 5 -6.4 8.7l1.6-7.1-5.4-4.8 7.2-.7z',
  drop: 'M0-11C3 -6 7.5-1.5 7.5 3 7.5 7.4 4.2 10.5 0 10.5s-7.5-3.1-7.5-7.5C-7.5-1.5-3-6 0-11z',
  leaf: 'M-8 8C-9-2-3-10 9-10 9 1 2 9-8 8zM-8 8l6-7',
  flower: 'M0-3.2a3.2 3.2 0 1 0 .01 0zM0-10.5a4 4 0 0 1 3.4 6.2 4 4 0 0 1 6 3.8 4 4 0 0 1-3.2 5.6 4 4 0 0 1-2.6 6.2 4 4 0 0 1-7.2 0 4 4 0 0 1-2.6-6.2 4 4 0 0 1-3.2-5.6 4 4 0 0 1 6-3.8A4 4 0 0 1 0-10.5z',
  dot: 'M0-7a7 7 0 1 0 .01 0z',
};
let n = 0;
function wraps(c: typeof YARN[number], id: string) {
  // 巻いた毛糸の筋：3つの向きの束。濃い筋と明るい筋を少しずらして、糸の丸みを出す
  const band = (rot: number, rys: number[], clip: string) => {
    const arcs = rys.map(ry => `M-46 0A46 ${ry} 0 0 0 46 0`).join('');
    return `<g clip-path="${clip}" transform="translate(50 50) rotate(${rot})">
      <path d="${arcs}" fill="none" stroke="${c.dark}" stroke-opacity=".42" stroke-width="3.6"/>
      <path d="${arcs}" fill="none" stroke="${c.light}" stroke-opacity=".55" stroke-width="1.5" transform="translate(0 -1.3)"/>
    </g>`;
  };
  return band(-32, [4, 10, 16, 22, 28, 34], `url(#cl${id})`) + band(58, [3, 9, 15, 21], `url(#half${id})`) + band(128, [6, 12, 18], `url(#q${id})`);
}
export function ballSVG(color: number, opts: { special?: 'rollH' | 'rollV' | 'punch'; glow?: boolean } = {}) {
  const c = YARN[color % YARN.length], id = `b${n++}`;
  const sp = opts.special;
  const special = sp === 'punch' ? `
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFE9A8" stroke-width="4" opacity=".9"/>
      <g transform="translate(50 53)" fill="#F6A0AE" stroke="#8C4452" stroke-width="1.6">
        <path d="M-12 7c0-7 5.4-11 12-11s12 4 12 11c0 5-5 6.6-12 6.6S-12 12-12 7z"/>
        <ellipse cx="-14" cy="-8" rx="4.6" ry="5.6" transform="rotate(-20 -14 -8)"/><ellipse cx="-5" cy="-15" rx="4.6" ry="5.8"/>
        <ellipse cx="5" cy="-15" rx="4.6" ry="5.8"/><ellipse cx="14" cy="-8" rx="4.6" ry="5.6" transform="rotate(20 14 -8)"/>
      </g>`
    : sp ? `
      <g transform="translate(50 50) rotate(${sp === 'rollH' ? 0 : 90})">
        <rect x="-44" y="-7.5" width="88" height="15" rx="7" fill="#FFFFFF" opacity=".92"/>
        <path d="M-40 0l9-7v14zM40 0l-9-7v14z" fill="${c.dark}"/>
        <path d="M-24 0h48" stroke="${c.base}" stroke-width="4" stroke-dasharray="5 4" stroke-linecap="round"/>
      </g>` : '';
  const markPath = MARKS[c.mark];
  const mark = sp ? '' : `<g transform="translate(50 52) scale(1.05)"><path d="${markPath}" fill="#FFFFFF" fill-opacity=".9" stroke="${c.dark}" stroke-width="1.4" stroke-opacity=".6" ${c.mark === 'leaf' ? 'stroke-linejoin="round"' : ''}/></g>`;
  const baseColor = sp === 'punch' ? { ...c, base: '#F7D98B', light: '#FFF4CF', dark: '#C99A3A' } : c;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g${id}" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${baseColor.light}"/><stop offset=".55" stop-color="${baseColor.base}"/><stop offset="1" stop-color="${baseColor.dark}"/></radialGradient>
    <radialGradient id="s${id}"><stop offset="0" stop-color="#3B2A1C" stop-opacity=".35"/><stop offset="1" stop-color="#3B2A1C" stop-opacity="0"/></radialGradient>
    <clipPath id="cl${id}"><circle cx="0" cy="0" r="41" transform="translate(50 50)"/></clipPath>
    <clipPath id="half${id}"><path d="M50 9a41 41 0 0 1 0 82z" /></clipPath>
    <clipPath id="q${id}"><path d="M50 50L91 50A41 41 0 0 1 50 91z"/></clipPath>
    <radialGradient id="r${id}" cx="50%" cy="50%" r="50%"><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
  </defs>
  <ellipse cx="52" cy="92" rx="33" ry="6.5" fill="url(#s${id})"/>
  <circle cx="50" cy="50" r="41" fill="url(#g${id})"/>
  ${sp === 'punch' ? '' : wraps(baseColor as typeof c, id)}
  <circle cx="50" cy="50" r="41" fill="url(#r${id})"/>
  <path d="M80 74c6 3 9 8 6 12-2.4 3-7 1.4-6.2-2" fill="none" stroke="${baseColor.base}" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M80 74c6 3 9 8 6 12" fill="none" stroke="${baseColor.light}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="35" cy="28" rx="11" ry="6.5" fill="#fff" opacity=".38" transform="rotate(-32 35 28)"/>
  ${mark}${special}
</svg>`;
}
export function boxSVG(hp: number, maxHp: number) {
  const id = `x${n++}`, tied = maxHp >= 2 && hp >= 2, cracked = maxHp >= 2 && hp === 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="f${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E2B274"/><stop offset="1" stop-color="#C08548"/></linearGradient>
    <linearGradient id="t${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F2CF96"/><stop offset="1" stop-color="#E0B478"/></linearGradient>
    <radialGradient id="s${id}"><stop offset="0" stop-color="#3B2A1C" stop-opacity=".35"/><stop offset="1" stop-color="#3B2A1C" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="51" cy="93" rx="42" ry="5.5" fill="url(#s${id})"/>
  <path d="M8 30 18 13h64l10 17z" fill="url(#t${id})" stroke="#9C6A36" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M50 13v17M30 13l-4 17M70 13l4 17" stroke="#B98547" stroke-width="1.2" opacity=".7"/>
  <rect x="8" y="30" width="84" height="61" rx="3.5" fill="url(#f${id})" stroke="#9C6A36" stroke-width="1.4"/>
  <rect x="8" y="30" width="84" height="7" fill="#fff" opacity=".12"/>
  <rect x="42" y="30" width="16" height="61" fill="#D8A868" opacity=".55"/>
  <g transform="translate(50 62)">
    <circle r="15.5" fill="#F39A2E" stroke="#C86F12" stroke-width="1.4"/>
    <circle cx="-5" cy="-5" r="5" fill="#FFC477" opacity=".7"/>
    <path d="M0-15c2-5 7-7 11-5-2 4-6 6-11 5z" fill="#4E9B45"/>
    <text y="30" text-anchor="middle" font-size="12" font-weight="700" fill="#8A4A12" font-family="'Zen Maru Gothic','BIZ UDPGothic',sans-serif">みかん</text>
  </g>
  ${tied ? `<g stroke="#D8453E" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M8 58h84M50 13v78"/><path d="M50 58c-6-6-12-5-12 0 0 4 7 3 12 0 5 3 12 4 12 0 0-5-6-6-12 0z" stroke-width="2.6"/></g>` : ''}
  ${cracked ? `<g stroke="#6B4424" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 30l6 12-5 9 7 11"/><path d="M78 91l-6-14 6-8-4-10"/></g><path d="M8 58h22M70 58h22" stroke="#D8453E" stroke-width="3" stroke-linecap="round" opacity=".8"/>` : ''}
</svg>`;
}
// ねこの手（肉球が見える向き）。下から伸びて、玉をちょいっとたたく
export function pawSVG() {
  const id = `p${n++}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 160">
  <defs>
    <linearGradient id="a${id}" x1="0" x2="1"><stop offset="0" stop-color="#C87838"/><stop offset=".45" stop-color="#F0AE68"/><stop offset="1" stop-color="#C87838"/></linearGradient>
    <linearGradient id="m${id}" x1="0" x2="0" y1="0" y2="1"><stop offset=".45" stop-color="#fff"/><stop offset=".92" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="k${id}"><rect width="80" height="160" fill="url(#m${id})"/></mask>
    <radialGradient id="h${id}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#FFF3E2"/><stop offset=".7" stop-color="#F7DDBD"/><stop offset="1" stop-color="#D9B48A"/></radialGradient>
    <filter id="f${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
  </defs>
  <g filter="url(#f${id})" mask="url(#k${id})">
    <path d="M18 160V64c0-6 4-10 22-10s22 4 22 10v96z" fill="url(#a${id})"/>
    <path d="M20 84c6 2 12 2 18 0M42 96c6 2 12 2 18 0M20 112c6 2 12 2 18 0M42 128c6 2 12 2 18 0M20 142c6 2 12 2 18 0" stroke="#A85A22" stroke-width="3" opacity=".55" stroke-linecap="round"/>
    <path d="M40 8C22 8 11 20 11 36c0 14 10 26 29 26s29-12 29-26C69 20 58 8 40 8z" fill="url(#h${id})"/>
  </g>
  <g fill="#F29CA8" stroke="#B3606C" stroke-width="1">
    <path d="M28 44c0-7 5.4-11 12-11s12 4 12 11c0 5-5 7-12 7s-12-2-12-7z"/>
    <ellipse cx="22" cy="28" rx="5" ry="6.2" transform="rotate(-24 22 28)"/><ellipse cx="33" cy="19.5" rx="5" ry="6.4" transform="rotate(-8 33 19.5)"/>
    <ellipse cx="47" cy="19.5" rx="5" ry="6.4" transform="rotate(8 47 19.5)"/><ellipse cx="58" cy="28" rx="5" ry="6.2" transform="rotate(24 58 28)"/>
  </g>
  <g fill="#fff" opacity=".55"><ellipse cx="37" cy="38" rx="4" ry="2"/><circle cx="21" cy="25" r="1.4"/><circle cx="32" cy="16" r="1.4"/><circle cx="46" cy="16" r="1.4"/><circle cx="57" cy="25" r="1.4"/></g>
</svg>`;
}
