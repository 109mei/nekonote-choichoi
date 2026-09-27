// 毛糸の色。色だけに頼らないよう、色ごとに印（ハート・星・しずく・葉・花・まる）をつける
export const YARN = [
  { name: '赤', base: '#E0474A', light: '#FF9384', dark: '#9E2229', mark: 'heart' },
  { name: '黄色', base: '#F2B72A', light: '#FFE38A', dark: '#B9800A', mark: 'star' },
  { name: '青', base: '#3A7BD8', light: '#8DBBFF', dark: '#1C4A96', mark: 'drop' },
  { name: '緑', base: '#3AA566', light: '#8FDCA8', dark: '#1B6A3E', mark: 'leaf' },
  { name: 'むらさき', base: '#9160CB', light: '#C9A6F2', dark: '#58318C', mark: 'flower' },
  { name: 'もも色', base: '#EF86AE', light: '#FFC1D8', dark: '#B64A76', mark: 'dot' },
] as const;

export type Coat = { name: string; base: string; light: string; dark: string; belly: string; eye: [string, string]; pattern: 'tabby' | 'calico' | 'solid' | 'tux' | 'white'; nose: string; whisker: string };
export const COATS: Coat[] = [
  { name: '茶トラ', base: '#E9A35F', light: '#F8D2A2', dark: '#C06C2E', belly: '#FCEFDC', eye: ['#D5E07A', '#7D9B30'], pattern: 'tabby', nose: '#E8908A', whisker: '#FFF8EE' },
  { name: '三毛', base: '#FBF6EF', light: '#FFFFFF', dark: '#E2D6C6', belly: '#FFFFFF', eye: ['#F1CF62', '#B07E22'], pattern: 'calico', nose: '#F0A2A0', whisker: '#A89B8E' },
  { name: 'キジトラ', base: '#A88862', light: '#DCC7A6', dark: '#5B432E', belly: '#F1E6D3', eye: ['#C6DA70', '#6C8A2A'], pattern: 'tabby', nose: '#C98B80', whisker: '#FBF3E6' },
  { name: 'くろ', base: '#2F2A2A', light: '#524A49', dark: '#181515', belly: '#3B3535', eye: ['#F0DC62', '#A89520'], pattern: 'solid', nose: '#3F3333', whisker: '#D8D0C8' },
  { name: 'ハチワレ', base: '#2F2A2A', light: '#524A49', dark: '#181515', belly: '#FFFFFF', eye: ['#DDE67E', '#8EA43A'], pattern: 'tux', nose: '#EBA2A2', whisker: '#E8E0D8' },
  { name: 'しろ', base: '#FCF9F4', light: '#FFFFFF', dark: '#E5DCD0', belly: '#FFFFFF', eye: ['#A9D4F5', '#3C7DB8'], pattern: 'white', nose: '#F3A9A9', whisker: '#A49A90' },
];

// アルバムに入る子猫（試作。本番は許可を得た本物の子猫の写真・動画）
export const ALBUM = [
  { coat: 0, name: 'チャチャ', note: 'ひなたぼっこが大好き。お昼すぎは縁側でとろけています。' },
  { coat: 1, name: 'ミケ', note: '毛糸玉を見ると、しっぽがぴんと立ちます。' },
  { coat: 2, name: 'トラまる', note: '段ボール箱に入ると、なかなか出てきません。' },
  { coat: 4, name: 'ハチ', note: 'おでこの八の字がじまん。おやつの音には一番に来ます。' },
  { coat: 5, name: 'ユキ', note: 'しずかな子。ひざの上で、よくのどを鳴らします。' },
  { coat: 3, name: 'クロ', note: '夜になると目がまんまる。高い所が好きです。' },
  { coat: 0, name: 'コムギ', note: '食いしんぼう。ごはんの前は、足もとでくるくる回ります。' },
  { coat: 2, name: 'きなこ', note: 'ねこじゃらしの名人。ジャンプがとても高い。' },
  { coat: 1, name: 'おもち', note: 'まるくなって寝ると、本当におもちみたい。' },
  { coat: 4, name: 'ポン太', note: 'おっとり屋さん。毛づくろいが長い。' },
  { coat: 5, name: 'しらたま', note: '青い目の子。窓の外の鳥をじっと見ています。' },
  { coat: 3, name: 'あずき', note: '甘えんぼう。名前を呼ぶと、小さく返事をします。' },
];
