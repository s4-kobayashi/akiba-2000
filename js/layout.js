// 街区のデータ。x=東+、z=南+、単位 m。
// 配置は フォト秋葉原 の 2000 年前後のパノラマ(駅前から西を望む)の看板の並びを基準にした。
// 距離は写真からの目測で、実測図に基づくものではない(SOURCES.md 参照)。

export const SPAWN = { x: 47, z: 11, yaw: Math.PI / 2 }; // 駅前の道路。西(-x)を向く

export const PLAZA = { x0: -90, x1: 40, z0: -104, z1: -3 };
export const BIG_COURT = { x: -6, z: -58, a: 28, b: 18, ya: 46, yb: 43 };   // 青の楕円 a×b、黄の外周 ya×yb(写真では黄が広場のほぼ全面を占める)
export const ROUND_COURT = { x: -56, z: -27, r: 15 };
export const HOOPS = [
  { x: -6 - 26, z: -58, dx: 1, dz: 0 },
  { x: -6 + 26, z: -58, dx: -1, dz: 0 },
  { x: -56 - 15.6, z: -27, dx: 1, dz: 0 },
];

export const CHUO = { x0: -146, x1: -132, z0: -300, z1: 320 }; // 中央通りの車道

// 歩道・舗装の高まり。mat: walk=平板 / brick=赤レンガ / slab=荒れたコンクリート
export const WALKS = [
  { x0: -128, x1: 44, z0: -3, z1: 3, mat: 'brick' },              // 広場沿い(赤レンガ+駐輪)
  { x0: -128, x1: 46, z0: 18, z1: 22, mat: 'walk' },              // 駅前道路の南側
  { x0: 40, x1: 44, z0: -104, z1: -3, mat: 'walk' },              // 広場東側
  { x0: -132, x1: -128, z0: -300, z1: 320, mat: 'walk' },         // 中央通り東歩道
  { x0: -150, x1: -146, z0: -300, z1: 320, mat: 'walk' },         // 中央通り西歩道
  { x0: -128, x1: 44, z0: 78, z1: 82, mat: 'walk' },              // ガード南の通り
  { x0: -90, x1: 44, z0: -108, z1: -104, mat: 'walk' },           // 広場北側
];

// ガード下の路地・広場の外の空地など、段差のない舗装(材質だけ替える)
export const FLAT = [
  { x0: -88, x1: -82, z0: 22, z1: 78, mat: 'slab' },
  { x0: -90, x1: 8, z0: -220, z1: -118, mat: 'slab' },            // 青果市場の解体跡
  { x0: 8, x1: 66, z0: -220, z1: -118, mat: 'asphaltDark' },      // 暫定駐車場
];

