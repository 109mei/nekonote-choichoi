// 画面の下にいる大きな子猫。まばたき・しっぽ・息づかい・目で追う・よろこぶ
import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { catSVG } from '../art/cat';

export type CatMood = 'idle' | 'cheer' | 'happy' | 'sad';
export interface CatHandle { look(x: number, y: number): void; lookAway(): void; react(m: CatMood): void; }

export default function MainCat({ coat = 0, size = 150, ref }: { coat?: number; size?: number; ref?: Ref<CatHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useMemo(() => catSVG(coat, 'normal', { animated: true }), [coat]);
  const moodT = useRef(0);

  useEffect(() => {
    const el = box.current!; let alive = true;
    const q = (s: string) => el.querySelectorAll<SVGGElement>(s);
    const setEyes = (k: 'open' | 'closed' | 'happy') => { q('.eyes-open').forEach(g => (g.style.display = k === 'open' ? '' : 'none')); q('.eyes-closed').forEach(g => (g.style.display = k === 'closed' ? '' : 'none')); q('.eyes-happy').forEach(g => (g.style.display = k === 'happy' ? '' : 'none')); };
    const blink = () => { if (!alive) return; if (Date.now() > moodT.current) { setEyes('closed'); setTimeout(() => { if (Date.now() > moodT.current) setEyes('open'); }, 150); } setTimeout(blink, 2200 + Math.random() * 3800); };
    const twitch = () => { if (!alive) return; const ear = q(Math.random() < 0.5 ? '.earL' : '.earR')[0]; ear?.classList.add('twitch'); setTimeout(() => ear?.classList.remove('twitch'), 360); setTimeout(twitch, 3500 + Math.random() * 6000); };
    const t1 = setTimeout(blink, 1800), t2 = setTimeout(twitch, 2600);
    (el as unknown as { _setEyes: typeof setEyes })._setEyes = setEyes;
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [svg]);

  useImperativeHandle(ref, () => ({
    look(x, y) {
      const el = box.current; if (!el) return; const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.4), d = Math.hypot(dx, dy) || 1;
      el.style.setProperty('--px', `${(dx / d) * 1.8}px`); el.style.setProperty('--py', `${(dy / d) * 1.6}px`);
      el.style.setProperty('--tilt', `${Math.max(-10, Math.min(10, dx / 30))}deg`);
    },
    lookAway() { const el = box.current; if (!el) return; el.style.setProperty('--px', '0px'); el.style.setProperty('--py', '0px'); el.style.setProperty('--tilt', '0deg'); },
    react(m) {
      const el = box.current; if (!el) return; const setEyes = (el as unknown as { _setEyes?: (k: 'open' | 'closed' | 'happy') => void })._setEyes;
      el.classList.remove('cheer', 'happy', 'sad'); void el.offsetWidth;
      if (m === 'idle') { setEyes?.('open'); return; }
      el.classList.add(m);
      if (m === 'happy') { moodT.current = Date.now() + 1400; setEyes?.('happy'); setTimeout(() => { setEyes?.('open'); el.classList.remove('happy'); }, 1400); }
      if (m === 'cheer') setTimeout(() => el.classList.remove('cheer'), 700);
      if (m === 'sad') { moodT.current = Date.now() + 2400; setTimeout(() => el.classList.remove('sad'), 2400); }
    },
  }));
  return <div ref={box} className="main-cat" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} aria-hidden="true" />;
}
