// 地面: 実写アスファルトの上に、線やコートの塗装を「キャンバスのマスク」で乗せる。
// 塗装は写真どおり、舗装の地肌が透けてかすれる(シェーダで摩耗させる)。
import * as THREE from 'three';
import { Batch, rng } from './batch.js';
import { WALKS, FLAT, PLAZA, BIG_COURT, ROUND_COURT, CHUO, B } from './layout.js';

const WORLD = { x0: -470, x1: 350, z0: -360, z1: 340 };
const PATCH = { x0: -100, x1: 50, z0: -110, z1: 25 }; // 広場まわりの高精細領域

function painter(rect, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const sx = size / (rect.x1 - rect.x0), sz = size / (rect.z1 - rect.z0);
  g.setTransform(sx, 0, 0, sz, -rect.x0 * sx, -rect.z0 * sz);
  return { c, g, sx };
}

function line(g, x0, z0, x1, z1, w, color, dash) {
  g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'butt';
  if (dash) g.setLineDash(dash);
  g.beginPath(); g.moveTo(x0, z0); g.lineTo(x1, z1); g.stroke(); g.restore();
}
function crosswalk(g, x0, z0, x1, z1, alongX) {
  g.fillStyle = 'rgba(232,230,220,1)';
  if (alongX) for (let z = z0; z < z1; z += 1.0) g.fillRect(x0, z, x1 - x0, 0.5);
  else for (let x = x0; x < x1; x += 1.0) g.fillRect(x, z0, 0.5, z1 - z0);
}

