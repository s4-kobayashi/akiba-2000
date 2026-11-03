// 看板アトラス。すべての看板を 4096px の 1 枚に描き、1 描画命令で出す。
// 店名・配色は当時の写真から読み取ったもの。ロゴは模写せず文字組みで表す。人物広告は人物を描かず製品の抽象図に置き換える。
import * as THREE from 'three';
import { Batch, rng } from './batch.js';
import { SIGNS } from './layout.js';

const GOTHIC = '"HGP創英角ｺﾞｼｯｸUB","HGS創英角ｺﾞｼｯｸUB","BIZ UDPGothic","Yu Gothic","Meiryo",sans-serif';
const POP = '"HGP創英角ﾎﾟｯﾌﾟ体","HGS創英角ﾎﾟｯﾌﾟ体","BIZ UDPGothic","Meiryo",sans-serif';
const MIN = '"HGP明朝E","Yu Mincho","MS PMincho",serif';
const LATIN = '"Arial Black",Impact,"Arial",sans-serif';

function fit(g, s, maxW, size, font, weight = '900') {
  g.font = `${weight} ${size}px ${font}`;
  const w = g.measureText(s).width;
  if (w > maxW) { size *= maxW / w; g.font = `${weight} ${size}px ${font}`; }
  return size;
}
function T(g, s, x, y, maxW, size, color, font = GOTHIC, align = 'center') {
  fit(g, s, maxW, size, font);
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
// 縦書き: y0〜y1 に 1 文字ずつ詰める
function V(g, s, cx, y0, y1, maxW, color, font = GOTHIC) {
  const chars = [...s], n = chars.length, step = (y1 - y0) / n;
  const size = Math.min(step * 0.96, maxW);
  g.font = `900 ${size}px ${font}`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((c, i) => {
    const y = y0 + step * (i + 0.5);
    if (c === 'ー' || c === '－') { g.fillRect(cx - size * 0.09, y - size * 0.36, size * 0.18, size * 0.72); return; }
    g.fillText(c, cx, y);
  });
}
const bg = (g, W, H, c) => { g.fillStyle = c; g.fillRect(0, 0, W, H); };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

const KIND = {
  aircon(g, W, H) {
    bg(g, W, H, '#1b63b5');
    rect(g, 0, H * 0.38, W, H * 0.62, '#1560ae');
    V(g, 'エアコン', W * 0.3, H * 0.4, H * 0.98, W * 0.5, '#ffd51e');
    V(g, '衛星アンテナ', W * 0.74, H * 0.03, H * 0.72, W * 0.42, '#fff');
    T(g, '大型店', W * 0.26, H * 0.2, W * 0.46, H * 0.08, '#ffe24a');
    T(g, 'リース', W * 0.26, H * 0.3, W * 0.46, H * 0.05, '#fff');
  },
  aaspro(g, W, H) {
    bg(g, W, H, '#f6f4ec');
    rect(g, 0, 0, W, H * 0.13, '#fff');
    T(g, 'AASPRO', W / 2, H * 0.07, W * 0.92, H * 0.1, '#1d2a78', LATIN);
    const gr = g.createLinearGradient(0, H * 0.14, 0, H * 0.62); gr.addColorStop(0, '#b9dcf2'); gr.addColorStop(1, '#5a9dcf');
    g.fillStyle = gr; g.fillRect(0, H * 0.14, W, H * 0.5);
    g.fillStyle = '#eef3f6'; g.beginPath(); g.ellipse(W * 0.5, H * 0.36, W * 0.34, H * 0.15, -0.5, 0, 7); g.fill();
    g.strokeStyle = '#9aa6ad'; g.lineWidth = W * 0.02; g.beginPath(); g.moveTo(W * 0.5, H * 0.36); g.lineTo(W * 0.72, H * 0.27); g.stroke();
    rect(g, 0, H * 0.64, W, H * 0.16, '#f3d21c');
    T(g, 'BS・CS デジタル', W / 2, H * 0.72, W * 0.9, H * 0.07, '#222');
    T(g, 'トミヒサムセン', W / 2, H * 0.9, W * 0.92, H * 0.09, '#b0121b');
  },
  reidan(g, W, H) {
    bg(g, W, H, '#6b2a6f');
    rect(g, W * 0.03, H * 0.05, W * 0.94, H * 0.9, '#efe8df');
    T(g, '冷暖', W / 2, H * 0.3, W * 0.8, H * 0.42, '#b0183a');
    T(g, '専門店', W / 2, H * 0.72, W * 0.8, H * 0.36, '#2a3a95');
  },
  pshot(g, W, H) {
    bg(g, W, H, '#eef0f1');
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#dfe7ef'); gr.addColorStop(1, '#8fa6bb');
    g.fillStyle = gr; g.fillRect(W * 0.14, H * 0.08, W * 0.72, H * 0.68);
    g.fillStyle = '#2c3a4a'; g.beginPath(); g.moveTo(W * 0.26, H * 0.52); g.lineTo(W * 0.68, H * 0.3); g.lineTo(W * 0.78, H * 0.42); g.lineTo(W * 0.34, H * 0.66); g.closePath(); g.fill();
    g.fillStyle = '#9bb0c4'; g.beginPath(); g.ellipse(W * 0.52, H * 0.45, W * 0.1, H * 0.09, -0.4, 0, 7); g.fill();
    T(g, 'デジタルカメラ', W / 2, H * 0.87, W * 0.8, H * 0.1, '#1f2a3a');
  },
  kakuta(g, W, H) { bg(g, W, H, '#fbf8f0'); rect(g, 0, H * 0.82, W, H * 0.18, '#d21b23'); T(g, 'カクタ', W / 2, H * 0.42, W * 0.9, H * 0.72, '#c5161f', POP); },
  hajimete(g, W, H) { bg(g, W, H, '#f8cf0d'); V(g, '初めての方も', W / 2, H * 0.02, H * 0.42, W * 0.82, '#d31a1a', POP); V(g, 'パソコン専門店', W / 2, H * 0.44, H * 0.99, W * 0.84, '#102a7a'); },
  ankou(g, W, H) { bg(g, W, H, '#f7f8f8'); V(g, 'あんこう', W / 2, H * 0.02, H * 0.32, W * 0.82, '#122e8d', POP); V(g, 'パソコン・ビジュアル館', W / 2, H * 0.33, H * 0.99, W * 0.68, '#14296e'); },
  imac(g, W, H) {
    bg(g, W, H, '#f4f6f7');
    g.save(); g.translate(W * 0.62, H * 0.97); g.rotate(-Math.PI / 2);
    T(g, 'The all-new iMac.', 0, 0, H * 0.92, W * 0.62, '#59636c', '"Times New Roman",serif', 'left');
    g.restore();
    rect(g, W * 0.12, H * 0.02, W * 0.76, H * 0.1, '#9dc7e6');
  },
  stack(g, W, H) {
    bg(g, W, H, '#e9e8e3');
    const rows = [['TV・ゲーム館', '#1a7b3a', '#fff'], ['ゲーム', '#183b8f', '#fff'], ['パソコンソフト', '#b73b90', '#fff'], ['DVD', '#d0641c', '#fff'], ['LD・ビデオ', '#3ca2d6', '#fff'], ['PlayStation 2', '#16307b', '#fff'], ['CD・MD', '#6b2b82', '#fff'], ['Game', '#c21a2a', '#fff'], ['ホビー', '#d9358f', '#fff']];
    rows.forEach((r, i) => {
      const h = H / rows.length, y = i * h;
      rect(g, W * 0.03, y + h * 0.05, W * 0.94, h * 0.9, r[1]);
      T(g, r[0], W / 2, y + h / 2, W * 0.85, h * 0.62, r[2]);
    });
  },
  games(g, W, H) { bg(g, W, H, '#1a2a78'); V(g, 'ゲームソフト大量入荷', W / 2, H * 0.02, H * 0.98, W * 0.76, '#ffe441'); },
  laoxTower(g, W, H) {
    bg(g, W, H, '#d9d3c4');
    rect(g, W * 0.1, H * 0.02, W * 0.8, H * 0.96, '#c21f2a');
    rect(g, W * 0.1, H * 0.02, W * 0.8, H * 0.14, '#1f3f9b');
    ['L', 'A', 'O', 'X'].forEach((c, i) => T(g, c, W / 2, H * (0.27 + i * 0.2), W * 0.7, H * 0.19, '#fff', LATIN));
  },
  amd(g, W, H) { bg(g, W, H, '#f7f8f6'); T(g, 'AMD', W * 0.46, H * 0.5, W * 0.74, H * 0.62, '#111', LATIN); g.fillStyle = '#128246'; g.beginPath(); g.moveTo(W * 0.84, H * 0.3); g.lineTo(W * 0.95, H * 0.3); g.lineTo(W * 0.95, H * 0.72); g.lineTo(W * 0.84, H * 0.6); g.closePath(); g.fill(); },
  daiseikai(g, W, H) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#bfeadf'); gr.addColorStop(0.7, '#6cc9c1'); gr.addColorStop(1, '#f7f8f4');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const R = rng(11); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`; const s = R() * W * 0.03 + 3; g.save(); g.translate(R() * W, R() * H * 0.72); g.rotate(R()); g.fillRect(-s / 2, -s / 2, s, s); g.restore(); }
    rect(g, W * 0.18, H * 0.48, W * 0.64, H * 0.15, '#fbfbf9'); rect(g, W * 0.2, H * 0.6, W * 0.6, H * 0.012, '#a9b4b4'); rect(g, W * 0.24, H * 0.52, W * 0.2, H * 0.015, '#8fd0c8');
    T(g, 'さわやか空調', W / 2, H * 0.2, W * 0.8, H * 0.075, '#0f6f76');
    T(g, '大清快', W / 2, H * 0.84, W * 0.82, H * 0.17, '#17345f', MIN);
  },
  red_v(g, W, H) { bg(g, W, H, '#c7211f'); V(g, '激安ルームエアコン', W / 2, H * 0.03, H * 0.97, W * 0.72, '#fff'); },
  nakaura(g, W, H) {
    bg(g, W, H, '#f5cf12'); rect(g, 0, H * 0.72, W, H * 0.28, '#b6161f');
    T(g, 'NAKAURA', W * 0.42, H * 0.36, W * 0.72, H * 0.54, '#14338c', LATIN);
    T(g, 'TAX FREE', W * 0.87, H * 0.36, W * 0.22, H * 0.28, '#b6161f', LATIN);
    T(g, 'DUTY FREE & DISCOUNT', W / 2, H * 0.86, W * 0.9, H * 0.2, '#fff', LATIN);
  },
  toshiba(g, W, H) { bg(g, W, H, '#f8f8f6'); T(g, 'TOSHIBA', W / 2, H * 0.53, W * 0.92, H * 0.82, '#c8151b', LATIN); },
  face(g, W, H) {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2c8f73'); gr.addColorStop(1, '#0f5f4e');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    rect(g, W * 0.08, H * 0.1, W * 0.84, H * 0.62, '#1c6e5a'); rect(g, W * 0.12, H * 0.14, W * 0.76, H * 0.54, '#7fc3ad');
    T(g, 'FACE', W * 0.7, H * 0.84, W * 0.4, H * 0.15, '#eef8f2', '"Times New Roman",serif');
    rect(g, W * 0.1, H * 0.81, W * 0.42, H * 0.012, '#d9efe7'); rect(g, W * 0.1, H * 0.85, W * 0.34, H * 0.012, '#d9efe7');
  },
  sakaguchi(g, W, H) { bg(g, W, H, '#fbfafa'); g.strokeStyle = '#b5121a'; g.lineWidth = W * 0.04; g.strokeRect(W * 0.04, W * 0.04, W * 0.92, H - W * 0.08); V(g, '坂口電熱はここです', W / 2, H * 0.03, H * 0.97, W * 0.7, '#b5121a', MIN); },
  aisan(g, W, H) {
    bg(g, W, H, '#fff');
    rect(g, 0, 0, W, H * 0.34, '#18a3b6'); T(g, 'LAN', W * 0.5, H * 0.1, W * 0.5, H * 0.14, '#fff', LATIN);
    T(g, 'ネットワーク', W / 2, H * 0.25, W * 0.8, H * 0.09, '#fff');
    rect(g, 0, H * 0.34, W, H * 0.3, '#fff'); T(g, 'AISAN', W / 2, H * 0.49, W * 0.88, H * 0.24, '#143e94', LATIN);
    rect(g, 0, H * 0.66, W, H * 0.34, '#f6f6f2'); T(g, '愛三電機', W / 2, H * 0.83, W * 0.86, H * 0.22, '#143e94', MIN);
  },
  aisan2(g, W, H) {
    const rows = [['aisan.co.jp', '#c12021'], ['光ネットワーク', '#0d8f7d'], ['光ファイバー', '#1b4eaa'], ['ギガスイッチ', '#6a2e8a'], ['VoIP 無線LAN', '#0f8bb8']];
    bg(g, W, H, '#eef0ef');
    rows.forEach((r, i) => { const h = H / rows.length; rect(g, W * 0.03, i * h + h * 0.06, W * 0.94, h * 0.88, r[1]); T(g, r[0], W / 2, i * h + h / 2, W * 0.88, h * 0.56, '#fff'); });
  },
  vaio(g, W, H) {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2d70c9'); gr.addColorStop(1, '#0d2e77');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c4d5ea'; g.beginPath(); g.moveTo(W * 0.14, H * 0.54); g.lineTo(W * 0.72, H * 0.24); g.lineTo(W * 0.9, H * 0.34); g.lineTo(W * 0.34, H * 0.68); g.closePath(); g.fill();
    g.fillStyle = '#16233c'; g.beginPath(); g.moveTo(W * 0.2, H * 0.53); g.lineTo(W * 0.7, H * 0.28); g.lineTo(W * 0.84, H * 0.35); g.lineTo(W * 0.34, H * 0.63); g.closePath(); g.fill();
    T(g, 'VAIO', W / 2, H * 0.85, W * 0.5, H * 0.17, '#fff', '"Arial",sans-serif');
  },
  karaoke(g, W, H) { bg(g, W, H, '#e2ece5'); const R = rng(8); for (let i = 0; i < 22; i++) { g.fillStyle = `hsl(${180 + R() * 30},30%,${50 + R() * 30}%)`; g.fillRect(R() * W, R() * H * 0.7, W * 0.2, H * 0.2); } rect(g, 0, H * 0.72, W, H * 0.28, '#fff'); T(g, 'カラオケ・ビデオ', W / 2, H * 0.86, W * 0.86, H * 0.2, '#143e94'); },
  parking(g, W, H) { bg(g, W, H, '#f4f6f5'); g.fillStyle = '#1b6d3f'; g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.36, 0, 7); g.fill(); T(g, 'P', W / 2, H * 0.44, W * 0.5, H * 0.56, '#fff', LATIN); T(g, '駐車場', W / 2, H * 0.89, W * 0.8, H * 0.15, '#1b6d3f'); },
  mcd(g, W, H) { bg(g, W, H, '#c5151f'); T(g, "McDonald's", W / 2, H * 0.53, W * 0.9, H * 0.7, '#ffd42a', '"Arial",sans-serif'); },
  sato_v(g, W, H) { bg(g, W, H, '#d21c24'); rect(g, W * 0.06, H * 0.01, W * 0.88, H * 0.98, '#fbf9f4'); V(g, 'サトームセン', W / 2, H * 0.02, H * 0.98, W * 0.76, '#cc1820'); },
  sato_h(g, W, H) { bg(g, W, H, '#cf1b23'); rect(g, 0, H * 0.86, W, H * 0.14, '#7d0e14'); T(g, 'サトームセン', W * 0.5, H * 0.46, W * 0.54, H * 0.66, '#fff'); T(g, '家電・パソコン', W * 0.12, H * 0.46, W * 0.2, H * 0.34, '#ffd92e'); T(g, '免税 DUTY FREE', W * 0.88, H * 0.46, W * 0.2, H * 0.3, '#ffd92e'); },
  sato_big(g, W, H) {
    bg(g, W, H, '#cf1b23'); rect(g, 0, 0, W, H * 0.42, '#f3efe6');
    g.fillStyle = '#e8a33a'; g.beginPath(); g.ellipse(W * 0.2, H * 0.22, W * 0.12, H * 0.16, 0.2, 0, 7); g.fill(); // キャラクターは描かず丸い印で代用
    T(g, '家電のことなら', W * 0.62, H * 0.22, W * 0.62, H * 0.13, '#1f2a70');
    T(g, 'サトームセン', W / 2, H * 0.7, W * 0.92, H * 0.34, '#fff');
  },
  yellowBand(g, W, H) { bg(g, W, H, '#f0c61c'); const ws = ['電子部品', 'オーディオ', '無線機', '真空管', '計測器', 'ケーブル']; ws.forEach((w, i) => T(g, w, W * (i + 0.5) / ws.length, H / 2, W / ws.length * 0.86, H * 0.56, '#1a1a1a')); },
  depaV(g, W, H) { bg(g, W, H, '#8e2b34'); V(g, '秋葉原デパート', W / 2, H * 0.02, H * 0.98, W * 0.78, '#fff'); },
  depa(g, W, H) { bg(g, W, H, '#f0ede2'); T(g, '秋葉原デパート', W / 2, H / 2, W * 0.92, H * 0.68, '#7a1f28'); },
  onoden(g, W, H) { bg(g, W, H, '#c71e27'); rect(g, W * 0.02, H * 0.08, W * 0.96, H * 0.84, '#fbfaf5'); T(g, 'オノデン', W / 2, H * 0.52, W * 0.88, H * 0.74, '#c71e27'); },
  onodenV(g, W, H) { bg(g, W, H, '#c71e27'); V(g, 'オノデン', W / 2, H * 0.03, H * 0.97, W * 0.76, '#fff'); },
  laoxComputer(g, W, H) { bg(g, W, H, '#c21f2a'); rect(g, 0, H * 0.83, W, H * 0.17, '#142f85'); T(g, 'LAOX', W * 0.2, H * 0.42, W * 0.32, H * 0.66, '#fff', LATIN); T(g, 'THE COMPUTER館', W * 0.66, H * 0.42, W * 0.58, H * 0.5, '#fff', LATIN); T(g, 'パソコン専門 全館', W / 2, H * 0.91, W * 0.6, H * 0.13, '#fff'); },
  zaiko(g, W, H) { bg(g, W, H, '#123b8e'); V(g, '全品', W * 0.28, H * 0.03, H * 0.34, W * 0.42, '#ffe43f'); V(g, '在庫一掃', W * 0.28, H * 0.36, H * 0.98, W * 0.42, '#fff'); V(g, 'パソコン周辺機器', W * 0.74, H * 0.03, H * 0.98, W * 0.36, '#fff'); },
  zaiko2(g, W, H) { bg(g, W, H, '#f1c60f'); T(g, '中古パソコン・買取', W / 2, H / 2, W * 0.92, H * 0.68, '#1a2a7a'); },
  pcV(g, W, H) { bg(g, W, H, '#0e7a55'); V(g, 'パソコンパーツ', W / 2, H * 0.03, H * 0.97, W * 0.72, '#fff'); },
  tzone(g, W, H) { bg(g, W, H, '#10256e'); T(g, 'T-ZONE.', W * 0.3, H * 0.5, W * 0.52, H * 0.72, '#fff', LATIN); T(g, 'PC DIY SHOP', W * 0.76, H * 0.5, W * 0.4, H * 0.42, '#ffd21e', LATIN); },
  sofmap(g, W, H) { bg(g, W, H, '#ed8a13'); rect(g, W * 0.4, 0, W * 0.6, H, '#148fc1'); T(g, 'Sofmap', W * 0.2, H / 2, W * 0.36, H * 0.62, '#fff', '"Arial",sans-serif'); T(g, '買取査定', W * 0.7, H / 2, W * 0.52, H * 0.68, '#fff'); },
  sofmapV(g, W, H) { bg(g, W, H, '#148fc1'); rect(g, 0, 0, W, H * 0.16, '#ed8a13'); T(g, 'Sofmap', W / 2, H * 0.08, W * 0.9, H * 0.08, '#fff', '"Arial",sans-serif'); V(g, '買取査定', W / 2, H * 0.18, H * 0.98, W * 0.72, '#fff'); },
  tsukumo(g, W, H) { bg(g, W, H, '#f6f6f2'); rect(g, 0, H * 0.82, W, H * 0.18, '#1b6db6'); T(g, 'TSUKUMO', W * 0.34, H * 0.42, W * 0.58, H * 0.62, '#1b6db6', LATIN); T(g, 'ツクモ', W * 0.82, H * 0.42, W * 0.3, H * 0.58, '#d21b23'); },
  laoxH(g, W, H) { bg(g, W, H, '#c21f2a'); T(g, 'LAOX', W * 0.26, H * 0.5, W * 0.42, H * 0.76, '#fff', LATIN); T(g, 'ラオックス 本店', W * 0.72, H * 0.5, W * 0.48, H * 0.6, '#fff'); },
  laoxV(g, W, H) { bg(g, W, H, '#c21f2a'); V(g, 'ラオックス', W / 2, H * 0.03, H * 0.97, W * 0.74, '#fff'); },
  ishimaru(g, W, H) { bg(g, W, H, '#d2141d'); rect(g, 0, H * 0.8, W, H * 0.2, '#fff'); T(g, '石丸電気', W / 2, H * 0.4, W * 0.8, H * 0.68, '#fff'); T(g, 'CD・DVD 家電 パソコン', W / 2, H * 0.9, W * 0.7, H * 0.15, '#d2141d'); },
  ishimaruV(g, W, H) { bg(g, W, H, '#d2141d'); V(g, '石丸電気', W / 2, H * 0.03, H * 0.97, W * 0.76, '#fff'); },
  yamagiwa(g, W, H) { bg(g, W, H, '#f8f7f2'); rect(g, 0, H * 0.84, W, H * 0.16, '#1f4f9c'); T(g, 'ヤマギワ', W * 0.34, H * 0.42, W * 0.56, H * 0.66, '#1f4f9c'); T(g, '照明・家電', W * 0.8, H * 0.42, W * 0.32, H * 0.38, '#b0161f'); },
  yamagiwaV(g, W, H) { bg(g, W, H, '#1f4f9c'); V(g, 'ヤマギワ', W / 2, H * 0.03, H * 0.97, W * 0.76, '#fff'); },
  radio(g, W, H) { bg(g, W, H, '#20327f'); T(g, 'ラジオ会館', W / 2, H * 0.53, W * 0.8, H * 0.72, '#ffe040'); },
  rocket(g, W, H) { bg(g, W, H, '#e8e4d7'); rect(g, 0, H * 0.78, W, H * 0.22, '#d31a22'); T(g, 'ロケット', W / 2, H * 0.39, W * 0.8, H * 0.66, '#d31a22', POP); T(g, 'オーディオ・AV', W / 2, H * 0.89, W * 0.6, H * 0.16, '#fff'); },
  takarada(g, W, H) { bg(g, W, H, '#f6f6ee'); T(g, 'ビデオ テレビ パソコン・オーディオ', W / 2, H * 0.22, W * 0.92, H * 0.17, '#222'); rect(g, 0, H * 0.4, W, H * 0.6, '#f6f6ee'); T(g, 'タカラダ', W / 2, H * 0.68, W * 0.86, H * 0.5, '#123a8e'); },
  musen(g, W, H) { bg(g, W, H, '#123a8e'); T(g, '無線・電子パーツ', W / 2, H / 2, W * 0.9, H * 0.66, '#fff'); },
  denshi(g, W, H) { bg(g, W, H, '#0e7a55'); T(g, '電子部品の専門店', W / 2, H / 2, W * 0.9, H * 0.66, '#fff'); },
  kaitori(g, W, H) { bg(g, W, H, '#d31a22'); T(g, 'ゲーム・パソコン 高価買取', W / 2, H / 2, W * 0.92, H * 0.62, '#fff'); },
  rich(g, W, H) { bg(g, W, H, '#1a5ea6'); T(g, 'リッチ', W / 2, H * 0.58, W * 0.82, H * 0.6, '#fff'); T(g, 'フレンチの', W / 2, H * 0.18, W * 0.5, H * 0.14, '#fff'); },
  kintetsu(g, W, H) { bg(g, W, H, '#1762ac'); T(g, '近畿日本ツーリスト', W / 2, H * 0.74, W * 0.9, H * 0.2, '#fff'); T(g, 'メロー', W * 0.72, H * 0.22, W * 0.4, H * 0.18, '#fff'); T(g, '旅行', W * 0.24, H * 0.22, W * 0.3, H * 0.18, '#f44'); },
  sogo(g, W, H) { bg(g, W, H, '#1274b8'); T(g, '総合地所', W / 2, H / 2, W * 0.84, H * 0.5, '#fff'); },
  // 献血は回想に出てくるので入れる。赤十字の標章は使わず、文字だけにする
  kenketsu(g, W, H) { bg(g, W, H, '#f4f2ec'); rect(g, 0, H * 0.86, W, H * 0.14, '#c8202c'); T(g, '献血ルーム', W / 2, H * 0.45, W * 0.84, H * 0.66, '#c8202c'); },
  kenketsuBus(g, W, H) { bg(g, W, H, '#f4f2ec'); T(g, '献血にご協力ください', W / 2, H * 0.5, W * 0.9, H * 0.7, '#c8202c'); },
  banner(g, W, H) { bg(g, W, H, '#d8c13a'); T(g, 'バスケットボール選手権大会', W / 2, H * 0.53, W * 0.8, H * 0.64, '#3a3010'); },
  court(g, W, H) { bg(g, W, H, '#fbfbf5'); g.strokeStyle = '#d12530'; g.lineWidth = W * 0.012; g.strokeRect(W * 0.02, H * 0.03, W * 0.96, H * 0.94); T(g, '秋葉原駅前広場', W / 2, H * 0.2, W * 0.86, H * 0.14, '#1d2b70'); T(g, 'ご利用の皆様へ', W / 2, H * 0.36, W * 0.7, H * 0.09, '#222'); T(g, '自転車・バイクの乗入れ禁止', W / 2, H * 0.53, W * 0.84, H * 0.08, '#c0202a'); T(g, 'ボール遊びはコート内で', W / 2, H * 0.66, W * 0.84, H * 0.08, '#222'); },
  vending(g, W, H) {
    bg(g, W, H, '#d7dde3'); rect(g, W * 0.06, H * 0.05, W * 0.88, H * 0.47, '#f6f7f6');
    const cols = ['#c9141c', '#1a4fae', '#efb50f', '#1e8a4d', '#e36d13', '#17a0c3', '#7a3ea0', '#c9141c', '#d7d5cc'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const x = W * (0.09 + c * 0.104), y = H * (0.07 + r * 0.15); rect(g, x, y, W * 0.07, H * 0.11, cols[(r * 3 + c * 2) % cols.length]); rect(g, x, y + H * 0.1, W * 0.07, H * 0.012, '#555'); }
    rect(g, W * 0.06, H * 0.56, W * 0.6, H * 0.08, '#1a4fae'); T(g, 'つめた〜い', W * 0.36, H * 0.6, W * 0.5, H * 0.05, '#fff');
    rect(g, W * 0.72, H * 0.56, W * 0.2, H * 0.14, '#3a3f45'); rect(g, W * 0.1, H * 0.78, W * 0.76, H * 0.12, '#262a2e');
  },
};
// 店先の帯(ありふれた語を当時の配色で)
const BAND_WORDS = [['パソコン', '#27427e'], ['オーディオ', '#8e2a2c'], ['電子部品', '#2a6a55'], ['免税 DUTY FREE', '#a02a2a'], ['ゲーム', '#4e3f70'], ['中古PC', '#2f4674'], ['無線・アマチュア', '#343f6e'], ['DVD・CD', '#a35a2a']];
BAND_WORDS.forEach((b, i) => {
  KIND['band' + i] = (g, W, H) => { bg(g, W, H, b[1]); T(g, b[0], W / 2, H * 0.53, W * 0.92, H * 0.72, '#fff'); };
});
export const BAND_COUNT = BAND_WORDS.length;
// 袖看板(細い縦長。色は帯と揃え、白地も混ぜる)
const TATE_WORDS = [['パソコン館', '#27427e', '#fff'], ['オーディオ', '#8e2a2c', '#fff'], ['電子部品', '#f0ece0', '#2a6a55'], ['免税店', '#a02a2a', '#fff'], ['ゲームソフト', '#4e3f70', '#fff'], ['中古パソコン', '#e8c84a', '#22242a'], ['無線機', '#f0ece0', '#343f6e'], ['電気街', '#a35a2a', '#fff']];
TATE_WORDS.forEach((b, i) => {
  KIND['tate' + i] = (g, W, H) => { bg(g, W, H, b[1]); V(g, b[0], W / 2, H * 0.04, H * 0.96, W * 0.82, b[2]); };
});
export const TATE_COUNT = TATE_WORDS.length;