// 建物。face の sign は壁面からの配置。u=見る人の左端から(m)、y=下端(m)
// t: white / beige / gray / stripe / brown / cream / stucco / red / yellow
export const B = [
  // ───────── 広場の西の並び(パノラマの主役)。東面が駅を向く
  { id: 'aircon', x0: -128, x1: -92, z0: -22, z1: -2, h: 24, t: 'beige', shops: 'w' },
  { id: 'dicam', x0: -128, x1: -92, z0: -38, z1: -22, h: 17, t: 'white', shops: 'w' },
  { id: 'ank', x0: -128, x1: -92, z0: -58, z1: -38, h: 32, t: 'stripe', shops: 'w' },
  { id: 'imac', x0: -128, x1: -92, z0: -65, z1: -58, h: 33, t: 'white', shops: 'w' },
  { id: 'laox', x0: -128, x1: -92, z0: -88, z1: -65, h: 37, t: 'gray', shops: 'w' },
  { id: 'amd', x0: -128, x1: -92, z0: -112, z1: -88, h: 36, t: 'white', shops: 'w' },
  { id: 'toshiba', x0: -128, x1: -92, z0: -142, z1: -122, h: 24, t: 'beige', shops: 'ws' },
  { id: 'sakaguchi', x0: -128, x1: -92, z0: -158, z1: -142, h: 30, t: 'white', shops: 'w' },
  { id: 'aisan', x0: -128, x1: -92, z0: -176, z1: -158, h: 28, t: 'cream', shops: 'we' },
  { id: 'vaio', x0: -128, x1: -92, z0: -200, z1: -176, h: 46, t: 'brown', shops: 'w' },
  { id: 'park', x0: -128, x1: -92, z0: -222, z1: -200, h: 34, t: 'white', shops: 'w' },
  { id: 'n1', x0: -128, x1: -92, z0: -252, z1: -222, h: 22, t: 'gray', shops: 'w' },
  { id: 'n2', x0: -128, x1: -70, z0: -300, z1: -252, h: 26, t: 'beige', shops: 'w' },
  // ───────── 駅前道路の南
  { id: 'sato', x0: 8, x1: 44, z0: 22, z1: 52, h: 27, t: 'gray', shops: 'n' },
  { id: 'dept', x0: -82, x1: 8, z0: 22, z1: 52, h: 12, t: 'stucco', shops: 'n' },
  { id: 'onoden', x0: -128, x1: -88, z0: 22, z1: 56, h: 28, t: 'beige', shops: 'nw' },
  // ───────── ガード南の通り
  { id: 'ishimaru', x0: -128, x1: -96, z0: 82, z1: 124, h: 30, t: 'red', shops: 'nw' },
  { id: 'gap1', x0: -96, x1: -62, z0: 82, z1: 112, h: 18, t: 'white', shops: 'n' },
  { id: 'radio', x0: -62, x1: -24, z0: 82, z1: 118, h: 25, t: 'yellow', shops: 'n' },
  { id: 'rocket', x0: -24, x1: 8, z0: 82, z1: 112, h: 21, t: 'white', shops: 'n' },
  { id: 'takarada', x0: 8, x1: 44, z0: 82, z1: 116, h: 31, t: 'gray', shops: 'n' },
  // ───────── 中央通り 東側の南半分
  { id: 'yamagiwa', x0: -128, x1: -92, z0: 124, z1: 166, h: 32, t: 'white', shops: 'w' },
  { id: 'c1', x0: -128, x1: -92, z0: 174, z1: 200, h: 23, t: 'beige', shops: 'wn' },
  { id: 'c2', x0: -128, x1: -92, z0: 200, z1: 238, h: 28, t: 'gray', shops: 'w' },
  { id: 'c3', x0: -128, x1: -92, z0: 238, z1: 320, h: 22, t: 'cream', shops: 'w' },
  // ───────── 中央通り 西側
  { id: 'w1', x0: -188, x1: -150, z0: -300, z1: -240, h: 24, t: 'beige', shops: 'e' },
  { id: 'tzone', x0: -188, x1: -150, z0: -240, z1: -196, h: 30, t: 'gray', shops: 'e' },
  { id: 'w2', x0: -188, x1: -150, z0: -188, z1: -150, h: 21, t: 'white', shops: 'es' },
  { id: 'computer', x0: -188, x1: -150, z0: -150, z1: -92, h: 41, t: 'white', shops: 'e' },
  { id: 'sofmap', x0: -188, x1: -150, z0: -92, z1: -50, h: 26, t: 'cream', shops: 'e' },
  { id: 'tsukumo', x0: -188, x1: -150, z0: -50, z1: -14, h: 22, t: 'beige', shops: 'e' },
  { id: 'w3', x0: -188, x1: -150, z0: -14, z1: 54, h: 27, t: 'gray', shops: 'e' },
  { id: 'w4', x0: -188, x1: -150, z0: 76, z1: 126, h: 19, t: 'white', shops: 'e' },
  { id: 'laoxhonten', x0: -188, x1: -150, z0: 126, z1: 186, h: 35, t: 'gray', shops: 'e' },
  { id: 'w5', x0: -188, x1: -150, z0: 186, z1: 250, h: 25, t: 'beige', shops: 'e' },
  { id: 'w6', x0: -188, x1: -150, z0: 250, z1: 320, h: 20, t: 'stucco', shops: 'e' },
];