function paintPlaza(g) {
  const WHITE = 'rgba(232,230,220,1)';
  // 広場の地肌は暗いアスファルト(当時の写真どおり。明るいと石畳に見える)
  g.fillStyle = 'rgba(80,83,86,0.85)'; g.fillRect(PLAZA.x0, PLAZA.z0, PLAZA.x1 - PLAZA.x0, PLAZA.z1 - PLAZA.z0); // 写真の下地は暗く色味が無い。塗装の焼けで茶へ寄る分を見込む
  // ─ 大コート: 黄の外周 → 青の競技面 → 淡い青の線 → サーモンの円
  const C = BIG_COURT;
  g.fillStyle = 'rgb(205,168,74)'; g.beginPath(); g.ellipse(C.x, C.z, C.ya, C.yb, 0, 0, 7); g.fill();
  g.fillStyle = 'rgb(88,128,186)'; g.beginPath(); g.ellipse(C.x, C.z, C.a + 2.5, C.b + 1.5, 0, 0, 7); g.fill();
  const lc = 'rgb(150,178,216)';
  line(g, C.x, C.z - C.b - 1, C.x, C.z + C.b + 1, 0.14, lc);
  g.strokeStyle = lc; g.lineWidth = 0.14;
  g.beginPath(); g.arc(C.x, C.z, 1.8, 0, 7); g.stroke();
  for (const s of [-1, 1]) {
    const hx = C.x + s * 26;
    // スリーポイントの弧(写真の大きな弧)とキー
    g.beginPath(); g.arc(hx - s * 1.6, C.z, 8.2, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke();
    g.strokeRect(s > 0 ? hx - 6 : hx, C.z - 2.45, 6, 4.9);
    g.beginPath(); g.arc(hx - s * 6, C.z, 1.8, 0, 7); g.stroke();
  }
  // サーモンの丸(写真の手前と奥の丸)
  g.fillStyle = 'rgb(200,120,104)';
  for (const [dx, dz] of [[-8, 14], [15, -14], [-20, -9]]) { g.beginPath(); g.ellipse(C.x + dx, C.z + dz, 3.2, 2.1, 0, 0, 7); g.fill(); }
  // ─ 円形コート
  const O = ROUND_COURT;
  g.fillStyle = 'rgb(206,92,116)'; g.beginPath(); g.arc(O.x, O.z, O.r + 0.9, 0, 7); g.fill();
  g.fillStyle = 'rgb(232,226,220)'; g.beginPath(); g.arc(O.x, O.z, O.r + 0.28, 0, 7); g.fill();
  g.fillStyle = 'rgb(90,142,190)'; g.beginPath(); g.arc(O.x, O.z, O.r, 0, 7); g.fill();
  g.fillStyle = 'rgb(182,110,132)'; g.beginPath(); g.ellipse(O.x - 9, O.z, 3.3, 3.3, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(220,226,232,0.9)'; g.lineWidth = 0.1; g.beginPath(); g.arc(O.x - 15.6 + 1.6, O.z, 7, -Math.PI / 2, Math.PI / 2); g.stroke();
  // ─ 緑の面
  g.fillStyle = 'rgb(92,142,108)';
  g.beginPath(); g.moveTo(-54, -7); g.lineTo(-26, -7); g.lineTo(-18, -13); g.lineTo(-34, -20); g.lineTo(-50, -12); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(10, -92); g.lineTo(30, -96); g.lineTo(34, -84); g.lineTo(18, -82); g.closePath(); g.fill();
  // ─ 塗装の傷み。踏まれて剥げた所、靴とボールの黒ずみ、ゴール下の擦れ
  const W0 = rng(21);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  // 剥げは大きな丸にすると染みに見えるので、小さな欠けを群れで置く
  for (let i = 0; i < 70; i++) {
    const a = W0() * 6.28, r = Math.sqrt(W0()), cx = C.x + Math.cos(a) * r * C.ya, cz = C.z + Math.sin(a) * r * C.yb;
    const n = 6 + W0() * 22, sp = 0.3 + W0() * 1.6, al = 0.12 + W0() * 0.3;
    for (let k = 0; k < n; k++) {
      g.fillStyle = `rgba(0,0,0,${al})`;
      g.beginPath(); g.ellipse(cx + (W0() - 0.5) * sp * 2, cz + (W0() - 0.5) * sp, 0.03 + W0() * 0.16, 0.02 + W0() * 0.08, W0() * 3, 0, 7); g.fill();
    }
  }
  // 緑の面も同じように欠けさせる(ベタ塗りに見えないように)
  for (let i = 0; i < 26; i++) {
    const cx = -50 + W0() * 30, cz = -19 + W0() * 12, n = 8 + W0() * 20, sp = 0.4 + W0() * 1.8, al = 0.14 + W0() * 0.3;
    for (let k = 0; k < n; k++) {
      g.fillStyle = `rgba(0,0,0,${al})`;
      g.beginPath(); g.ellipse(cx + (W0() - 0.5) * sp * 2, cz + (W0() - 0.5) * sp, 0.03 + W0() * 0.18, 0.02 + W0() * 0.09, W0() * 3, 0, 7); g.fill();
    }
  }
  g.restore();
  // 踏みつぶされたガムと吸い殻の黒い点。目線の高さで手前の面に粒が要る
  for (let i = 0; i < 2600; i++) {
    const r = 0.035 + W0() * W0() * 0.075;
    g.fillStyle = `rgba(20,19,17,${0.14 + W0() * 0.34})`;
    g.beginPath(); g.ellipse(PLAZA.x0 + W0() * (PLAZA.x1 - PLAZA.x0), PLAZA.z0 + W0() * (PLAZA.z1 - PLAZA.z0), r, r * (0.6 + W0() * 0.4), W0() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 260; i++) {
    const a = W0() * 6.28, r = Math.sqrt(W0()), x = C.x + Math.cos(a) * r * C.ya, z = C.z + Math.sin(a) * r * C.yb;
    g.strokeStyle = `rgba(38,34,28,${0.05 + W0() * 0.16})`; g.lineWidth = 0.03 + W0() * 0.1;
    const t = W0() * 6.28, l = 0.4 + W0() * 2.6;
    g.beginPath(); g.moveTo(x, z); g.quadraticCurveTo(x + Math.cos(t) * l * 0.5 + W0() - 0.5, z + Math.sin(t) * l * 0.5 + W0() - 0.5, x + Math.cos(t) * l, z + Math.sin(t) * l); g.stroke();
  }
  for (const s of [-1, 1]) {
    const gr = g.createRadialGradient(C.x + s * 22, C.z, 0.5, C.x + s * 22, C.z, 6.5);
    gr.addColorStop(0, 'rgba(40,36,30,0.3)'); gr.addColorStop(1, 'rgba(40,36,30,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(C.x + s * 22, C.z, 6.5, 0, 7); g.fill();
  }
  // ─ 大きなむら(日焼けと土埃)。手前の面が一色に見えないように
  for (let i = 0; i < 90; i++) {
    const x = PLAZA.x0 + W0() * (PLAZA.x1 - PLAZA.x0), z = PLAZA.z0 + W0() * (PLAZA.z1 - PLAZA.z0), r = 2 + W0() * 11;
    const gr = g.createRadialGradient(x, z, r * 0.15, x, z, r), c = W0() < 0.6 ? '52,46,36' : '226,216,190', al = 0.05 + W0() * 0.11;
    gr.addColorStop(0, `rgba(${c},${al})`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, z, r, 0, 7); g.fill();
  }
  // ─ 駅前道路の線
  line(g, -100, 3.4, 42, 3.4, 0.14, WHITE);
  line(g, -100, 10.5, 40, 10.5, 0.14, WHITE, [3, 3]);
  // 路上駐車の白枠
  for (let x = -60; x < 28; x += 6) line(g, x, 13.4, x + 2, 17.8, 0.1, WHITE);
  line(g, -60, 13.4, 28, 13.4, 0.1, WHITE);
  crosswalk(g, -92, 3.4, -84, 18, true);
  crosswalk(g, 26, 3.4, 37, 18, true);
  line(g, 45.2, -100, 45.2, 3.4, 0.14, WHITE);
  line(g, 53, -100, 53, 3, 0.14, WHITE, [3, 3]);
  crosswalk(g, 44, -6, 62, 0, false);
  // 乾いたオイルのしみ・補修跡
  const R = rng(9);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(25,25,28,${0.08 + R() * 0.16})`;
    g.beginPath(); g.ellipse(-90 + R() * 130, 4 + R() * 14, 0.3 + R() * 0.8, 0.2 + R() * 0.4, R(), 0, 7); g.fill();
  }
  // ひび: 塗装の上に 1 本ずつ描く。素材のひびと違って周期が無い
  const crack = (x, z, heading, steps, width) => {
    g.strokeStyle = `rgba(22,20,17,${0.35 + R() * 0.3})`; g.lineWidth = width; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x, z);
    for (let s = 0; s < steps; s++) {
      heading += (R() - 0.5) * 0.9;
      x += Math.cos(heading) * (0.25 + R() * 0.45); z += Math.sin(heading) * (0.25 + R() * 0.45);
      g.lineTo(x, z);
      if (R() < 0.05 && width > 0.024) { g.stroke(); crack(x, z, heading + (R() < 0.5 ? 1 : -1), 6 + R() * 18 | 0, width * 0.6); g.strokeStyle = `rgba(22,20,17,${0.45 + R() * 0.35})`; g.lineWidth = width; g.beginPath(); g.moveTo(x, z); }
    }
    g.stroke();
  };
  for (let i = 0; i < 46; i++) crack(PLAZA.x0 + R() * (PLAZA.x1 - PLAZA.x0), PLAZA.z0 + R() * (PLAZA.z1 - PLAZA.z0), R() * 6.28, 12 + R() * 60 | 0, 0.024 + R() * 0.032);
  for (let i = 0; i < 14; i++) crack(-98 + R() * 140, 4 + R() * 14, R() < 0.7 ? R() * 0.5 : 1.3 + R() * 0.5, 10 + R() * 34 | 0, 0.016 + R() * 0.024);
  // 掘り返して埋めた補修跡(直線で切れた、少し色の違う長方形)
  for (let i = 0; i < 16; i++) {
    const road = i < 9, shade = R() < 0.7 ? '24,24,26' : '150,148,142';
    g.fillStyle = `rgba(${shade},${0.08 + R() * 0.12})`;
    if (road) g.fillRect(-98 + R() * 130, 4 + R() * 12, 2 + R() * 9, 0.8 + R() * 2.4);
    else g.fillRect(-88 + R() * 124, -102 + R() * 96, 1.5 + R() * 7, 1 + R() * 4);
  }
}

// 壁際の接地の暗がり(AO を切っても建物が地面から浮かないよう、塗装マスクに焼く)
function paintContact(g) {
  g.save();
  for (const b of B) {
    for (const [w, a] of [[3.2, 0.1], [1.7, 0.14], [0.7, 0.2]]) {
      g.strokeStyle = `rgba(12,12,14,${a})`; g.lineWidth = w;
      g.strokeRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
    }
  }
  g.restore();
}

function paintWorld(g) {
  paintContact(g);
  const WHITE = 'rgba(232,230,220,1)';
  const YEL = 'rgba(216,178,60,1)';
  // 中央通り: 3 車線+中央線
  const cx = (CHUO.x0 + CHUO.x1) / 2;
  line(g, cx, CHUO.z0, cx, CHUO.z1, 0.3, YEL);
  for (const o of [-4.2, 4.2]) line(g, cx + o, CHUO.z0, cx + o, CHUO.z1, 0.2, WHITE, [5, 5]);
  line(g, CHUO.x0 + 0.5, CHUO.z0, CHUO.x0 + 0.5, CHUO.z1, 0.18, WHITE);
  line(g, CHUO.x1 - 0.5, CHUO.z0, CHUO.x1 - 0.5, CHUO.z1, 0.18, WHITE);
  // 交差点の横断歩道
  crosswalk(g, CHUO.x0, 2, CHUO.x1, 8, false);
  crosswalk(g, CHUO.x0, 74, CHUO.x1, 80, false);
  crosswalk(g, CHUO.x0, -118, CHUO.x1, -112, false);
  // 南の通り
  line(g, -128, 75, 44, 75, 0.15, WHITE, [3, 3]);
  // 暫定駐車場の白枠(写真 2 枚目)
  const pz0 = -214, pz1 = -124;
  for (let z = pz0; z < pz1; z += 16) for (let x = 12; x < 62; x += 2.6) line(g, x, z, x, z + 5.2, 0.12, WHITE);
  // 市場跡地: 水たまり跡・補修
  const R = rng(5);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(30,30,32,${0.3 + R() * 0.4})`;
    g.beginPath(); g.ellipse(-85 + R() * 88, -215 + R() * 90, 1 + R() * 5, 0.6 + R() * 2.2, R() * 3, 0, 7); g.fill();
  }
}

const PAINT_PARS = /* glsl */`
uniform sampler2D tPaint, tDetail; uniform vec4 uRect; varying vec3 vWorldP;
`;
const PAINT_FRAG = /* glsl */`
#include <map_fragment>
// 素材の大きな明暗むらがタイル周期の格子に見えるので、低周波を割って細かい粒だけ残す
float texMean = dot(texture2D(map, vMapUv, 12.0).rgb, vec3(0.33));
diffuseColor.rgb *= texMean / max(dot(texture2D(map, vMapUv, 5.0).rgb, vec3(0.33)), 0.02);
// ミップを上げて素材のひびを消す(そのまま拡大すると 77m 周期の巨大なひびに見える)
// バイアス指定だとかすめ角で高精細のミップが選ばれてひびが透けるので、LOD を固定する
float big = dot(textureLod(tDetail, vWorldP.xz * 0.013, 7.0).rgb, vec3(0.33));
float mid = dot(textureLod(tDetail, vWorldP.xz * 0.11, 6.0).rgb, vec3(0.33));
float fine = dot(texture2D(tDetail, vWorldP.xz * 0.83, 1.0).rgb, vec3(0.33));
// 舗装のタイル周期を崩す: 回した同じ舗装を大きなむらで混ぜる
vec2 altUv = vWorldP.zx * 0.19 + 0.37;
vec3 alt = diffuse * texture2D(map, altUv).rgb * texMean / max(dot(texture2D(map, altUv, 5.0).rgb, vec3(0.33)), 0.02);
diffuseColor.rgb = mix(diffuseColor.rgb, alt, smoothstep(0.42, 0.56, big + (mid - 0.5) * 0.35));
diffuseColor.rgb *= mix(0.78, 1.22, big) * mix(0.88, 1.12, mid);
// 塗り分けの縁は直線で切れない。参照位置を数 cm 揺らして擦れた境界にする
vec2 wob = (vec2(fine, mid) - 0.5) * 0.28;
vec2 pUv = (vWorldP.xz + wob - uRect.xy) / uRect.zw; pUv.y = 1.0 - pUv.y;
vec4 pc = texture2D(tPaint, pUv);
float wear = smoothstep(0.26, 0.62, mid + (big - 0.5) * 0.6 + 0.22);
float grain = dot(diffuseColor.rgb, vec3(0.33));
// 塗装は日に焼けて彩度が落ち、粒の凹みに土埃が溜まる。よく踏まれる所は下地が透ける
vec3 paintC = pc.rgb * mix(0.68, 1.1, grain * 2.2);
// 骨材の粒。近くで塗装が一枚の板に見えないよう、回転した細かい参照を重ねる
paintC *= mix(0.8, 1.14, dot(texture2D(tDetail, vWorldP.zx * 2.3 + 0.61).rgb, vec3(0.33)) * 2.0);
paintC = mix(vec3(dot(paintC, vec3(0.3, 0.59, 0.11))), paintC, 0.9);
paintC *= mix(vec3(0.74, 0.71, 0.66), vec3(1.0), smoothstep(0.3, 0.62, big + mid * 0.5));
diffuseColor.rgb = mix(diffuseColor.rgb, paintC, pc.a * mix(0.4, 0.95, wear));
`;

function paintMaterial(tex, paintTex, rect, detail) {
  const m = new THREE.MeshStandardMaterial({
    map: tex.asphalt.diff, normalMap: tex.asphalt.nor, roughness: 0.93, normalScale: new THREE.Vector2(0.35, 0.35), color: new THREE.Color(0.74, 0.73, 0.71),
  });
  m.userData.ground = true;
  const uRect = { value: new THREE.Vector4(rect.x0, rect.z0, rect.x1 - rect.x0, rect.z1 - rect.z0) };
  m.onBeforeCompile = (s) => {
    s.uniforms.tPaint = { value: paintTex }; s.uniforms.tDetail = { value: detail }; s.uniforms.uRect = uRect;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + PAINT_PARS)
      .replace('#include <map_fragment>', PAINT_FRAG);
  };
  m.customProgramCacheKey = () => 'akiba-ground';
  return m;
}

const asTex = (c, aniso) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
};
const planeXZ = (r, y, scale) => {
  const b = new Batch();
  b.quad([r.x0, y, r.z1], [r.x1, y, r.z1], [r.x1, y, r.z0], [r.x0, y, r.z0], [r.x0 / scale, -r.z1 / scale, r.x1 / scale, -r.z0 / scale]);
  return b;
};

export function buildGround(scene, tex, aniso) {
  // 全域(低精細の塗装)。広場パッチの下は塗らない
  const W = painter(WORLD, 4096);
  paintWorld(W.g);
  const wm = paintMaterial(tex, asTex(W.c, aniso), WORLD, tex.court.diff);
  const ground = planeXZ(WORLD, 0, 3.2).mesh(wm, { cast: false });
  scene.add(ground);
  // 広場パッチ(コートの高精細)
  const P = painter(PATCH, 4096);
  paintPlaza(P.g);
  const pm = paintMaterial(tex, asTex(P.c, aniso), PATCH, tex.court.diff);
  const patch = planeXZ(PATCH, 0.015, 3.2).mesh(pm, { cast: false });
  // 上に載る面から先に描けば、下の全域地面の計算が深度で省ける
  pm.userData.ground = false; pm.userData.groundTop = true;
  scene.add(patch);

  // 歩道(段差)。縁石は別色
  const groups = {};
  const curb = new Batch();
  const H = 0.14;
  for (const w of WALKS) {
    const b = groups[w.mat] || (groups[w.mat] = new Batch());
    b.box(w.x0, 0, w.z0, w.x1, H, w.z1, { scale: w.mat === 'brick' ? 1.6 : 2.4, color: w.mat === 'brick' ? 0x8f9490 : 0xd8d6d0 });
    const e = 0.16;
    for (const [a, c] of [[[w.x0, w.z0], [w.x1, w.z0 + e]], [[w.x0, w.z1 - e], [w.x1, w.z1]], [[w.x0, w.z0], [w.x0 + e, w.z1]], [[w.x1 - e, w.z0], [w.x1, w.z1]]]) {
      curb.box(a[0], 0, a[1], c[0], H + 0.012, c[1], { scale: 1.5, color: 0xb6b5ae });
    }
  }
  const mkMat = (t, color = 0xffffff) => Object.assign(new THREE.MeshStandardMaterial({ map: t.diff, normalMap: t.nor, roughnessMap: t.arm, roughness: 1, vertexColors: true, color }), { userData: { groundTop: true } });
  if (groups.walk) scene.add(groups.walk.mesh(mkMat(tex.walk), { cast: false }));
  if (groups.brick) scene.add(groups.brick.mesh(mkMat(tex.brick), { cast: false }));
  scene.add(curb.mesh(mkMat(tex.slab), { cast: false }));

  // 段差のない舗装(荒れたコンクリート・暫定駐車場)
  const flat = new Batch(), dark = new Batch();
  for (const f of FLAT) {
    const b = f.mat === 'slab' ? flat : dark;
    b.quad([f.x0, 0.02, f.z1], [f.x1, 0.02, f.z1], [f.x1, 0.02, f.z0], [f.x0, 0.02, f.z0], [f.x0 / 4, -f.z1 / 4, f.x1 / 4, -f.z0 / 4], f.mat === 'slab' ? 0xc8c6bc : 0x77777a);
  }
  scene.add(flat.mesh(mkMat(tex.slab), { cast: false }));
  // 駐車場は線がマスクにあるので、舗装色を重ねず地面をそのまま使う
  void dark;
  // 路面の小物: マンホール
  const mh = new Batch();
  const disc = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 16);
  for (const [x, z] of [[-30, 11], [10, 8], [-110, 12], [-139, -40], [-139, 40], [-136, 120], [-60, 76], [52, -40], [-82, -98]]) {
    mh.add(disc, new THREE.Matrix4().makeTranslation(x, 0.022, z), 0x2e2c2a);
  }
  scene.add(mh.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 }), { cast: false }));
  void PLAZA;
}