// 風雨の跡を全看板の絵に重ねる
function weather(g, x, y, W, H, R) {
  g.save(); g.beginPath(); g.rect(x, y, W, H); g.clip();
  // 継ぎ目(ターポリンや鉄板の分割)
  g.fillStyle = 'rgba(0,0,0,0.16)';
  const seam = Math.max(40, Math.min(W, H) * 0.34);
  for (let s = seam; s < H; s += seam) g.fillRect(x, y + s, W, 1.5);
  for (let s = seam; s < W; s += seam) g.fillRect(x + s, y, 1.5, H);
  // 退色(日に焼けて原色が沈み、白地は灰色がかる)
  g.fillStyle = `rgba(150,146,134,${0.12 + R() * 0.1})`; g.fillRect(x, y, W, H);
  // 面の大きなむら
  for (let i = 0; i < 26; i++) {
    const v = R() < 0.6 ? '42,36,28' : '214,210,196';
    g.fillStyle = `rgba(${v},${0.02 + R() * 0.05})`;
    g.beginPath(); g.ellipse(x + R() * W, y + R() * H, W * (0.05 + R() * 0.22), H * (0.05 + R() * 0.2), R() * 3, 0, 7); g.fill();
  }
  // 上端からの雨だれ。細い筋は遠目だと平均されて消えるので、幅のある筋も混ぜ、看板ごとに濃さを変える
  const dirt = 0.6 + R() * 0.8;
  const topG = g.createLinearGradient(0, y, 0, y + H * 0.35);
  topG.addColorStop(0, `rgba(42,36,28,${0.2 * dirt})`); topG.addColorStop(1, 'rgba(42,36,28,0)');
  g.fillStyle = topG; g.fillRect(x, y, W, H * 0.35);
  for (let i = 0; i < W / 5; i++) {
    const a = (0.1 + R() * 0.15) * dirt, len = H * (0.15 + R() * R() * 0.75);
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, `rgba(42,36,28,${a})`); gr.addColorStop(1, 'rgba(42,36,28,0)');
    g.fillStyle = gr; g.fillRect(x + R() * W, y, R() < 0.2 ? W * (0.01 + R() * 0.03) : 1 + R() * 4, len);
  }
  // 縁の錆と、下端にたまる汚れ
  const edge = Math.max(2, Math.min(W, H) * 0.014);
  g.strokeStyle = 'rgba(107,74,46,0.42)'; g.lineWidth = edge; g.strokeRect(x + edge / 2, y + edge / 2, W - edge, H - edge);
  const low = g.createLinearGradient(0, y + H * 0.8, 0, y + H);
  low.addColorStop(0, 'rgba(42,36,28,0)'); low.addColorStop(1, 'rgba(42,36,28,0.16)');
  g.fillStyle = low; g.fillRect(x, y + H * 0.8, W, H * 0.2);
  g.restore();
}