// 看板。on=建物 id, f=面(e/w/n/s), u=その面を正面から見た左端からの距離, y=下端, w,h=寸法(m), k=絵の種類
// roof:true は屋上に鉄骨で立てる / proj:true は壁から垂直に張り出す袖看板
export const SIGNS = [
  // ── エアコン棟
  { on: 'aircon', f: 'e', u: 3, y: 5, w: 7.5, h: 15, k: 'aircon' },
  { on: 'aircon', f: 'e', u: 11, y: 7, w: 6, h: 14, k: 'aaspro' },
  { on: 'aircon', f: 'e', u: 4, y: 24.4, w: 9, h: 6, k: 'reidan', roof: true },
  // ── デジカメ棟
  { on: 'dicam', f: 'e', u: 3, y: 5, w: 10, h: 9.5, k: 'pshot' },
  { on: 'dicam', f: 'e', u: 4, y: 14.8, w: 8, h: 1.7, k: 'kenketsu' }, // 位置は諸説あるため推定
  // ── あんこう(ナカウラ)
  { on: 'ank', f: 'e', u: 0.8, y: 31, w: 18.2, h: 2.6, k: 'kakuta', roof: true },
  { on: 'ank', f: 'e', u: 12.2, y: 5, w: 3.2, h: 25, k: 'hajimete' },
  { on: 'ank', f: 'e', u: 16, y: 5, w: 3.4, h: 25, k: 'ankou' },
  // ── iMac
  { on: 'imac', f: 'e', u: 1, y: 8, w: 4.8, h: 22, k: 'imac' },
  // ── LAOX
  { on: 'laox', f: 'e', u: 2, y: 4.5, w: 7, h: 25, k: 'stack' },
  { on: 'laox', f: 'e', u: 12, y: 8, w: 4.5, h: 21, k: 'games' },
  { on: 'laox', f: 'e', u: 8, y: 37, w: 7, h: 15, k: 'laoxTower', roof: true },
  // ── AMD
  { on: 'amd', f: 'e', u: 1, y: 31, w: 18, h: 9, k: 'amd', roof: true },
  { on: 'amd', f: 'e', u: 3, y: 12, w: 11, h: 17, k: 'daiseikai' },
  { on: 'amd', f: 'e', u: 15, y: 11, w: 3.2, h: 19, k: 'red_v' },
  { on: 'amd', f: 'e', u: 2, y: 5, w: 18, h: 4.8, k: 'nakaura' },
  // ── TOSHIBA
  { on: 'toshiba', f: 'e', u: 1, y: 19.5, w: 16, h: 3.5, k: 'toshiba' },
  { on: 'toshiba', f: 'e', u: 3, y: 5.5, w: 13, h: 12.5, k: 'face' },
  // ── 坂口電熱
  { on: 'sakaguchi', f: 'e', u: 8, y: 14, w: 3.2, h: 23, k: 'sakaguchi', roof: true },
  // ── 愛三電機
  { on: 'aisan', f: 'e', u: 2, y: 20, w: 8, h: 14, k: 'aisan', roof: true },
  { on: 'aisan', f: 'e', u: 2, y: 5, w: 8, h: 14, k: 'aisan2' },
  // ── VAIO
  { on: 'vaio', f: 'e', u: 8, y: 13, w: 12, h: 12, k: 'vaio' },
  { on: 'vaio', f: 'e', u: 1, y: 46, w: 16, h: 8, k: 'karaoke', roof: true },
  // ── 駐車場タワー
  { on: 'park', f: 'e', u: 2, y: 24, w: 7, h: 7, k: 'parking' },
  { on: 'park', f: 'e', u: 11, y: 24, w: 7, h: 7, k: 'parking' },
  { on: 'aisan', f: 'e', u: 10, y: 3.6, w: 7.5, h: 1.8, k: 'mcd' },
  // ── サトームセン
  { on: 'sato', f: 'n', u: 30, y: 6, w: 3.6, h: 26, k: 'sato_v', proj: true },
  { on: 'sato', f: 'n', u: 1, y: 4.3, w: 34, h: 3, k: 'sato_h' },
  { on: 'sato', f: 'e', u: 2, y: 6, w: 26, h: 19, k: 'sato_big' },
  // ── 秋葉原デパート
  { on: 'dept', f: 'n', u: 26, y: 4.4, w: 26, h: 1.6, k: 'yellowBand' },
  { on: 'dept', f: 'n', u: 16, y: 5, w: 1.3, h: 6.5, k: 'depaV', proj: true },
  { on: 'dept', f: 'n', u: 55, y: 8, w: 7, h: 1.7, k: 'depa' },
  // ── オノデン
  { on: 'onoden', f: 'e', u: 8, y: 28.4, w: 16, h: 5, k: 'onoden', roof: true },
  { on: 'onoden', f: 'n', u: 8, y: 28.4, w: 18, h: 5.4, k: 'onoden', roof: true },
  { on: 'onoden', f: 'w', u: 5, y: 6, w: 3.2, h: 19, k: 'onodenV' },
  // ── 中央通り側
  { on: 'computer', f: 'e', u: 5, y: 26, w: 46, h: 8.5, k: 'laoxComputer' },
  { on: 'computer', f: 'e', u: 8, y: 6, w: 7, h: 18, k: 'zaiko' },
  { on: 'computer', f: 'e', u: 40, y: 6, w: 4, h: 19, k: 'pcV' },
  { on: 'tzone', f: 'e', u: 4, y: 18, w: 34, h: 8, k: 'tzone' },
  { on: 'sofmap', f: 'e', u: 3, y: 12, w: 26, h: 8, k: 'sofmap' },
  { on: 'sofmap', f: 'e', u: 32, y: 5, w: 3.4, h: 15, k: 'sofmapV', proj: true },
  { on: 'tsukumo', f: 'e', u: 3, y: 14, w: 26, h: 5.5, k: 'tsukumo' },
  { on: 'laoxhonten', f: 'e', u: 6, y: 23, w: 42, h: 8, k: 'laoxH' },
  { on: 'laoxhonten', f: 'e', u: 50, y: 6, w: 3.6, h: 24, k: 'laoxV', proj: true },
  { on: 'ishimaru', f: 'w', u: 3, y: 20, w: 36, h: 8, k: 'ishimaru' },
  { on: 'ishimaru', f: 'n', u: 3, y: 18, w: 26, h: 7, k: 'ishimaru' },
  { on: 'ishimaru', f: 'w', u: 39, y: 5, w: 3, h: 22, k: 'ishimaruV', proj: true },
  { on: 'yamagiwa', f: 'w', u: 5, y: 22, w: 30, h: 7, k: 'yamagiwa' },
  { on: 'yamagiwa', f: 'w', u: 37, y: 6, w: 3.4, h: 20, k: 'yamagiwaV', proj: true },
  { on: 'radio', f: 'n', u: 5, y: 20, w: 28, h: 3.8, k: 'radio' },
  { on: 'rocket', f: 'n', u: 4, y: 12, w: 24, h: 6, k: 'rocket' },
  { on: 'takarada', f: 'n', u: 3, y: 31, w: 15, h: 9, k: 'takarada', roof: true },
  { on: 'takarada', f: 'n', u: 20, y: 5, w: 3, h: 19, k: 'pcV', proj: true },
  { on: 'gap1', f: 'n', u: 5, y: 7, w: 22, h: 5, k: 'musen' },
  { on: 'w5', f: 'e', u: 8, y: 14, w: 30, h: 6, k: 'zaiko2' },
  { on: 'w3', f: 'e', u: 6, y: 16, w: 44, h: 6, k: 'sato_h' },
  { on: 'c2', f: 'w', u: 6, y: 14, w: 26, h: 6, k: 'denshi' },
  { on: 'n2', f: 'e', u: 8, y: 11, w: 28, h: 7, k: 'kaitori' },
];

