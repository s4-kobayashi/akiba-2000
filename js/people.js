// 人: 関節を計算して部品(インスタンス)に置く簡易人体。通行人・3on3・見物客・プレイヤーを同じ部品で描く。
// 影は人の形をそのまま太陽方向へ地面に潰して描く(シャドウマップを毎フレーム焼かずに、形のある影を出す)。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng } from './batch.js';
import { BIG_COURT, ROUND_COURT, HOOPS } from './layout.js';

const MAX = 60;
const LIMB_PER = 10, TORSO_PER = 3, HEAD_PER = 3, SHOE_PER = 5;

// 顔: 球の UV で正面(-z)は u=0.75。肌色に掛ける濃淡だけを描く
function faceTexture() {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), cx = W * 0.75, eq = H / 2;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const soft = (x, y, rx, ry, col) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(x, y); g.scale(rx, ry); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore();
  };
  for (const s of [-1, 1]) {
    soft(cx + s * 34, eq - 12, 30, 15, 'rgba(70,40,28,0.34)'); // 眼窩
    soft(cx + s * 44, eq + 30, 26, 22, 'rgba(190,84,70,0.16)'); // 頬の赤み
    g.fillStyle = 'rgba(240,235,228,0.95)'; g.beginPath(); g.ellipse(cx + s * 32, eq - 12, 12, 5, 0, 0, 7); g.fill(); // 白目
    g.fillStyle = 'rgba(24,16,12,1)'; g.beginPath(); g.arc(cx + s * 32, eq - 12, 5.4, 0, 7); g.fill(); // 瞳
    g.strokeStyle = 'rgba(36,24,18,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + s * 19, eq - 15); g.quadraticCurveTo(cx + s * 32, eq - 21, cx + s * 45, eq - 13); g.stroke(); // 上まぶた
    g.lineWidth = 5; g.beginPath(); g.moveTo(cx + s * 16, eq - 27); g.quadraticCurveTo(cx + s * 32, eq - 35, cx + s * 50, eq - 26); g.stroke(); // 眉
  }
  soft(cx, eq + 16, 11, 20, 'rgba(90,50,36,0.3)'); // 鼻の影
  g.strokeStyle = 'rgba(112,52,46,0.85)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx - 20, eq + 50); g.quadraticCurveTo(cx, eq + 54, cx + 20, eq + 50); g.stroke(); // 口
  soft(cx, eq + 58, 22, 9, 'rgba(90,50,36,0.22)'); // 下唇の影
  soft(cx, eq + 100, 90, 30, 'rgba(70,40,28,0.3)'); // 顎の下
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// 服のしわ: 服の色に掛ける濃淡。首元と裾を沈め、斜めのしわを入れる
function clothTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = rng(77);
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  g.filter = 'blur(6px)'; // 輪郭があるとひっかき傷に見える
  for (let i = 0; i < 26; i++) {
    const x = R() * S, y = R() * S, a = (R() < 0.5 ? 1 : -1) * (0.5 + R() * 0.8), l = 40 + R() * 80;
    g.strokeStyle = `rgba(0,0,0,${0.06 + R() * 0.1})`; g.lineWidth = 6 + R() * 12;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (R() - 0.5) * 16, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.filter = 'none';
  const edge = g.createLinearGradient(0, 0, 0, S);
  edge.addColorStop(0, 'rgba(0,0,0,0.26)'); edge.addColorStop(0.12, 'rgba(0,0,0,0)'); edge.addColorStop(0.86, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = edge; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SHIRTS = [0xe9e6dc, 0x2e4470, 0x767a80, 0x4c5a3e, 0x1f2125, 0xa23b36, 0xc7c2b0, 0x4e7aa6, 0xd9d7cf, 0x9fb4c8, 0xb8a888, 0x5e4a3a, 0x8a8f70, 0xc08a7a, 0x3a3f4a];
const PANTS = [0x25324c, 0x2b2c30, 0x4e4a3e, 0x2f3d55, 0x6b6456, 0x1a1c20, 0x3a5378, 0x8a7d62, 0x55585e];
const SKIN = [0xdcae88, 0xd29f79, 0xe2b896, 0xc99570];
const HAIR = [0x17120e, 0x241a13, 0x0f0d0c, 0x3a281a, 0x5a3a20, 0x6e4a2a];
const JERSEY = [[0xd9d9d2, 0xc23c33], [0x1a1d22, 0xe5e3da], [0xdb6f1f, 0x1c2230], [0xa7b8c9, 0x273a58], [0xe8e6dc, 0x2e4470], [0x26623f, 0xd8d6cc]];

export function createPeople(scene, shadowDir, world) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
  // 内蔵 GPU は頂点数が律速(人だけで 36 万三角形 → 約 60ms を実測)なので、本体も影も形が崩れない下限まで削る
  // カプセルは半径込みで全長 2 になるので半分に潰す(全長 1 でないと scale.y が部位の長さにならない)
  const unitCapsule = (cap, rad) => new THREE.CapsuleGeometry(0.5, 1, cap, rad).scale(1, 0.5, 1);
  const limbG = unitCapsule(1, 6);
  // 胴は肩幅から腰へ、頭は顎へ絞る(頂点を動かすだけで三角形は増えない)
  const taper = (geo, f) => {
    const a = geo.attributes.position;
    // 法線は元のまま残す(再計算すると面が角張って見える)
    for (let i = 0; i < a.count; i++) { const k = f(a.getY(i)); a.setX(i, a.getX(i) * k); a.setZ(i, a.getZ(i) * (0.5 + k * 0.5)); }
    return geo;
  };
  const torsoG = taper(new RoundedBoxGeometry(1, 1, 1, 1, 0.28), (y) => 0.8 + Math.max(0, y + 0.1) * 0.33);
  const headG = taper(new THREE.SphereGeometry(0.5, 8, 6), (y) => (y < 0 ? 1 + y * 0.45 : 1));
  // 靴・目・手を兼ねる。丸箱は 108 三角形で、目と手には過剰(実測で 2.5 万三角形を占めた)
  const shoeG = new THREE.SphereGeometry(0.5, 6, 4);
  const mk = (g, n, material = mat) => {
    const m = new THREE.InstancedMesh(g, material, n);
    m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true;
    m.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(m); return m;
  };
  const limbs = mk(limbG, MAX * LIMB_PER), torsos = mk(torsoG, MAX * TORSO_PER, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, map: clothTexture() })), heads = mk(headG, MAX * HEAD_PER), shoes = mk(shoeG, MAX * SHOE_PER);
  const faces = mk(headG, MAX, new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, map: faceTexture() }));

  // 形のある影: 同じ instanceMatrix を共有し、頂点シェーダで地面へ潰す
  const groundAttr = (n) => new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage);
  // 同じ高さに潰れた面が重なるので、1 画素 1 回だけ塗るようステンシルで止める(深度だと網目に欠ける)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x06070c, transparent: true, depthWrite: false, opacity: 0.56, toneMapped: false,
    stencilWrite: true, stencilFunc: THREE.NotEqualStencilFunc, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
  });
  const uDir = { value: shadowDir };
  shadowMat.onBeforeCompile = (s) => {
    s.uniforms.uDir = uDir;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aG; uniform vec2 uDir; varying float vLit;')
      .replace('#include <project_vertex>', `
  vec4 wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  float hh = max(wp.y - aG.x, 0.0);
  wp.xz += uDir * hh;
  wp.y = aG.x + 0.03;
  vLit = aG.y;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLit;')
      .replace('#include <dithering_fragment>', 'gl_FragColor.a *= vLit; if (vLit < 0.02) discard;\n#include <dithering_fragment>');
  };
  const shadowsOf = (src, n, lowGeo) => {
    const geo = lowGeo;
    const a = groundAttr(n);
    geo.setAttribute('aG', a);
    const sm = new THREE.InstancedMesh(geo, shadowMat, n);
    sm.instanceMatrix = src.instanceMatrix; sm.frustumCulled = false; sm.renderOrder = 1;
    scene.add(sm);
    return { sm, a };
  };
  const shL = shadowsOf(limbs, limbs.count, unitCapsule(1, 4));
  const shT = shadowsOf(torsos, torsos.count, new THREE.BoxGeometry(1, 1, 1));
  const shH = shadowsOf(heads, heads.count, new THREE.SphereGeometry(0.5, 6, 4));
  const shS = shadowsOf(shoes, shoes.count, new THREE.BoxGeometry(1, 1, 1));

  const people = [];
  const R = rng(2000);
  const addPerson = (o) => {
    const p = {
      x: 0, z: 0, yaw: 0, g: 0, phase: R() * 6.28, speed: 1.3, mode: 'idle', lit: 1, h: 0.94 + R() * 0.12,
      shirt: SHIRTS[R() * SHIRTS.length | 0], pants: PANTS[R() * PANTS.length | 0], skin: SKIN[R() * SKIN.length | 0], hair: HAIR[R() * HAIR.length | 0],
      bag: R() < 0.32, pack: R() < 0.28, longHair: R() < 0.12, poseT: 0, visible: true,
      longSleeve: R() < 0.45, bw: 0.92 + R() * 0.18, gait: 0.85 + R() * 0.3, ...o,
    };
    people.push(p); return p;
  };

  // ── 通行人: 歩道の端から端を往復
  const walkPath = (a, b, off) => addPerson({ path: [a, b], off, seg: R() < 0.5 ? 0 : 1, t: R(), speed: 1.05 + R() * 0.5, mode: 'walk', g: 0.14 });
  const routes = [
    [[-126, 20], [44, 20], 1.3], [[-126, 0], [36, 0], 0.7], [[-130, -210], [-130, 230], 1.5], [[-148, -210], [-148, 230], 1.5],
    [[-126, 80], [40, 80], 1.2],
  ];
  const counts = [6, 3, 11, 9, 5];
  routes.forEach((r, i) => { for (let k = 0; k < counts[i]; k++) walkPath(r[0], r[1], (R() - 0.5) * r[2]); });
  // 広場の東と北の歩道
  for (let k = 0; k < 3; k++) walkPath([42, -100], [42, -6], (R() - 0.5) * 0.8);
  for (let k = 0; k < 2; k++) walkPath([-88, -106], [40, -106], (R() - 0.5) * 0.8);
  // 道路を渡る人・駅前で立ち止まる人
  addPerson({ x: 38, z: 19.6, yaw: 1.9, mode: 'idle', g: 0.14, bag: true });
  addPerson({ x: 41, z: 20.4, yaw: 2.2, mode: 'idle', g: 0.14 });
  // ── コートの脇で眺める人(自販機のコーラと一緒に)
  const watchers = [[-22, -7.2, Math.PI], [-16, -8, 3.5], [-32, -9.5, 2.8], [34, -30, 1.4], [-74, -44, 0.6], [-40, -46, -0.8], [-30, -94, 2.5]];
  watchers.forEach(([x, z, yaw]) => addPerson({ x, z, yaw, mode: 'idle', bag: true }));

  // ── 3on3: 大コート 6 人+円形コート 3 人
  const makeGame = (cx, cz, rx, rz, n, hoop) => {
    const players = [];
    for (let i = 0; i < n; i++) {
      const jersey = JERSEY[i % JERSEY.length];
      const p = addPerson({ x: cx + (R() - 0.5) * rx, z: cz + (R() - 0.5) * rz, tx: cx, tz: cz, mode: 'run', shirt: jersey[0], pants: jersey[1], speed: 3 + R() * 1.6, bag: false, pack: false, game: true, h: 1 + R() * 0.08 });
      players.push(p);
    }
    return { cx, cz, rx, rz, players, carrier: 0, state: 'play', timer: 2 + R() * 3, ball: { x: cx, y: 1, z: cz, t: 0, vy: 0 }, hoop, hoopIdx: 0 };
  };
  const games = [
    makeGame(BIG_COURT.x, BIG_COURT.z, BIG_COURT.a * 1.4, BIG_COURT.b * 1.3, 6, [HOOPS[0], HOOPS[1]]),
    makeGame(ROUND_COURT.x, ROUND_COURT.z, ROUND_COURT.r * 1.3, ROUND_COURT.r * 1.3, 3, [HOOPS[2]]),
  ];

  const ballGeo = new THREE.SphereGeometry(0.12, 14, 10);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xc8541f, roughness: 0.62 });
  const balls = new THREE.InstancedMesh(ballGeo, ballMat, games.length);
  balls.frustumCulled = false; scene.add(balls);

  // プレイヤー(スロットを 1 つ使う)
  const me = addPerson({ x: 0, z: 0, mode: 'idle', shirt: 0x27436e, pants: 0x20242c, hair: 0x15110d, bag: false, pack: false, longHair: false, isPlayer: true, h: 1, bw: 1, gait: 1, longSleeve: false });

  // ─── 姿勢の計算 ───
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
  const parent = new THREE.Matrix4(), yawQ = new THREE.Quaternion();
  let il, it, ih, is, iF;
  const put = (mesh, idx, m4, color) => { mesh.setMatrixAt(idx, m4); if (color !== undefined) mesh.setColorAt(idx, _c.set(color)); };

  // 親座標の p から、回転 rx,rz で下へ伸びる円筒を置き、先端の位置を返す
  const segment = (root, ox, oy, oz, rx, rz, L, r, color) => {
    _e.set(rx, 0, rz, 'XYZ'); _q.setFromEuler(_e);
    const dir = new THREE.Vector3(0, -1, 0).applyQuaternion(_q);
    const mid = new THREE.Vector3(ox + dir.x * L / 2, oy + dir.y * L / 2, oz + dir.z * L / 2);
    // 関節で隙間が開かないよう、丸い端のぶんだけ長く重ねる
    _m.compose(mid, _q, _s.set(r * 2, L + r * 1.5, r * 2));
    _m.premultiply(root);
    put(limbs, il++, _m, color);
    return new THREE.Vector3(ox + dir.x * L, oy + dir.y * L, oz + dir.z * L);
  };

  const pose = (p, t) => {
    const startL = il, startT = it, startH = ih, startS = is;
    const H = p.h;
    const moving = p.mode === 'walk' || p.mode === 'run';
    const amp = p.mode === 'run' ? 0.92 : p.mode === 'walk' ? 0.5 * p.gait : 0;
    const ph = p.phase;
    const sw = Math.sin(ph) * amp;
    const bob = moving ? Math.abs(Math.cos(ph)) * (p.mode === 'run' ? 0.06 : 0.025) : Math.sin(t * 1.3 + ph) * 0.004;
    const lean = p.mode === 'run' ? 0.2 : p.mode === 'walk' ? 0.04 : 0;
    yawQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.yaw);
    parent.compose(_p.set(p.x, p.g + (p.jumpY || 0), p.z), yawQ, _s.set(H * p.bw, H, H * p.bw));

    const hipY = 0.9 + bob;
    const hip = 0.09, sh = 0.2, shY = hipY + 0.5;
    // 脚
    for (const side of [-1, 1]) {
      const a = sw * side + (p.mode === 'shoot' ? 0.05 : 0);
      const knee = Math.max(0, Math.sin(ph + (side > 0 ? 0 : Math.PI))) * (moving ? (p.mode === 'run' ? 1.1 : 0.55) : 0) + (p.jumpY ? 0.5 : 0);
      const k = segment(parent, side * hip, hipY, 0, a, 0, 0.44, 0.078, p.pants);
      const foot = segment(parent, k.x, k.y, k.z, a - knee, 0, 0.42, 0.064, p.pants);
      _e.set(a - knee, 0, 0); _q.setFromEuler(_e);
      _m.compose(_p.set(foot.x, foot.y + 0.015, foot.z - 0.05), new THREE.Quaternion(), _s.set(0.098, 0.085, 0.255));
      _m.premultiply(parent); put(shoes, is++, _m, p.game ? 0xeeeee8 : 0x2a2622);
    }
    // 胴(前傾)
    const leanQ = new THREE.Quaternion().setFromEuler(_e.set(lean, 0, 0));
    _m.compose(_p.set(0, hipY + 0.26, -lean * 0.22), leanQ, _s.set(0.38, 0.56, 0.22));
    _m.premultiply(parent); put(torsos, it++, _m, p.shirt);
    // 腰
    _m.compose(_p.set(0, hipY - 0.01, 0), new THREE.Quaternion(), _s.set(0.3, 0.15, 0.19));
    _m.premultiply(parent); put(torsos, it++, _m, p.pants);
    // 背負い物
    if (p.pack) {
      _m.compose(_p.set(0, hipY + 0.3, 0.16), leanQ, _s.set(0.3, 0.38, 0.14));
      _m.premultiply(parent); put(torsos, it++, _m, 0x2a3346);
    } else if (!p.bag) { _m.makeScale(0, 0, 0); put(torsos, it++, _m, 0); }
    // 首と頭
    const headY = shY + 0.2;
    segment(parent, 0, shY + 0.11, -lean * 0.26, 0, 0, 0.13, 0.055, p.skin);
    _m.compose(_p.set(0, headY, -lean * 0.3), new THREE.Quaternion(), _s.set(0.215, 0.25, 0.235));
    _m.premultiply(parent); put(faces, iF++, _m, p.skin);
    // 髪: 頭の上と後ろを覆う
    const hairS = p.longHair ? [0.235, 0.33, 0.25] : [0.228, 0.205, 0.245];
    _m.compose(_p.set(0, headY + (p.longHair ? -0.03 : 0.052), -lean * 0.3 + 0.022), new THREE.Quaternion(), _s.set(...hairS));
    _m.premultiply(parent); put(heads, ih++, _m, p.hair);
    // 鼻
    _m.compose(_p.set(0, headY - 0.022, -lean * 0.3 - 0.104), new THREE.Quaternion(), _s.set(0.026, 0.042, 0.026));
    _m.premultiply(parent); put(shoes, is++, _m, p.skin);
    // 肩の丸み(胴の箱と腕のつなぎ目を隠す)
    for (const side of [-1, 1]) {
      _m.compose(_p.set(side * (sh - 0.04), shY - 0.045, -lean * 0.24), new THREE.Quaternion(), _s.set(0.12, 0.1, 0.13));
      _m.premultiply(parent); put(heads, ih++, _m, p.shirt);
    }
    // 腕
    for (const side of [-1, 1]) {
      let a = -sw * side * 0.85, z = -0.09 * side, elbow = moving ? (p.mode === 'run' ? 1.2 : 0.35) : 0.1;
      if (p.mode === 'wave' && side === 1) { a = 0; z = -2.5 + Math.sin(t * 7) * 0.32 * -1; elbow = 0.1; z = 2.6 * -1 + Math.sin(t * 7) * 0.32; }
      if (p.mode === 'shoot') { a = -2.5; z = -0.1 * side; elbow = 0.5 + p.poseT * 0.3; }
      if (p.mode === 'dribble' && side === 1) { a = -0.55; elbow = 0.5 + Math.sin(ph * 2) * 0.3; }
      const shoulderX = side * (sh - 0.005), sY = shY - 0.045;
      const e1 = segment(parent, shoulderX, sY, -lean * 0.24, a, z, 0.3, 0.064, p.shirt);
      const armColor = p.longSleeve && !p.game ? p.shirt : p.skin;
      const e2 = segment(parent, e1.x, e1.y, e1.z, a - elbow, z, 0.26, 0.05, armColor);
      _m.compose(_p.set(e2.x, e2.y, e2.z), new THREE.Quaternion(), _s.set(0.08, 0.08, 0.08));
      _m.premultiply(parent); put(shoes, is++, _m, p.skin);
      // 紙袋(秋葉原の手土産)。腕の振りに付いてくるよう手から吊る
      if (side === 1 && p.bag && !p.pack) {
        _m.compose(_p.set(e2.x, e2.y - 0.18, e2.z), new THREE.Quaternion(), _s.set(0.09, 0.3, 0.26));
        _m.premultiply(parent); put(torsos, it++, _m, [0xa83a34, 0xe0ded4, 0xb08e5e][p.shirt % 3]);
      }
    }
    // 影の属性(地面の高さと、その場所が日向か)
    const ga = (a, from, to) => { for (let i = from; i < to; i++) { a.setXY(i, p.g, p.lit); } };
    ga(shL.a, startL, il); ga(shT.a, startT, it); ga(shH.a, startH, ih); ga(shS.a, startS, is);
    if (!p.visible) {
      _m.makeScale(0, 0, 0);
      for (let i = startL; i < il; i++) limbs.setMatrixAt(i, _m);
      for (let i = startT; i < it; i++) torsos.setMatrixAt(i, _m);
      for (let i = startH; i < ih; i++) heads.setMatrixAt(i, _m);
      faces.setMatrixAt(iF - 1, _m);
      for (let i = startS; i < is; i++) shoes.setMatrixAt(i, _m);
    }
  };

  const updateGame = (g, dt, t, reduced) => {
    const b = g.ball;
    if (reduced) dt = 0;
    const carrier = g.players[g.carrier];
    for (const p of g.players) {
      const d = Math.hypot(p.tx - p.x, p.tz - p.z);
      if (d < 0.5 || p.retarget < 0 || p.retarget === undefined) {
        const towardBall = p !== carrier && R() < 0.5;
        const a = R() * 6.283, rr = Math.sqrt(R());
        p.tx = towardBall ? carrier.x + (R() - 0.5) * 4 : g.cx + Math.cos(a) * rr * g.rx * 0.5;
        p.tz = towardBall ? carrier.z + (R() - 0.5) * 4 : g.cz + Math.sin(a) * rr * g.rz * 0.5;
        p.retarget = 1.5 + R() * 2.5;
      }
      p.retarget -= dt;
      const dd = Math.max(0.001, Math.hypot(p.tx - p.x, p.tz - p.z));
      const speed = p === carrier ? p.speed * 0.8 : p.speed;
      if (dd > 0.25) {
        p.x += ((p.tx - p.x) / dd) * speed * dt; p.z += ((p.tz - p.z) / dd) * speed * dt;
        const want = Math.atan2(-(p.tx - p.x), -(p.tz - p.z));
        let dy = want - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        p.yaw += dy * Math.min(1, dt * 6);
        p.phase += dt * speed * 3.1;
        p.mode = p === carrier ? 'dribble_run' : 'run';
      } else p.mode = 'idle';
      if (p.mode === 'dribble_run') p.mode = 'run';
    }
    if (g.state === 'play') {
      g.timer -= dt;
      const dribble = Math.abs(Math.sin(t * 5.2));
      const fx = -Math.sin(carrier.yaw), fz = -Math.cos(carrier.yaw);
      b.x = carrier.x + fx * 0.42 + Math.cos(carrier.yaw) * 0.22; b.z = carrier.z + fz * 0.42 - Math.sin(carrier.yaw) * 0.22;
      b.y = 0.12 + dribble * 0.72;
      if (g.timer < 0) {
        const hoop = g.hoop[g.hoopIdx % g.hoop.length]; g.hoopIdx++;
        const rim = hoop.rim;
        // ゴールへ走り寄る
        carrier.tx = rim.x + hoop.dx * 3.2 + (R() - 0.5) * 3; carrier.tz = rim.z + hoop.dz * 0 + (R() - 0.5) * 5;
        g.state = 'approach'; g.rim = rim; g.timer = 2.2;
      }
    } else if (g.state === 'approach') {
      g.timer -= dt;
      const fx = -Math.sin(carrier.yaw), fz = -Math.cos(carrier.yaw);
      b.x = carrier.x + fx * 0.4; b.z = carrier.z + fz * 0.4; b.y = 0.12 + Math.abs(Math.sin(t * 6)) * 0.72;
      if (g.timer < 0 || Math.hypot(carrier.tx - carrier.x, carrier.tz - carrier.z) < 0.6) {
        // シュート
        carrier.tx = carrier.x; carrier.tz = carrier.z;
        carrier.mode = 'shoot'; carrier.shootT = 0.5;
        const T = 1.05;
        b.x = carrier.x; b.y = 2.1 * carrier.h; b.z = carrier.z;
        const miss = R() < 0.45 ? 0.5 : 0;
        const tx = g.rim.x + (R() - 0.5) * miss, tz = g.rim.z + (R() - 0.5) * miss;
        b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (g.rim.y - b.y + 0.5 * 9.8 * T * T) / T;
        g.state = 'air'; g.timer = T;
      }
    } else if (g.state === 'air') {
      b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      g.timer -= dt;
      if (g.timer < 0 && !g.dropped) { b.vx *= 0.2; b.vz *= 0.2; b.vy = Math.min(b.vy, -1); g.dropped = true; }
      if (b.y < 0.13) { b.y = 0.13; b.vy = Math.abs(b.vy) * 0.62; b.vx *= 0.7; b.vz *= 0.7; if (b.vy < 1.2) { g.state = 'loose'; g.dropped = false; } }
    } else if (g.state === 'loose') {
      // 一番近い人が拾う
      let best = 0, bd = 1e9;
      g.players.forEach((p, i) => { const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; best = i; } });
      const p = g.players[best];
      p.tx = b.x; p.tz = b.z;
      if (bd < 0.8) { g.carrier = best; g.state = 'play'; g.timer = 3 + R() * 5; }
    }
    if (carrier.shootT > 0) { carrier.shootT -= dt; carrier.mode = 'shoot'; carrier.poseT = carrier.shootT; }
  };

  const walkers = people.filter((p) => p.path);
  // 日向か日陰か: 通行人は移動が遅いので 1 秒おきに調べれば足りる
  let litTimer = 0;
  const camDir = new THREE.Vector3();
  const update = (dt, t, reduced, cam) => {
    for (const p of walkers) {
      if (reduced) { /* 歩き出さない */ } else {
        const a = p.path[p.seg === 0 ? 0 : 1], b = p.path[p.seg === 0 ? 1 : 0];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        p.t += (p.speed * dt) / L;
        if (p.t >= 1) { p.t = 0; p.seg = 1 - p.seg; }
        p.phase += dt * p.speed * 3.6;
      }
      const a = p.path[p.seg === 0 ? 0 : 1], b = p.path[p.seg === 0 ? 1 : 0];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      const nx = -dz / L, nz = dx / L;
      p.x = a[0] + dx * p.t + nx * p.off; p.z = a[1] + dz * p.t + nz * p.off;
      p.yaw = Math.atan2(-dx, -dz);
    }
    for (const g of games) updateGame(g, dt, t, reduced);
    litTimer -= dt;
    if (litTimer <= 0) {
      litTimer = 0.8;
      for (const p of people) p.lit = world.sunlit(p.x, p.z) ? 1 : 0.0;
    }
    il = it = ih = is = iF = 0;
    // 遠い人・背後の人は描かない
    cam.getWorldDirection(camDir);
    const cx = cam.position.x, cz = cam.position.z;
    for (const p of people) {
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 > 170 * 170 || (d2 > 64 && dx * camDir.x + dz * camDir.z < 0)) continue;
      pose(p, t);
    }
    limbs.count = il; torsos.count = it; heads.count = ih; shoes.count = is; faces.count = iF;
    for (const m of [limbs, torsos, heads, shoes, faces]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    shL.sm.count = il; shT.sm.count = it; shH.sm.count = ih; shS.sm.count = is;
    for (const s of [shL, shT, shH, shS]) s.a.needsUpdate = true;
    games.forEach((g, i) => { _m.makeTranslation(g.ball.x, g.ball.y, g.ball.z); balls.setMatrixAt(i, _m); });
    balls.instanceMatrix.needsUpdate = true;
  };
  return { update, me, people, games };
}
