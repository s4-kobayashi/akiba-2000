// 街の小物: 街灯・柵・ゴール・自転車・自販機・植栽・車・電柱。接地と生活感の担当。
import * as THREE from 'three';
import { Batch, rng } from './batch.js';
import { PLAZA, HOOPS, BOUNDS } from './layout.js';

// 自転車 1 台(ママチャリ)の結合ジオメトリ
function bikeGeometry() {
  const b = new Batch();
  const M = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const wheel = new THREE.TorusGeometry(0.33, 0.018, 3, 10);
  b.add(wheel, M(-0.52, 0.34, 0), 0x18181a); b.add(wheel, M(0.52, 0.34, 0), 0x18181a);
  const hub = 0xffffff; // 本体色(instanceColor)に従う部分
  b.pipe([-0.52, 0.34, 0], [-0.08, 0.34, 0], 0.016, hub, 3);
  b.pipe([-0.08, 0.34, 0], [-0.2, 0.86, 0], 0.018, hub, 4);
  b.pipe([-0.2, 0.74, 0], [0.38, 0.72, 0], 0.018, hub, 4);
  b.pipe([-0.08, 0.34, 0], [0.38, 0.72, 0], 0.018, hub, 4);
  b.pipe([-0.52, 0.34, 0], [-0.2, 0.8, 0], 0.012, hub, 3);
  b.pipe([0.52, 0.34, 0], [0.38, 0.96, 0], 0.018, hub, 4);
  b.pipe([0.38, 0.96, -0.26], [0.38, 0.96, 0.26], 0.012, 0x777a7d, 3);
  const seat = new THREE.BoxGeometry(0.24, 0.06, 0.12);
  b.add(seat, M(-0.22, 0.9, 0), 0x202124);
  // 前かご
  const bs = 0x8d9093;
  for (const [a, c] of [[[0.48, 0.74, -0.15], [0.76, 0.74, 0.15]], [[0.76, 0.74, -0.15], [0.48, 0.74, 0.15]], [[0.48, 0.92, -0.15], [0.76, 0.92, -0.15]], [[0.48, 0.92, 0.15], [0.76, 0.92, 0.15]], [[0.76, 0.92, -0.15], [0.76, 0.92, 0.15]], [[0.48, 0.92, -0.15], [0.48, 0.92, 0.15]]]) b.pipe(a, c, 0.006, bs, 3);
  // 荷台
  b.pipe([-0.74, 0.7, -0.08], [-0.32, 0.7, -0.08], 0.008, bs, 3); b.pipe([-0.74, 0.7, 0.08], [-0.32, 0.7, 0.08], 0.008, bs, 3);
  // スタンド(実物は片側。ここは斜めの棒で接地)
  b.pipe([-0.5, 0.3, 0], [-0.55, 0, 0.14], 0.01, 0x777a7d, 3);
  return b.build();
}

