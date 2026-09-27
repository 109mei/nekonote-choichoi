import type { StageDef } from './rules';

export const COLOR_NAMES = ['赤', '黄色', '青', '緑', 'むらさき', 'もも色'];

// 1面「まるまる堂のみせさき」のはじめの12ステージ
// 手の数と目標の数は、本番のルールでボットを遊ばせて決めた（src/engine/tune2.test.ts）。
// ねらい：初心者のクリア率が少しずつ下がる（98%→45%）／クリアまでに手の数の6〜7割を使う（少ない手で終わらない）
export const WORLD1 = { name: 'まるまる堂のみせさき', stages: [] as StageDef[] };
const S = (d: Partial<StageDef> & Pick<StageDef, 'n' | 'title' | 'lead' | 'W' | 'H' | 'nc' | 'moves' | 'goal'>): StageDef =>
  ({ pB0: 0, pB: 0, boxHp: 1, k0: 0, kRow: 0, specials: false, ...d });

WORLD1.stages = [
  S({ n: 1, title: 'はじめての ちょいちょい', lead: '毛糸玉を1つ抜くと、上の玉が1段さがります。同じ色が3つ並ぶと、ねこが巻き取ります。', W: 6, H: 7, nc: 4, moves: 18, goal: { color: [0, 40] } }),
  S({ n: 2, title: '青い毛糸', lead: '先の段まで見て抜くと、続けて巻けることがあります（れんさ）。', W: 6, H: 7, nc: 4, moves: 24, goal: { color: [2, 56] } }),
  S({ n: 3, title: 'みかん箱', lead: 'みかん箱は、となりで毛糸が巻かれるとこわれます。', W: 6, H: 8, nc: 4, moves: 26, goal: { boxes: 14 }, pB0: 0.18, pB: 0.03 }),
  S({ n: 4, title: '毛糸が5色に', lead: '色がふえました。あわてず、ゆっくり探しましょう。', W: 7, H: 8, nc: 5, moves: 17, goal: { color: [1, 24] } }),
  S({ n: 5, title: '子猫をおろそう', lead: '子猫の下の毛糸がなくなると、子猫が下りてきます。子猫の真下の毛糸玉は、そろわなくても抜けます。いちばん下まで来たら「ただいま」。4ひきとも下ろしてあげましょう。', W: 7, H: 8, nc: 5, moves: 22, goal: { kittens: 4 }, k0: 2, kRow: 4 }),
  S({ n: 6, title: 'ころころ毛糸玉', lead: '4つ並べると「ころころ毛糸玉」ができます。タップすると1列ぜんぶ巻き取ります。', W: 7, H: 8, nc: 5, moves: 25, goal: { boxes: 16 }, pB0: 0.2, pB: 0.05, specials: true }),
  S({ n: 7, title: 'みどりの毛糸', lead: '5つ並べると「ねこパンチ」。まわりをまとめて巻き取ります。', W: 7, H: 9, nc: 5, moves: 16, goal: { color: [3, 28] }, specials: true }),
  S({ n: 8, title: '高いところの子猫', lead: '上のほうで、子猫が下りられずにいます。4ひきとも下ろしてあげましょう。', W: 7, H: 9, nc: 5, moves: 24, goal: { kittens: 4 }, k0: 2, kRow: 2, specials: true }),
  S({ n: 9, title: 'かたい箱', lead: 'ひもでしばった箱は、2回たたくとこわれます。', W: 7, H: 9, nc: 5, moves: 18, goal: { boxes: 10 }, pB0: 0.16, pB: 0.04, boxHp: 2, specials: true }),
  S({ n: 10, title: 'ちょっと むずかしい', lead: '箱と子猫の両方です。手の数に気をつけて。', W: 7, H: 9, nc: 5, moves: 21, goal: { boxes: 16, kittens: 1 }, pB0: 0.18, pB: 0.05, k0: 1, kRow: 2, specials: true }),
  S({ n: 11, title: 'ひと休み', lead: 'むらさきの毛糸を、のんびり巻きましょう。', W: 7, H: 9, nc: 5, moves: 15, goal: { color: [4, 24] }, specials: true }),
  S({ n: 12, title: '店先の大そうじ', lead: '1面の山場です。うまくいかなくても、運がよければ次はきっと。', W: 7, H: 9, nc: 5, moves: 25, goal: { boxes: 19, kittens: 2 }, pB0: 0.2, pB: 0.05, k0: 2, kRow: 1, specials: true }),
];
