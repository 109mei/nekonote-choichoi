import { useEffect, useState } from 'react';
import { WORLD1 } from '../engine/stages';
import { ALBUM } from '../art/palette';
import { setSound, sfx } from '../game/sfx';
import { loadTextures } from '../game/textures';
import { loadSave, writeSave, type Save } from '../save';
import PlayScreen from './PlayScreen';
import MainCat from './MainCat';
import { Hanamaru, KittenIcon } from './icons';

type Screen = { k: 'title' } | { k: 'map' } | { k: 'play'; idx: number; nonce: number } | { k: 'album' };

export default function App() {
  const [save, _setSave] = useState<Save>(loadSave);
  const setSave = (f: (s: Save) => Save) => _setSave(s => { const n = f(s); writeSave(n); return n; });
  const [screen, setScreen] = useState<Screen>({ k: 'title' });
  useEffect(() => setSound(save.sound), [save.sound]);
  // 盤面の絵は、はじめの画面にいる間に作っておく（ステージを開くときに待たせない）
  useEffect(() => { const t = setTimeout(() => { void loadTextures(5).catch(() => {}); }, 300); return () => clearTimeout(t); }, []);
  const stages = WORLD1.stages;
  const unlocked = (i: number) => i === 0 || !!save.cleared[stages[i - 1].n];

  if (screen.k === 'play') {
    const idx = screen.idx;
    return <PlayScreen key={screen.nonce} stage={stages[idx]} save={save} setSave={setSave} hasNext={idx + 1 < stages.length} nextStage={stages[idx + 1]}
      onExit={() => setScreen({ k: 'map' })} onNext={() => setScreen({ k: 'play', idx: idx + 1, nonce: Date.now() })} />;
  }
  if (screen.k === 'album') {
    return (
      <div className="page album">
        <h1>こねこアルバム</h1>
        <p className="sub">ステージをクリアするたびに、子猫が1ぴき入ります（{save.album.length} / {stages.length}）</p>
        <div className="album-grid">
          {stages.map(st => {
            const a = ALBUM[(st.n - 1) % ALBUM.length], have = save.album.includes(st.n);
            return <div key={st.n} className={`album-card ${have ? '' : 'locked'}`}>
              {have ? <KittenIcon coat={a.coat} size={110} /> : <div className="q">？</div>}
              <p>{have ? a.name : `ステージ ${st.n}`}</p>
              {have && <small>{a.note}</small>}
            </div>;
          })}
        </div>
        <p className="note">（試作の絵です。本番では、保護猫団体や猫カフェから許可をいただいた本物の子猫の写真・動画が入ります）</p>
        <button className="btn primary" onClick={() => setScreen({ k: 'map' })}>地図にもどる</button>
      </div>
    );
  }
  if (screen.k === 'map') {
    const next = stages.findIndex((_, i) => unlocked(i) && !save.cleared[stages[i].n]);
    return (
      <div className="page map">
        <header className="map-head"><h1><small>1面</small>{WORLD1.name}</h1><button className="btn small" onClick={() => setScreen({ k: 'album' })}>こねこアルバム</button></header>
        <div className="map-path">
          {stages.map((st, i) => {
            const ok = unlocked(i), stars = save.cleared[st.n] || 0;
            return (
              <button key={st.n} className={`node ${ok ? '' : 'locked'} ${i === next ? 'next' : ''} ${i % 2 ? 'right' : 'left'}`} disabled={!ok}
                onClick={() => { sfx.tap(); setScreen({ k: 'play', idx: i, nonce: Date.now() }); }}>
                <span className="num">{st.n}</span>
                <span className="t">{st.title}{!ok && <small className="lock">🔒 まえのステージをクリアすると ひらきます</small>}</span>
                <span className="stars">{stars ? [1, 2, 3].map(k => <Hanamaru key={k} size={22} dim={k > stars} />) : null}</span>
                {i === next && <span className="here"><KittenIcon coat={0} size={52} /></span>}
              </button>
            );
          })}
          <div className="node soon">この先も、ステージが続きます（1面は40ステージの予定）</div>
        </div>
        <button className="btn ghost" onClick={() => setScreen({ k: 'title' })}>はじめの画面へ</button>
      </div>
    );
  }
  return (
    <div className="page title">
      <div className="title-sign"><small>毛糸屋 まるまる堂の</small><h1>ねこの手<br />ちょいちょい</h1></div>
      <div className="title-cat"><MainCat coat={0} size={220} /></div>
      <p className="title-lead">毛糸玉を1つ、ねこの手で「ちょいっ」。<br />同じ色が3つ並ぶと、くるくる巻き取れます。</p>
      <button className="btn primary big" onClick={() => { sfx.meow(); setScreen({ k: 'map' }); }}>はじめる</button>
      <button className="btn small ghost" onClick={() => setSave(s => ({ ...s, sound: !s.sound }))}>音：{save.sound ? 'あり' : 'なし'}</button>
    </div>
  );
}