// 車: 側面形を押し出して車体。ガラスは別の頂点色、車輪は黒。1990 年代の箱型セダンとワンボックス
function carGeometry(kind) {
  const b = new Batch();
  // セダンの側面形は肩まで。室内は上で絞るので別に組む
  const profile = kind === 'sedan' ? [[-2.35, 0.3], [-2.35, 0.72], [-2.2, 0.82], [-1.25, 0.86], [1.35, 0.86], [2.3, 0.78], [2.38, 0.56], [2.38, 0.3]]
    : kind === 'van' ? [[-2.3, 0.28], [-2.3, 1.78], [-2.1, 1.88], [1.0, 1.9], [1.75, 1.2], [2.22, 1.0], [2.28, 0.6], [2.28, 0.28]]
      : [[-3.0, 0.5], [-3.0, 0.9], [1.1, 0.9], [1.1, 2.1], [2.4, 2.1], [2.6, 1.2], [2.6, 0.5]];
  const s = new THREE.Shape(); profile.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath();
  const W = kind === 'truck' ? 2.0 : 1.72;
  const body = new THREE.ExtrudeGeometry(s, { depth: W - 0.08, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 1 });
  const M0 = new THREE.Matrix4().makeTranslation(0, 0, -(W - 0.08) / 2);
  const G = (h) => h; // 頂点色: 本体は白(instanceColor を効かせる)、他は実色
  b.add(body.toNonIndexed ? body : body, M0, G(0xffffff));
  const glass = 0x2c363e; // 真っ黒だと板に見える。空を映して少し明るい
  const zs = W / 2 + 0.012;
  const side = (pts) => { // 片側のガラス面(両面)
    for (const sgn of [1, -1]) {
      const z = zs * sgn;
      const a = [pts[0][0], pts[0][1], z], bb = [pts[1][0], pts[1][1], z], c = [pts[2][0], pts[2][1], z], d = [pts[3][0], pts[3][1], z];
      if (sgn > 0) b.quad(a, bb, c, d, [0, 0, 1, 1], glass); else b.quad(bb, a, d, c, [0, 0, 1, 1], glass);
    }
  };
  if (kind === 'sedan') {
    // 室内: 肩から屋根へ内側に絞る。真上から見て台形、屋根の中央を少し盛る
    const belt = 0.88, top = 1.31, zb = W / 2 - 0.05, zt = W / 2 - 0.27;
    const zAt = (y) => zb + (zt - zb) * (y - belt) / (top - belt);
    const xF = (y) => 1.34 + (0.78 - 1.34) * (y - belt) / (top - belt), xR = (y) => -1.24 + (-0.72 + 1.24) * (y - belt) / (top - belt);
    const body = 0xffffff;
    // 屋根
    b.quad([-0.72, top, zt], [0.78, top, zt], [0.72, top + 0.04, 0], [-0.68, top + 0.04, 0], [0, 0, 1, 1], body);
    b.quad([-0.68, top + 0.04, 0], [0.72, top + 0.04, 0], [0.78, top, -zt], [-0.72, top, -zt], [0, 0, 1, 1], body);
    // 前後のガラスと、その枠
    const fy = 0.92, ty = top - 0.03;
    b.quad([xF(belt), belt, zb], [xF(belt), belt, -zb], [xF(top), top, -zt], [xF(top), top, zt], [0, 0, 1, 1], body);
    b.quad([xR(belt), belt, -zb], [xR(belt), belt, zb], [xR(top), top, zt], [xR(top), top, -zt], [0, 0, 1, 1], body);
    b.quad([xF(fy) + 0.012, fy, zAt(fy) - 0.07], [xF(fy) + 0.012, fy, -zAt(fy) + 0.07], [xF(ty) + 0.012, ty, -zAt(ty) + 0.07], [xF(ty) + 0.012, ty, zAt(ty) - 0.07], [0, 0, 1, 1], glass);
    b.quad([xR(fy) - 0.012, fy, -zAt(fy) + 0.07], [xR(fy) - 0.012, fy, zAt(fy) - 0.07], [xR(ty) - 0.012, ty, zAt(ty) - 0.07], [xR(ty) - 0.012, ty, -zAt(ty) + 0.07], [0, 0, 1, 1], glass);
    // 側面の板とガラス(柱の分だけ窓を狭める)
    const sideT = (x0, x1, x2, x3, y0, y1, color, off) => {
      for (const s of [1, -1]) {
        const a = [x0, y0, s * (zAt(y0) + off)], c = [x1, y0, s * (zAt(y0) + off)], e = [x2, y1, s * (zAt(y1) + off)], f = [x3, y1, s * (zAt(y1) + off)];
        if (s > 0) b.quad(a, c, e, f, [0, 0, 1, 1], color); else b.quad(c, a, f, e, [0, 0, 1, 1], color);
      }
    };
    sideT(xR(belt), xF(belt), xF(top), xR(top), belt, top, body, 0);
    sideT(xR(fy) + 0.1, -0.02, -0.02, xR(ty) + 0.1, fy, ty, glass, 0.008);
    sideT(0.06, xF(fy) - 0.12, xF(ty) - 0.12, 0.06, fy, ty, glass, 0.008);
  } else if (kind === 'van') {
    side([[-2.1, 1.18], [-0.9, 1.18], [-0.9, 1.75], [-2.1, 1.75]]);
    side([[-0.8, 1.18], [0.6, 1.18], [0.6, 1.75], [-0.8, 1.75]]);
    side([[0.7, 1.18], [1.6, 1.18], [1.0, 1.78], [0.7, 1.78]]);
    b.quad([1.72, 1.22, W / 2 - 0.1], [1.72, 1.22, -W / 2 + 0.1], [1.04, 1.86, -W / 2 + 0.12], [1.04, 1.86, W / 2 - 0.12], [0, 0, 1, 1], glass);
  } else {
    side([[1.5, 1.35], [2.45, 1.35], [2.3, 1.98], [1.5, 1.98]]);
    b.quad([2.56, 1.3, W / 2 - 0.1], [2.56, 1.3, -W / 2 + 0.1], [2.38, 2.05, -W / 2 + 0.1], [2.38, 2.05, W / 2 - 0.1], [0, 0, 1, 1], glass);
    // 荷台の箱
    b.box(-3.2, 0.92, -1.08, 0.98, 2.95, 1.08, { color: 0xb6b4ab, scale: 40 });
  }
  // 灯火とバンパー
  const Lx = kind === 'truck' ? 2.62 : profile[profile.length - 1][0] + 0.01;
  const Rx = profile[0][0] - 0.01;
  b.box(Lx - 0.01, 0.6, W / 2 - 0.42, Lx + 0.02, 0.76, W / 2 - 0.06, { color: 0xe7e6df, scale: 40 });
  b.box(Lx - 0.01, 0.6, -W / 2 + 0.06, Lx + 0.02, 0.76, -W / 2 + 0.42, { color: 0xe7e6df, scale: 40 });
  b.box(Rx - 0.02, 0.62, W / 2 - 0.42, Rx + 0.01, 0.8, W / 2 - 0.06, { color: 0xaa1a1c, scale: 40 });
  b.box(Rx - 0.02, 0.62, -W / 2 + 0.06, Rx + 0.01, 0.8, -W / 2 + 0.42, { color: 0xaa1a1c, scale: 40 });
  b.box(Lx - 0.05, 0.3, -W / 2, Lx + 0.06, 0.48, W / 2, { color: 0x505255, scale: 40 });
  b.box(Rx - 0.06, 0.3, -W / 2, Rx + 0.05, 0.48, W / 2, { color: 0x505255, scale: 40 });
  // ナンバー
  b.box(Lx + 0.06, 0.34, -0.16, Lx + 0.07, 0.46, 0.16, { color: 0xe9e6d5, scale: 40 });
  // 車体の側面: ドアの合わせ目、下回りの黒い帯、ドアミラー、ホイールアーチ
  const seam = 0x17181a;
  const sideStrip = (x0, x1, y0, y1, color) => {
    for (const sgn of [1, -1]) {
      const z = (W / 2 + 0.006) * sgn;
      if (sgn > 0) b.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, 1, 1], color);
      else b.quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], [0, 0, 1, 1], color);
    }
  };
  const bodyX = kind === 'truck' ? [-3.0, 2.6] : [profile[0][0], profile[profile.length - 1][0]];
  sideStrip(bodyX[0], bodyX[1], 0.3, 0.42, 0x2a2b2d);
  const seams = kind === 'sedan' ? [-1.22, 0.04, 1.26] : kind === 'van' ? [-0.85, 0.65, 1.62] : [1.45, 2.42];
  for (const x of seams) sideStrip(x - 0.008, x + 0.008, 0.42, kind === 'sedan' ? 0.9 : 1.15, seam);
  if (kind === 'sedan') sideStrip(-1.15, 1.2, 0.56, 0.59, 0x3c3d40);
  const mirrorX = kind === 'sedan' ? 1.1 : kind === 'van' ? 1.5 : 2.35, mirrorY = kind === 'sedan' ? 0.95 : kind === 'van' ? 1.25 : 1.5;
  for (const sgn of [1, -1]) {
    const z0 = sgn > 0 ? W / 2 : -W / 2 - 0.14;
    b.box(mirrorX, mirrorY, z0, mirrorX + 0.14, mirrorY + 0.11, z0 + 0.14, { color: 0x151618, scale: 40 });
  }
  const arch = new THREE.CylinderGeometry(0.385, 0.385, 0.012, 18); arch.rotateX(Math.PI / 2);
  // フロントグリル
  b.box(Lx - 0.01, 0.52, -W / 2 + 0.44, Lx + 0.02, 0.74, W / 2 - 0.44, { color: 0x1b1c1e, scale: 40 });
  // 車輪
  const wheel = new THREE.CylinderGeometry(0.31, 0.31, 0.2, 14); wheel.rotateX(Math.PI / 2);
  const cap = new THREE.CylinderGeometry(0.17, 0.17, 0.205, 10); cap.rotateX(Math.PI / 2);
  const wx = kind === 'truck' ? [-1.9, 1.8] : [-1.42, 1.42];
  for (const x of wx) for (const z of [W / 2 - 0.08, -W / 2 + 0.08]) {
    const m = new THREE.Matrix4().makeTranslation(x, 0.31, z);
    b.add(arch, new THREE.Matrix4().makeTranslation(x, 0.33, z > 0 ? W / 2 + 0.004 : -W / 2 - 0.004), 0x060607);
    b.add(wheel, m, 0x101113); b.add(cap, m, 0x9b9da0);
  }
  return b.build();
}

