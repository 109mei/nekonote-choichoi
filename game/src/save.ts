// 進みぐあいの保存（この端末の中だけ）
export interface Save {
  cleared: Record<number, number>; // ステージ番号 → はなまるの数（1〜3）
  album: number[];                 // 手に入れた子猫（ステージ番号）
  items: { punch: number; sweep: number; matatabi: number };
  sound: boolean; oneTap: boolean; helpSeen: boolean;
}
const KEY = 'nekonote-choichoi-v1';
const fresh = (): Save => ({ cleared: {}, album: [], items: { punch: 2, sweep: 1, matatabi: 1 }, sound: true, oneTap: false, helpSeen: false });
export function loadSave(): Save {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); return { ...fresh(), ...s, items: { ...fresh().items, ...(s.items || {}) } }; } } catch { /* 保存できない環境でも遊べる */ }
  return fresh();
}
export function writeSave(s: Save) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 無視 */ } }