// 広場の西の 2 棟は写真どおり南北に細かく分かれる。ゾーン名は HUD の現在地に出す
export const ZONES = [
  { n: '秋葉原駅前広場 バスケットコート', x0: -90, x1: 40, z0: -104, z1: -3 },
  { n: '電気街口 駅前', x0: -2, x1: 66, z0: -3, z1: 22 },
  { n: '駅前の通り', x0: -128, x1: -2, z0: -3, z1: 22 },
  { n: '中央通り', x0: -150, x1: -128, z0: -300, z1: 320 },
  { n: 'ガード下・南の通り', x0: -128, x1: 44, z0: 22, z1: 82 },
  { n: '青果市場跡地', x0: -90, x1: 8, z0: -220, z1: -104 },
  { n: '暫定駐車場', x0: 8, x1: 70, z0: -220, z1: -104 },
];

// 地図の移動先
export const PLACES = [
  { n: '電気街口 駅前', x: 47, z: 11, yaw: Math.PI / 2 },
  { n: 'バスケットコート', x: 16, z: -24, yaw: 0.6 },
  { n: '小さな円形コート', x: -40, z: -14, yaw: Math.PI * 0.4 },
  { n: '中央通り(北)', x: -130, z: -120, yaw: Math.PI },
  { n: '中央通り(南)', x: -130, z: 140, yaw: 0 },
  { n: 'ガード下', x: -40, z: 76, yaw: Math.PI / 2 },
  { n: '市場跡地・駐車場', x: 2, z: -112, yaw: 0 + Math.PI },
];

// 当たり判定の外枠(この外には出られない。実物の塀や車止めを置いて見せる)
export const BOUNDS = { x0: -149.5, x1: 95, z0: -218, z1: 240 };