// 樹冠用の葉のアトラス(アルファ抜き)。枝先の葉の塊を描く
function leafTexture() {
  const S = 512; const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const R = rng(4);
  g.clearRect(0, 0, S, S);
  // 葉を小さく数多く描き、中央に寄せて縁はまばらにする(カードの四角が見えないように)
  for (let i = 0; i < 1500; i++) {
    const a = R() * 6.28, r = Math.pow(R(), 0.72) * S * 0.47;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const l = 6 + R() * 9, w = l * 0.46;
    const k = 0.6 + R() * 0.55;
    g.fillStyle = `rgb(${(82 + R() * 26) * k | 0},${118 * k | 0},${(44 + R() * 14) * k | 0})`;
    g.save(); g.translate(x, y); g.rotate(R() * 6.28);
    g.beginPath(); g.moveTo(-l, 0); g.quadraticCurveTo(0, -w, l, 0); g.quadraticCurveTo(0, w, -l, 0); g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 金網: アルファ抜き(ひし形)
function meshTexture() {
  const S = 128; const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.clearRect(0, 0, S, S);
  g.strokeStyle = '#d7d9d6'; g.lineWidth = 3.5;
  g.beginPath();
  for (let i = -S; i < S * 2; i += 32) { g.moveTo(i, 0); g.lineTo(i + S, S); g.moveTo(i, S); g.lineTo(i + S, 0); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildProps(scene, tex, atlas, world) {
  const metal = new Batch(), wire = new Batch(), mesh = new Batch(), sign = new Batch(), conc = new Batch(), soil = new Batch();
  const R = rng(1993);
  const WHITE = 0xe2e3df, BROWN = 0x4a3a30, GRAY = 0x8e9093;
  const addCol = (x0, z0, x1, z1, soft) => world.add(x0, z0, x1, z1, soft);

  // ── 街灯(写真の茶色の柱+灰色の傘)
  const lamp = (x, z, dx, dz, H = 8.4) => {
    metal.pipe([x, 0, z], [x, H, z], 0.1, BROWN, 8);
    metal.pipe([x, H, z], [x + dx * 1.6, H + 0.42, z + dz * 1.6], 0.05, BROWN, 6);
    const head = new THREE.SphereGeometry(0.42, 10, 6); head.scale(1.3, 0.5, 0.8);
    const ang = Math.atan2(-dz, dx);
    const M = new THREE.Matrix4().compose(new THREE.Vector3(x + dx * 1.95, H + 0.45, z + dz * 1.95), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)), new THREE.Vector3(1, 1, 1));
    metal.add(head, M, 0xb5b8b6);
    addCol(x - 0.14, z - 0.14, x + 0.14, z + 0.14);
  };
  const plazaLamp = (x, z) => {
    metal.pipe([x, 0, z], [x, 7.2, z], 0.075, 0x25272a, 8);
    metal.add(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 8), new THREE.Matrix4().makeTranslation(x, 0.17, z), 0x25272a);
    metal.pipe([x, 7.2, z], [x + 0.6, 7.45, z], 0.04, 0x25272a, 6);
    metal.add(new THREE.SphereGeometry(0.24, 8, 6), new THREE.Matrix4().makeTranslation(x + 0.72, 7.42, z), 0xd8d9d4);
    addCol(x - 0.14, z - 0.14, x + 0.14, z + 0.14);
  };
  for (const [x, z] of [[-74, -0.2], [-36, -0.2], [2, -0.2], [41, -0.2]]) lamp(x, z, 0, 1);
  for (const [x, z] of [[-36, -40], [-28, -14], [20, -38], [-52, -78], [-6, -90], [26, -86], [-72, -60], [-84, -28]]) plazaLamp(x, z);
  for (let z = -280; z < 310; z += 36) { lamp(-130.5, z, -1, 0, 9); lamp(-147.5, z + 18, 1, 0, 9); }
  for (let x = -116; x < 40; x += 42) lamp(x, 79, 0, -1, 7.5);
  lamp(43, -38, 1, 0); lamp(43, -84, 1, 0);

  // ── 広場の柵: パイプ枠+メッシュパネル(写真の白い枠)。出入口を残す
  const fence = (x0, z0, x1, z1, H = 1.25, gaps = []) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, step = 2.4;
    for (let s = 0; s < L - 0.01; s += step) {
      const e = Math.min(L, s + step), mid = (s + e) / 2;
      if (gaps.some(([a, b]) => mid > a && mid < b)) continue;
      const a = [x0 + ux * s, z0 + uz * s], b = [x0 + ux * e, z0 + uz * e];
      metal.pipe([a[0], 0, a[1]], [a[0], H, a[1]], 0.03, WHITE, 6);
      metal.pipe([b[0], 0, b[1]], [b[0], H, b[1]], 0.03, WHITE, 6);
      metal.pipe([a[0], H, a[1]], [b[0], H, b[1]], 0.024, WHITE, 6);
      metal.pipe([a[0], 0.14, a[1]], [b[0], 0.14, b[1]], 0.02, WHITE, 6);
      const w = e - s, uvh = H / 0.5;
      mesh.quad([a[0], 0.14, a[1]], [b[0], 0.14, b[1]], [b[0], H, b[1]], [a[0], H, a[1]], [0, 0, w / 0.5, uvh]);
      // 柵は当たり判定
      addCol(Math.min(a[0], b[0]) - 0.06, Math.min(a[1], b[1]) - 0.06, Math.max(a[0], b[0]) + 0.06, Math.max(a[1], b[1]) + 0.06);
    }
  };
  // 南(道路側)は長さ 130m。入口を 2 つ
  fence(PLAZA.x0, PLAZA.z1, PLAZA.x1, PLAZA.z1, 1.25, [[58, 64], [108, 114]]);
  fence(PLAZA.x0, PLAZA.z0, PLAZA.x1, PLAZA.z0, 2.1, [[60, 68]]);
  fence(PLAZA.x0, PLAZA.z0, PLAZA.x0, PLAZA.z1, 2.1, []);
  fence(PLAZA.x1, PLAZA.z0, PLAZA.x1, PLAZA.z1, 1.25, [[46, 52]]);

  // ── 車止めと低いパイプガード(赤レンガ沿い)
  for (let x = -126; x < 44; x += 2.7) {
    const col = Math.round((x + 200) / 2.7) % 2 ? 0x1c1c1e : 0xb8232a;
    if ((x > -32 && x < -26) || (x > 18 && x < 24)) continue;
    metal.pipe([x, 0.14, 3.15], [x, 1.0, 3.15], 0.04, col, 8);
    metal.pipe([x, 0.98, 3.15], [x + 2.7, 0.98, 3.15], 0.018, WHITE, 5);
    addCol(x - 0.06, 3.09, x + 2.76, 3.21);
  }

  // ── バスケットゴール(写真の赤い支柱+白いボード)
  for (const h of HOOPS) {
    const px = h.x - h.dx * 1.1, pz = h.z - h.dz * 1.1, col = 0xb0292c;
    metal.pipe([px, 0, pz], [px, 3.35, pz], 0.075, col, 10);
    metal.pipe([px, 2.8, pz], [h.x - h.dx * 0.02, 3.2, h.z - h.dz * 0.02], 0.05, col, 8);
    metal.pipe([px, 3.35, pz], [h.x - h.dx * 0.02, 3.5, h.z - h.dz * 0.02], 0.05, col, 8);
    // ベースの箱
    conc.box(px - 0.45, 0, pz - 0.45, px + 0.45, 0.35, pz + 0.45, { color: 0x9c9b95, scale: 1.2 });
    addCol(px - 0.45, pz - 0.45, px + 0.45, pz + 0.45);
    // ボード 1.8×1.05m
    const bx = h.x, bz = h.z;
    const by0 = 2.9, by1 = 3.95, bw = 0.9;
    const a = [bx + h.dz * bw, by0, bz - h.dx * bw], b = [bx - h.dz * bw, by0, bz + h.dx * bw];
    const c = [b[0], by1, b[2]], d = [a[0], by1, a[2]];
    metal.quad(a, b, c, d, [0, 0, 1, 1], 0xeeeeea);
    metal.quad(b, a, d, c, [0, 0, 1, 1], 0xd8d8d2);
    // ボードの赤い四角
    const t = 0.012;
    const box2 = (w0, w1, y0, y1) => {
      const p = (w, y) => [bx + h.dx * t + h.dz * w, y, bz + h.dz * t - h.dx * w];
      metal.quad(p(w0, y0), p(w1, y0), p(w1, y1), p(w0, y1), [0, 0, 1, 1], 0xb0292c);
    };
    box2(-0.31, -0.28, 3.0, 3.48); box2(0.28, 0.31, 3.0, 3.48); box2(-0.31, 0.31, 3.45, 3.48); box2(-0.31, 0.31, 3.0, 3.03);
    // リング
    const ring = new THREE.TorusGeometry(0.23, 0.012, 6, 20); ring.rotateX(Math.PI / 2);
    const rx = bx + h.dx * 0.28, rz = bz + h.dz * 0.28;
    metal.add(ring, new THREE.Matrix4().makeTranslation(rx, 3.05, rz), 0xd14a23);
    // ネット(細線)
    for (let k = 0; k < 12; k++) {
      const an = (k / 12) * 6.283, an2 = ((k + 2) / 12) * 6.283;
      wire.pipe([rx + Math.cos(an) * 0.23, 3.05, rz + Math.sin(an) * 0.23], [rx + Math.cos(an2) * 0.14, 2.68, rz + Math.sin(an2) * 0.14], 0.0045, 0xd8d8d0, 3);
    }
    h.rim = { x: rx, y: 3.05, z: rz };
  }

  // ── 自転車の列(赤レンガの歩道に山ほど)
  const bg = bikeGeometry();
  const spots = [];
  for (let x = -120; x < 40; x += 0.95 + R() * 0.5) { if ((x > -32 && x < -26) || (x > 18 && x < 24) || R() < 0.12) continue; spots.push([x, -0.6 + R() * 0.4, Math.PI / 2 + (R() - 0.5) * 0.3]); }
  for (let x = 28; x < 44; x += 0.8 + R() * 0.8) spots.push([x, 20.5, -Math.PI / 2 + (R() - 0.5) * 0.3]);
  for (let z = 26; z < 76; z += 1 + R()) spots.push([-90.6 + (R() - 0.5) * 0.4, z, (R() - 0.5) * 0.4 + (R() < 0.5 ? 0 : Math.PI)]); // 路地の壁際
  for (let z = -100; z < 60; z += 7 + R() * 8) spots.push([-131, z, R() * 0.5 + Math.PI]);
  for (let z = -100; z < 60; z += 9 + R() * 8) spots.push([-147, z, R() * 0.5]);
  const bikeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 });
  const bikes = new THREE.InstancedMesh(bg, bikeMat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), lean = 0.09;
  const bikeCols = [0xc7c8c6, 0x3d4a66, 0x7a1f24, 0x2c5b3d, 0xd5d2c8, 0x24262a, 0x8c9198, 0x455a75];
  const col = new THREE.Color();
  spots.forEach((s, i) => {
    const ground = s[1] > 18 && s[1] < 22 ? 0.14 : s[1] > -3 && s[1] < 3 ? 0.14 : s[0] < -128 ? 0.14 : 0;
    e.set(lean, s[2], 0, 'YXZ'); q.setFromEuler(e);
    m.compose(new THREE.Vector3(s[0], ground, s[1]), q, one);
    bikes.setMatrixAt(i, m); bikes.setColorAt(i, col.set(bikeCols[R() * bikeCols.length | 0]));
    addCol(s[0] - 0.35, s[1] - 0.35, s[0] + 0.35, s[1] + 0.35, 'soft');
  });
  bikes.castShadow = true; bikes.receiveShadow = true;
  scene.add(bikes);

  // ── 駐車中の車
  const carMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  // 窓だけ鏡面にして空を映す。車体色を掛ける前の頂点色で窓を見分ける(青みのある暗色は窓の色だけ)
  carMat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vGlass;')
      .replace('#include <common>', '#include <common>\nvarying float vCarY; varying float vCarX;')
      .replace('#include <color_vertex>', 'vGlass = (color.b > color.r * 1.4 && color.b < 0.25) ? 1.0 : 0.0;\nvCarY = position.y; vCarX = position.x;\n#include <color_vertex>');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlass; varying float vCarY; varying float vCarX;')
      // 金属の反射色は下地の色で決まるので、暗い下地のままだと空も暗く映る
      // 塗装は下回りほど泥で沈む
      .replace('#include <color_fragment>', `#include <color_fragment>
float carDirt = 0.32 * (1.0 - smoothstep(0.32, 0.95, vCarY));
float carStreak = 0.5 + 0.5 * sin(vCarX * 23.0 + sin(vCarX * 7.0) * 3.0);
diffuseColor.rgb *= 1.0 - carDirt * (0.75 + carStreak * 0.25);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.34, 0.38), vGlass);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.05, vGlass);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, vGlass);');
  };
  carMat.customProgramCacheKey = () => 'akiba-car';
  const park = {
    // 色は写真の路上から拾った幅。白に偏らせず、停め方も少しずつずらす
    sedan: [[-6, 15.6, 0.03, 0xb9bdc2], [6, 15.7, -0.02, 0x7d2a2a], [18, 15.5, 0.05, 0x23304a], [-30, 15.6, -0.04, 0x7a8590], [-54, 15.6, 0.02, 0xe9e9e6], [-40, 14.9, 0.5, 0x2a2d31], [0, 15.5, 0.03, 0xe6e6e2], [-14, 15.6, -0.03, 0x4a4d52], [-64, 15.5, 0.04, 0xb9bdc2],
      ...Array.from({ length: 14 }, (_, i) => [15 + R() * 46, -128 - (i % 6) * 16, Math.PI / 2 + (R() - 0.5) * 0.05, [0xe9e9e6, 0xc3c7cc, 0x444a52, 0x8a2f32, 0x1e3250][R() * 5 | 0]])],
    van: [[-18, 15.7, 0, 0xb9bdc2], [-70, 8, 0, 0xe4e4e0], [78, -60, Math.PI / 2, 0x4a4d52], [78, -24, Math.PI / 2, 0xe0e2e0], [40 + 15, -150, Math.PI / 2, 0x23304a]],
    truck: [[-46, 7.5, Math.PI, 0xe8e8e2], [82, -96, Math.PI / 2, 0x3f79c4], [74, -125, Math.PI / 2, 0x4a4d52]],
  };
  const movingPool = [];
  for (const kind of ['sedan', 'van', 'truck']) {
    const geo = carGeometry(kind), list = park[kind];
    const movingN = kind === 'sedan' ? 8 : kind === 'van' ? 4 : 3;
    const inst = new THREE.InstancedMesh(geo, carMat, list.length);
    list.forEach((c, i) => {
      e.set(0, c[2], 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(c[0], 0, c[1]), q, one);
      inst.setMatrixAt(i, m); inst.setColorAt(i, col.set(c[3]));
      const hw = kind === 'truck' ? 3.2 : 2.45, hd = 1.1;
      const sw = Math.abs(Math.sin(c[2])) > 0.5;
      addCol(c[0] - (sw ? hd : hw), c[1] - (sw ? hw : hd), c[0] + (sw ? hd : hw), c[1] + (sw ? hw : hd));
    });
    inst.castShadow = true; inst.receiveShadow = true;
    scene.add(inst);
    const mover = new THREE.InstancedMesh(geo, carMat, movingN);
    mover.frustumCulled = false; mover.castShadow = false;
    for (let i = 0; i < movingN; i++) movingPool.push({ mover, i, kind, color: [0xe9e9e6, 0xc3c7cc, 0x444a52, 0x8a2f32, 0x1e3250, 0x2c6b4c][R() * 6 | 0], lane: R() < 0.5 ? 0 : 1, s: R() * 620, speed: 9 + R() * 4.5 });
    scene.add(mover);
  }
  // 接地の影(動く車の下の暗がり。平面影板 1 枚を共有)
  const blobC = document.createElement('canvas'); blobC.width = blobC.height = 64;
  const bg2 = blobC.getContext('2d'), gr = bg2.createRadialGradient(32, 32, 6, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  bg2.fillStyle = gr; bg2.fillRect(0, 0, 64, 64);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
  const carShadows = new THREE.InstancedMesh(blobGeo, blobMat, movingPool.length);
  carShadows.frustumCulled = false; scene.add(carShadows);
  // 駐車中の車の下の暗がり(静的な影だけだと日陰で車が浮く)
  const parkedAll = Object.entries(park).flatMap(([kind, list]) => list.map((c) => [kind, c]));
  const parkedShadows = new THREE.InstancedMesh(blobGeo, blobMat, parkedAll.length);
  parkedAll.forEach(([kind, c], i) => {
    e.set(0, c[2], 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(c[0], 0.03, c[1]), q, new THREE.Vector3(kind === 'truck' ? 6.8 : 5.4, 1, 2.6));
    parkedShadows.setMatrixAt(i, m);
  });
  parkedShadows.frustumCulled = false; scene.add(parkedShadows);

  const updateCars = (dt, reduced) => {
    const L = 620, sc = new THREE.Vector3(), pos = new THREE.Vector3();
    movingPool.forEach((c, idx) => {
      if (!reduced) c.s = (c.s + c.speed * dt) % L;
      const northbound = c.lane === 1;
      const x = northbound ? -142.3 : -135.6; // 左側通行: 南行きは東寄り
      const z = northbound ? 320 - c.s : -300 + c.s;
      const yaw = northbound ? Math.PI / 2 : -Math.PI / 2;
      e.set(0, yaw, 0); q.setFromEuler(e);
      m.compose(pos.set(x, 0, z), q, one);
      c.mover.setMatrixAt(c.i, m); c.mover.setColorAt(c.i, col.set(c.color));
      c.mover.instanceMatrix.needsUpdate = true; if (c.mover.instanceColor) c.mover.instanceColor.needsUpdate = true;
      m.compose(pos.set(x, 0.03, z), q, sc.set(c.kind === 'truck' ? 6.8 : 5.4, 1, 2.6));
      carShadows.setMatrixAt(idx, m);
    });
    carShadows.instanceMatrix.needsUpdate = true;
  };
  updateCars(0, true);

  // ── 自販機(写真に映る、コートを眺める定番)
  const vm = (x, z, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const P = (u, y, d) => [x + c * u + s * d, y, z - s * u + c * d];
    const W = 0.6, D = 0.38, H = 1.85;
    sign.quad(P(-W, 0.05, D), P(W, 0.05, D), P(W, H, D), P(-W, H, D), atlas.uv.vending);
    const col2 = 0xc8ccd0;
    metal.quad(P(W, 0, D), P(W, 0, -D), P(W, H, -D), P(W, H, D), [0, 0, 1, 1], col2);
    metal.quad(P(-W, 0, -D), P(-W, 0, D), P(-W, H, D), P(-W, H, -D), [0, 0, 1, 1], col2);
    metal.quad(P(-W, H, D), P(W, H, D), P(W, H, -D), P(-W, H, -D), [0, 0, 1, 1], 0x7f8388);
    metal.quad(P(W, 0, -D), P(-W, 0, -D), P(-W, H, -D), P(W, H, -D), [0, 0, 1, 1], 0x9c9fa3);
    addCol(x - 0.7, z - 0.7, x + 0.7, z + 0.7);
  };
  vm(-20, -4.3, 0); vm(-18.7, -4.3, 0); vm(30, 20.8, Math.PI); vm(-84, 44, Math.PI / 2); vm(36, -102.5, 0);
  // ゴミ箱
  for (const [x, z] of [[-16.5, -4.3], [-34, -5.5], [28, -5.5]]) {
    metal.add(new THREE.CylinderGeometry(0.3, 0.27, 0.8, 10), new THREE.Matrix4().makeTranslation(x, 0.4, z), 0x5b6a78);
    addCol(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
  }

  // ── 献血バス(広場の東の道路脇。回想に出てくるが、停車位置は推定)
  {
    const X0 = 46.2, X1 = 48.7, Z0 = -73, Z1 = -63, white = 0xe9e8e2;
    metal.box(X0, 0.5, Z0, X1, 3.1, Z1, { color: white });
    metal.box(X0 - 0.04, 1.75, Z0 + 0.5, X1 + 0.04, 2.55, Z1 - 0.5, { color: 0x20262c });
    metal.box(X0 + 0.15, 1.45, Z0 - 0.04, X1 - 0.15, 2.7, Z0 + 0.2, { color: 0x20262c }); // 前面の窓
    metal.box(X0 - 0.04, 0.95, Z0 - 0.04, X1 + 0.04, 1.1, Z1 + 0.04, { color: 0xc8202c });
    metal.box(X0 + 0.12, 0.24, Z0 + 0.4, X1 - 0.12, 0.52, Z1 - 0.4, { color: 0x24262a }); // 床下
    // 車輪は蓋付きの円柱(pipe は筒抜けで輪に見える)
    const tire = new THREE.CylinderGeometry(0.44, 0.44, 0.3, 10).rotateZ(Math.PI / 2);
    for (const z of [Z0 + 2.2, Z1 - 2.2]) for (const x of [X0 + 0.13, X1 - 0.13]) metal.add(tire, new THREE.Matrix4().makeTranslation(x, 0.44, z), 0x1c1c1e);
    sign.quad([X1 + 0.03, 1.15, Z1 - 2], [X1 + 0.03, 1.15, Z0 + 2], [X1 + 0.03, 1.72, Z0 + 2], [X1 + 0.03, 1.72, Z1 - 2], atlas.uv.kenketsuBus);
    sign.quad([X0 - 0.03, 1.15, Z0 + 2], [X0 - 0.03, 1.15, Z1 - 2], [X0 - 0.03, 1.72, Z1 - 2], [X0 - 0.03, 1.72, Z0 + 2], atlas.uv.kenketsuBus);
    addCol(X0, Z0, X1, Z1);
  }

  // ── 広場の横断幕・案内板
  const banner =(x0, x1, z, y0, y1, k) => {
    sign.quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], atlas.uv[k]);
    sign.quad([x0, y0, z + 0.01], [x1, y0, z + 0.01], [x1, y1, z + 0.01], [x0, y1, z + 0.01], atlas.uv.frame);
  };
  // 写真の奥の黄色い横断幕(北西の柵)
  const bz = PLAZA.z0 + 0.05;
  sign.quad([-44, 0.7, bz], [-18, 0.7, bz], [-18, 2.1, bz], [-44, 2.1, bz], atlas.uv.banner);
  void banner;
  // 案内板
  const ibx = 16, ibz = -4.2;
  metal.pipe([ibx - 1, 0, ibz], [ibx - 1, 2.3, ibz], 0.03, WHITE); metal.pipe([ibx + 1, 0, ibz], [ibx + 1, 2.3, ibz], 0.03, WHITE);
  sign.quad([ibx - 1.2, 0.6, ibz + 0.03], [ibx + 1.2, 0.6, ibz + 0.03], [ibx + 1.2, 2.4, ibz + 0.03], [ibx - 1.2, 2.4, ibz + 0.03], atlas.uv.court);

  // ── 植栽(コンクリートの植え桝+低木と中木)
  const leafQuads = new Batch();
  // 樹冠は 1 個の球でなく、枝先の房を集めて作る。隙間から空が抜け、輪郭がでこぼこになる
  const crown = (x, y, z, r, n, tint = 0xffffff) => {
    const lobes = Math.max(3, Math.round(n / 14));
    const perLobe = Math.ceil(n / lobes);
    for (let l = 0; l < lobes; l++) {
      const a0 = R() * 6.283, b0 = Math.acos(1 - 1.6 * R()), sh = r * (0.45 + R() * 0.32);
      const lx = x + Math.cos(a0) * Math.sin(b0) * sh, ly = y + Math.cos(b0) * sh * 0.86, lz = z + Math.sin(a0) * Math.sin(b0) * sh;
      const lr = r * (0.32 + R() * 0.2);
      for (let i = 0; i < perLobe; i++) {
        const a = R() * 6.283, b = Math.acos(2 * R() - 1), rr = lr * Math.cbrt(R());
        const cx = lx + Math.cos(a) * Math.sin(b) * rr, cy = ly + Math.cos(b) * rr * 0.8, cz = lz + Math.sin(a) * Math.sin(b) * rr;
        const s = lr * (0.6 + R() * 0.42);
        const ax = R() * 6.283, c = Math.cos(ax) * s, d = Math.sin(ax) * s, up = s * (0.6 + R() * 0.4), tilt = (R() - 0.5) * s;
        // 房の外側かつ上ほど明るく、樹冠の内側と下は沈める
        const up01 = THREE.MathUtils.clamp((cy - y + r) / (2 * r), 0, 1);
        const outer = THREE.MathUtils.clamp(rr / lr, 0, 1);
        const k = (0.56 + 0.86 * up01) * (0.62 + 0.55 * outer) * (0.8 + R() * 0.4);
        const col3 = new THREE.Color(tint).multiplyScalar(k);
        col3.r *= 0.92 + up01 * 0.2 + R() * 0.1; col3.b *= 0.92 - up01 * 0.2;
        leafQuads.quad([cx - c, cy - up + tilt, cz - d], [cx + c, cy - up - tilt, cz + d], [cx + c, cy + up - tilt, cz + d], [cx - c, cy + up + tilt, cz - d], [0, 0, 1, 1], col3);
        // カードごとの向きでなく樹冠の丸みで光らせる(面法線のままだと絵の具のまだらに見える)
        const nv = new THREE.Vector3(cx - x, (cy - y) * 1.1, cz - z).normalize();
        const N = leafQuads.n, q0 = N.length - 12;
        for (let v = 0; v < 4; v++) { N[q0 + v * 3] = nv.x; N[q0 + v * 3 + 1] = nv.y; N[q0 + v * 3 + 2] = nv.z; }
      }
    }
  };
  const tree = (x, z, H = 5.5, r = 2.1, y0 = 0) => {
    metal.pipe([x, y0, z], [x + 0.08, y0 + H * 0.68, z - 0.06], 0.1, 0x4d4036, 7);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; metal.pipe([x + 0.08, y0 + H * 0.55, z - 0.06], [x + Math.cos(a) * r * 0.62, y0 + H * 0.76, z + Math.sin(a) * r * 0.62], 0.045, 0x4d4036, 5); }
    crown(x, y0 + H * 0.82, z, r, 124);
    addCol(x - 0.16, z - 0.16, x + 0.16, z + 0.16);
  };
  const planter = (x, z, w, d) => {
    conc.box(x - w / 2, 0, z - d / 2, x + w / 2, 0.55, z + d / 2, { color: 0xb9b6ac, scale: 1.8 });
    soil.box(x - w / 2 + 0.1, 0.5, z - d / 2 + 0.1, x + w / 2 - 0.1, 0.56, z + d / 2 - 0.1, { color: 0x3b3225 });
    addCol(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  };
  for (const [x, z] of [[-78, -101], [-58, -101], [-36, -101], [-14, -101], [8, -101], [30, -101], [-87, -80], [-87, -52], [-87, -36], [-87, -12], [-87, -66], [-68, -101], [-47, -101], [19, -101]]) {
    planter(x, z, 3.6, 1.1); crown(x, 1.2, z, 0.95, 42); tree(x + (R() - 0.5), z, 5.2 + R() * 1.6, 2.5 + R() * 0.7, 0.5);
  }
  for (const [x, z, w] of [[-34, -7, 2.8], [-5, -7, 3.2]]) { planter(x, z, w, 1.1); crown(x, 1.25, z, 1.1, 50); }
  // 通りの街路樹(中央通り)
  for (let z = -270; z < 300; z += 32) { if (Math.abs(z - 65) > 24) tree(-131, z + 6, 7.6, 3.2, 0.14); }

  // ── 市場跡地の周りの工事塀と、街区の端を閉じる仮囲い
  const hoard = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0);
    conc.quad([x0, 0, z0], [x1, 0, z1], [x1, 2.8, z1], [x0, 2.8, z0], [0, 0, L / 2.5, 1.1], 0xc7c5bb);
    conc.quad([x1, 0, z1], [x0, 0, z0], [x0, 2.8, z0], [x1, 2.8, z1], [0, 0, L / 2.5, 1.1], 0xa8a69d);
  };
  hoard(-92, BOUNDS.z0 - 0.5, 96, BOUNDS.z0 - 0.5);
  // 歩道だけ塀で閉じ、車道には工事のコーンを並べる(車は通り抜ける)
  for (const z of [BOUNDS.z0 - 0.5, BOUNDS.z1 + 0.5]) {
    hoard(-150, z, -146, z); hoard(-132, z, -128, z);
    const cone = new THREE.ConeGeometry(0.16, 0.7, 8);
    for (let x = -145.4; x < -132; x += 1.5) metal.add(cone, new THREE.Matrix4().makeTranslation(x, 0.35, z), 0xd5521c);
    metal.pipe([-146, 0.72, z], [-132, 0.72, z], 0.025, 0xd8d6c8);
  }

  // ── 電柱と電線(裏の通り)
  const pole = (x, z) => { metal.pipe([x, 0, z], [x, 10, z], 0.14, 0x94938b, 8); metal.pipe([x - 1, 9.2, z], [x + 1, 9.2, z], 0.05, 0x5a5a54); metal.add(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10), new THREE.Matrix4().makeTranslation(x + 0.4, 8.2, z), 0x9fa39f); addCol(x - 0.16, z - 0.16, x + 0.16, z + 0.16); return [x, z]; };
  const poles = [[-120, 74], [-90, 74], [-58, 74], [-22, 74], [14, 74], [40, 74]].map(([x, z]) => pole(x, z));
  for (let i = 0; i < poles.length - 1; i++) {
    const [a, b] = [poles[i], poles[i + 1]];
    for (const off of [-0.8, 0, 0.8]) {
      const seg = 8, sag = 0.5;
      for (let s = 0; s < seg; s++) {
        const t0 = s / seg, t1 = (s + 1) / seg, y = (t) => 9.2 - sag * 4 * t * (1 - t);
        wire.pipe([a[0] + (b[0] - a[0]) * t0 + off, y(t0), a[1]], [a[0] + (b[0] - a[0]) * t1 + off, y(t1), b[1]], 0.012, 0x222222, 3);
      }
    }
  }
  // 市場跡地の変圧器付き電柱(写真 2 枚目)
  const trans = pole(10, -116); void trans;

  scene.add(metal.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide })));
  scene.add(wire.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { receive: false }));
  scene.add(mesh.mesh(new THREE.MeshStandardMaterial({ map: meshTexture(), alphaTest: 0.32, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }), { receive: false }));
  scene.add(sign.mesh(new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.48, side: THREE.DoubleSide }), { receive: true }));
  const concMat = new THREE.MeshStandardMaterial({ map: tex.slab.diff, normalMap: tex.slab.nor, roughnessMap: tex.slab.arm, vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  scene.add(conc.mesh(concMat));
  scene.add(soil.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { cast: false }));
  // 樹冠(裏から透けないよう両面、光の透過を弱い emissive で擬似)
  const lt = leafTexture();
  const leaves = leafQuads.mesh(new THREE.MeshStandardMaterial({ map: lt, alphaTest: 0.4, vertexColors: true, roughness: 0.72, side: THREE.DoubleSide }), { cast: true, receive: true });
  scene.add(leaves);
  return { updateCars };
}