export function buildSignAtlas(maxAniso) {
  const SIZE = 4096, PPM = 44;
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#2c2f33'; g.fillRect(0, 0, SIZE, SIZE);
  const extra = [
    { k: 'rich', w: 7, h: 8 }, { k: 'kintetsu', w: 13, h: 13 }, { k: 'sogo', w: 8, h: 5 },
    { k: 'banner', w: 26, h: 1.6 }, { k: 'kenketsuBus', w: 6, h: 0.8 }, { k: 'court', w: 2.4, h: 1.8 }, { k: 'vending', w: 1.2, h: 1.9 },
    ...BAND_WORDS.map((_, i) => ({ k: 'band' + i, w: 9, h: 1.1 })),
    ...TATE_WORDS.map((_, i) => ({ k: 'tate' + i, w: 1.1, h: 6 })),
  ];
  const seen = new Map();
  for (const s of [...SIGNS, ...extra]) if (!seen.has(s.k)) seen.set(s.k, { k: s.k, w: s.w, h: s.h });
  // 棚詰め(高さ順)
  const list = [...seen.values()].sort((a, b) => b.h - a.h);
  const R = rng(41), uv = {};
  const dims = (it, ppm) => {
    const W = it.w * ppm, H = it.h * ppm, over = Math.max(W / 1300, H / 1300, 1);
    return [Math.round(W / over), Math.round(H / over)];
  };
  // 棚詰めで収まる最大の解像度を探す
  const fits = (ppm) => {
    let px = 8, py = 40, rh = 0;
    for (const it of list) {
      const [W, H] = dims(it, ppm);
      if (px + W + 4 > SIZE) { px = 8; py += rh + 6; rh = 0; }
      if (py + H > SIZE) return false;
      px += W + 6; rh = Math.max(rh, H);
    }
    return true;
  };
  let ppm = PPM; while (!fits(ppm) && ppm > 8) ppm -= 1;
  let x = 8, y = 40, rowH = 0;
  for (const it of list) {
    const [W, H] = dims(it, ppm);
    if (x + W + 4 > SIZE) { x = 8; y += rowH + 6; rowH = 0; }
    if (y + H > SIZE) throw new Error('看板アトラスが溢れた: ' + it.k);
    g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    KIND[it.k](g, W, H);
    g.restore();
    weather(g, x, y, W, H, R);
    uv[it.k] = [(x + 0.5) / SIZE, 1 - (y + H - 0.5) / SIZE, (x + W - 0.5) / SIZE, 1 - (y + 0.5) / SIZE];
    x += W + 6; rowH = Math.max(rowH, H);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  uv.frame = [0.0005, 0.9995, 0.0015, 0.9985]; // アトラス上端の濃灰色
  return { tex, uv };
}

// 面ごとの座標変換: 正面から見た左端 u と高さ y を世界座標へ
export function faceFrame(b, f) {
  if (f === 'e') return { o: [b.x1, b.z1], d: [0, -1], n: [1, 0], len: b.z1 - b.z0 };
  if (f === 'w') return { o: [b.x0, b.z0], d: [0, 1], n: [-1, 0], len: b.z1 - b.z0 };
  if (f === 'n') return { o: [b.x1, b.z0], d: [-1, 0], n: [0, -1], len: b.x1 - b.x0 };
  return { o: [b.x0, b.z1], d: [1, 0], n: [0, 1], len: b.x1 - b.x0 };
}

// 壁の (u, y) が平らな看板に隠れる位置か。室外機が看板の前へ浮かないように使う
export function coveredBySign(id, f, u, y, w, h) {
  return SIGNS.some((s) => s.on === id && s.f === f && !s.proj && u + w > s.u - 0.2 && u < s.u + s.w + 0.2 && y + h > s.y - 0.2 && y < s.y + s.h + 0.2);
}

export function buildSignMeshes(atlas, byId, scene) {
  const batch = new Batch(), steel = new Batch();
  const { uv } = atlas;
  const P = (fr, u, y, out) => [fr.o[0] + fr.d[0] * u + fr.n[0] * out, y, fr.o[1] + fr.d[1] * u + fr.n[1] * out];
  for (const s of SIGNS) {
    const b = byId[s.on]; if (!b) continue;
    const fr = faceFrame(b, s.f), r = uv[s.k];
    if (s.proj) {
      // 壁から直角に張り出す袖看板(両面)
      const u = s.u, out0 = 0.5, out1 = 0.5 + s.w, y0 = s.y, y1 = s.y + s.h;
      const A = P(fr, u, y0, out0), B_ = P(fr, u, y0, out1), C = P(fr, u, y1, out1), D = P(fr, u, y1, out0);
      const th = 0.14, dx = fr.d[0] * th, dz = fr.d[1] * th;
      const sh = (p, k) => [p[0] + dx * k, p[1], p[2] + dz * k];
      batch.quad(sh(B_, 1), sh(A, 1), sh(D, 1), sh(C, 1), r);
      batch.quad(sh(A, -1), sh(B_, -1), sh(C, -1), sh(D, -1), r);
      batch.quad(sh(B_, -1), sh(B_, 1), sh(C, 1), sh(C, -1), uv.frame);
      batch.quad(sh(D, -1), sh(C, -1), sh(C, 1), sh(D, 1), uv.frame);
      batch.quad(sh(A, 1), sh(B_, 1), sh(B_, -1), sh(A, -1), uv.frame);
      for (const yy of [y0 + 0.5, y1 - 0.5, (y0 + y1) / 2]) steel.pipe(P(fr, u, yy, 0), P(fr, u, yy, out0), 0.05, 0x55585c);
      continue;
    }
    const out = s.roof ? 0.2 : 0.18;
    const u0 = s.u, u1 = s.u + s.w, y0 = s.y, y1 = s.y + s.h;
    batch.quad(P(fr, u0, y0, out), P(fr, u1, y0, out), P(fr, u1, y1, out), P(fr, u0, y1, out), r);
    // 枠(厚み)
    const back = s.roof ? 0.02 : 0;
    batch.quad(P(fr, u0, y1, out), P(fr, u1, y1, out), P(fr, u1, y1, back), P(fr, u0, y1, back), uv.frame);
    batch.quad(P(fr, u1, y0, back), P(fr, u0, y0, back), P(fr, u0, y0, out), P(fr, u1, y0, out), uv.frame);
    batch.quad(P(fr, u1, y0, out), P(fr, u1, y0, back), P(fr, u1, y1, back), P(fr, u1, y1, out), uv.frame);
    batch.quad(P(fr, u0, y0, back), P(fr, u0, y0, out), P(fr, u0, y1, out), P(fr, u0, y1, back), uv.frame);
    if (s.roof) {
      // 屋上の看板: 裏の面と鉄骨の支持
      batch.quad(P(fr, u1, y0, back), P(fr, u0, y0, back), P(fr, u0, y1, back), P(fr, u1, y1, back), uv.frame);
      const roof = b.h, n = Math.max(2, Math.round(s.w / 4));
      for (let i = 0; i <= n; i++) {
        const u = u0 + (s.w * i) / n;
        steel.pipe(P(fr, u, roof, -2.4), P(fr, u, y1 - 0.4, -0.1), 0.05, 0x4a4d50);
        if (y0 > roof + 0.2) steel.pipe(P(fr, u, roof, 0), P(fr, u, y0 + 0.1, 0), 0.06, 0x4a4d50);
        steel.pipe(P(fr, u, roof, -2.4), P(fr, u, roof, 0.1), 0.05, 0x4a4d50);
      }
    }
  }
  const mat = new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  const m = batch.mesh(mat); scene.add(m);
  const sm = steel.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 })); scene.add(sm);
  return { mat };
}
