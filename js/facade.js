// 建物ファサードの手続きテクスチャ+窓の奥の部屋(interior mapping)。minato-swing のものを、
// 秋葉原の雑居ビル向けの壁種に作り替えた。壁には実写の左官テクスチャを世界座標で重ねる。
import * as THREE from 'three';
import { rng } from './batch.js';

const TYPES = {
  // blank: 窓を開けない柱間(階段室・設備の壁)。winX 0 は窓が横につながる連窓になる
  white: { bays: 8, floors: 8, bayW: 2.8, floorH: 3.4, wall: '#dcd8cf', glass: [38, 48, 56], winX: 0.24, winY: 0.3, winH: 0.4, tile: 0, sash: '#8a8c8c', panel: true, blank: [2, 5, 6] },
  beige: { bays: 8, floors: 8, bayW: 3.0, floorH: 3.4, wall: '#c9bda4', glass: [36, 44, 52], winX: 0.18, winY: 0.32, winH: 0.38, tile: 0.8, sash: '#6c6a64', blank: [0, 3, 7] },
  gray: { bays: 8, floors: 8, bayW: 3.2, floorH: 3.5, wall: '#9b9a95', glass: [32, 42, 50], winX: 0, winY: 0.34, winH: 0.34, tile: 0.2, sash: '#4f5153', panel: true },
  cream: { bays: 8, floors: 8, bayW: 2.4, floorH: 3.2, wall: '#ddd5bc', glass: [40, 50, 56], winX: 0.26, winY: 0.28, winH: 0.42, tile: 0.5, sash: '#99947f', blank: [1, 4] },
  brown: { bays: 8, floors: 8, bayW: 2.8, floorH: 3.4, wall: '#5f4a3b', glass: [38, 46, 54], winX: 0.14, winY: 0.28, winH: 0.46, tile: 0.8, sash: '#3b3129' },
  stucco: { bays: 8, floors: 8, bayW: 3.4, floorH: 3.6, wall: '#d7d3c8', glass: [44, 52, 58], winX: 0.3, winY: 0.28, winH: 0.42, tile: 0, sash: '#6d6f70', grime: 2.2 },
  stripe: { bays: 8, floors: 8, bayW: 2.6, floorH: 3.2, wall: '#ec8f2b', glass: [52, 66, 76], winX: 0.22, winY: 0.26, winH: 0.46, tile: 0.2, sash: '#f3f0e6', bands: '#f6f3ea' },
  red: { bays: 8, floors: 8, bayW: 3.0, floorH: 3.4, wall: '#b4242a', glass: [50, 56, 62], winX: 0.1, winY: 0.28, winH: 0.46, tile: 0.2, sash: '#efece4' },
  yellow: { bays: 8, floors: 8, bayW: 3.0, floorH: 3.5, wall: '#d9b645', glass: [46, 56, 62], winX: 0.12, winY: 0.28, winH: 0.46, tile: 0.4, sash: '#8a7b3c', grime: 1.4 },
};

function makeFacade(name, maxAniso) {
  const T = TYPES[name];
  const W = 1024, H = 1024;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cMap = mk(), cEm = mk(), cRm = mk();
  const g = cMap.getContext('2d'), e = cEm.getContext('2d'), r = cRm.getContext('2d');
  const bw = W / T.bays, fh = H / T.floors;
  const R = rng(name.length * 977 + name.charCodeAt(0) * 13);

  g.fillStyle = T.wall; g.fillRect(0, 0, W, H);
  // タイル目地
  if (T.tile) {
    g.fillStyle = `rgba(30,26,22,${0.08 * T.tile})`;
    for (let y = 0; y < H; y += 10) g.fillRect(0, y, W, 1);
    for (let y = 0; y < H; y += 20) for (let x = (y % 40 ? 0 : 14); x < W; x += 28) g.fillRect(x, y, 1, 10);
  }
  // 大判パネルの目地(写真の白いビルの外壁)
  if (T.panel) {
    g.fillStyle = 'rgba(40,38,34,0.22)';
    for (let k = 0; k < T.floors * 2; k++) g.fillRect(0, (k * H) / (T.floors * 2), W, 1.5);
    for (let k = 0; k < T.bays * 2; k++) g.fillRect((k * W) / (T.bays * 2), 0, 1.5, H);
  }
  for (let i = 0; i < 2400; i++) {
    const v = (R() - 0.5) * 22;
    g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
    g.fillRect(R() * W, R() * H, 2 + R() * 34, 1 + R() * 4);
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  r.fillStyle = 'rgb(0,225,0)'; r.fillRect(0, 0, W, H);

  for (let fy = 0; fy < T.floors; fy++) {
    const y0 = H - (fy + 1) * fh;
    if (T.bands && fy % 1 === 0) { g.fillStyle = T.bands; g.fillRect(0, y0, W, fh * 0.14); }
    // 階の水切り
    g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, y0 + fh * 0.97, W, fh * 0.03);
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, y0 + fh * 0.94, W, fh * 0.02);
    for (let bx = 0; bx < T.bays; bx++) {
      if (T.blank && T.blank.includes(bx)) continue;
      const x = bx * bw + bw * T.winX, w = bw * (1 - 2 * T.winX);
      const y = y0 + fh * T.winY, h = fh * T.winH;
      // 枠
      g.fillStyle = T.sash; g.fillRect(x - 3, y - 3, w + 6, h + 6);
      const j = (R() - 0.5) * 14;
      const [cr, cg, cb] = T.glass;
      const grad = g.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, `rgb(${cr + j + 16},${cg + j + 18},${cb + j + 20})`);
      grad.addColorStop(1, `rgb(${cr + j - 8},${cg + j - 8},${cb + j - 6})`);
      g.fillStyle = grad; g.fillRect(x, y, w, h);
      r.fillStyle = `rgb(0,${16 + (R() * 12 | 0)},200)`; r.fillRect(x, y, w, h);
      // カーテン・ブラインド・貼り紙(窓ごとの生活感)
      const kind = R();
      // 窓の内側のカーテンは直射を受けないので、日なたの壁より十分暗く塗る(明るいと白飛びしてホテルの窓に見える)
      if (kind < 0.22) { const cov = 0.3 + R() * 0.6; g.fillStyle = 'rgb(112,110,100)'; g.fillRect(x, y, w, h * cov); r.fillStyle = 'rgb(0,200,0)'; r.fillRect(x, y, w, h * cov); }
      else if (kind < 0.34) { g.fillStyle = 'rgb(100,102,100)'; for (let k = 0; k < h; k += 4) g.fillRect(x, y + k, w, 2); r.fillStyle = 'rgb(0,190,0)'; r.fillRect(x, y, w, h); }
      else if (kind < 0.36) { const c = ['#b8b4a6', '#a9a79c', '#8e8f8a'][R() * 3 | 0]; g.fillStyle = c; g.fillRect(x + w * 0.1, y + h * 0.1, w * 0.3, h * 0.8); r.fillStyle = 'rgb(0,170,0)'; r.fillRect(x + w * 0.1, y + h * 0.1, w * 0.3, h * 0.8); }
      else e.fillStyle = '#000';
      // 中桟
      g.fillStyle = T.sash; g.fillRect(x + w / 2 - 1.5, y, 3, h);
      // 窓の奥行き: 上と左の見込みに落ちる影(ガラスではない面として塗る)
      g.fillStyle = 'rgb(58,56,52)'; g.fillRect(x, y, w, h * 0.075); g.fillRect(x, y, w * 0.03, h);
      r.fillStyle = 'rgb(0,225,0)'; r.fillRect(x, y, w, h * 0.075); r.fillRect(x, y, w * 0.03, h);
      // 窓台(明るい水切り)
      g.fillStyle = 'rgba(205,202,192,0.5)'; g.fillRect(x - 5, y + h + 3, w + 10, 5);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x - 5, y + h + 8, w + 10, 3);
      // 窓下の雨だれ
      const st = (0.05 + R() * 0.1) * (T.grime || 1);
      const dr = g.createLinearGradient(0, y + h, 0, y + h + fh * 0.5);
      dr.addColorStop(0, `rgba(36,30,24,${st})`); dr.addColorStop(1, 'rgba(36,30,24,0)');
      g.fillStyle = dr; g.fillRect(x + 2, y + h + 3, w - 4, fh * 0.45);
    }
  }
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };
  return { map: tex(cMap, true), emissiveMap: tex(cEm, true), rmMap: tex(cRm, false), tileW: T.bays * T.bayW, tileH: T.floors * T.floorH, floorH: T.floorH };
}

export const roomAmb = { value: 0.42 };
const ROOM_PARS = /* glsl */`
uniform vec2 uGrid, uWin; uniform vec3 uCell; uniform float uRoomAmb; uniform sampler2D tDetail;
varying vec3 vIWorld; varying vec3 vINormal;
float ihash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 roomShade(vec2 cell, vec2 f, vec3 rd, out float light) {
  vec3 ro = vec3(f, 0.0);
  float tx = rd.x > 0.0 ? (1.0 - f.x) / rd.x : -f.x / min(rd.x, -1e-4);
  float ty = rd.y > 0.0 ? (1.0 - f.y) / rd.y : -f.y / min(rd.y, -1e-4);
  float tz = 1.0 / max(rd.z, 1e-4);
  float t = min(min(tx, ty), tz);
  vec3 h = ro + rd * t;
  float r1 = ihash(cell), r2 = ihash(cell + 17.3);
  vec3 wall = mix(vec3(0.62, 0.6, 0.54), vec3(0.46, 0.5, 0.54), r1);
  vec3 c; light = 0.0;
  if (t == tz) {
    c = wall * 0.8;
    if (h.y < 0.36 && abs(h.x - 0.3 - r2 * 0.4) < 0.26) c *= 0.3;
    if (h.y > 0.3 && h.y < 0.85 && abs(h.x - 0.2 - r1 * 0.6) < 0.14) c = mix(c, vec3(0.12, 0.16, 0.2), 0.75);
  } else if (t == ty) {
    if (rd.y > 0.0) { c = vec3(0.8, 0.8, 0.78); light = smoothstep(0.3, 0.0, length(h.xz - vec2(0.5, 0.45))); }
    else c = mix(vec3(0.25, 0.2, 0.15), vec3(0.34, 0.35, 0.36), step(0.5, r2));
  } else c = wall * 0.62;
  c *= mix(1.0, 0.45, h.z);
  return c + light * 0.35;
}
`;
const ROOM_FRAG = /* glsl */`
#ifdef USE_EMISSIVEMAP
  vec3 iV = normalize(vIWorld - cameraPosition);
  vec3 iN = normalize(vINormal);
  vec3 iT = normalize(cross(vec3(0.0, 1.0, 0.0), iN));
  vec3 rd = vec3(dot(iV, iT) / uCell.x, iV.y / uCell.y, -dot(iV, iN) / uCell.z);
  vec2 g = vMapUv * uGrid;
  float roomLight;
  float wm = 1.0 - smoothstep(0.14, 0.26, roughnessFactor);
  // 窓でない画素は室内の計算を省く
  vec3 room = wm > 0.004 ? roomShade(floor(g), fract(g), rd, roomLight) : vec3(0.0);
  float fres = pow(1.0 - clamp(dot(-iV, iN), 0.0, 1.0), 4.0);
  // 窓の映り込みは環境マップを引かず空の式で近似する(IBL 全面適用は +54ms)
  vec3 rv = reflect(iV, iN);
  // 地平線の近くに映るのは空でなく向かいの建物なので暗い。目の高さで見た窓が白く飛ばないようにする
  vec3 skyC = mix(vec3(0.26, 0.27, 0.29), vec3(0.6, 0.72, 0.9), smoothstep(0.12, 0.6, rv.y));
  vec3 refl = rv.y > 0.0 ? skyC : vec3(0.2);
  float F = 0.06 + 0.94 * fres;
  // 昼のガラスは暗い。正面からは映り込みが弱く、斜めからだけ空を映す
  vec3 winC = (1.0 - F) * room * uRoomAmb * 0.55 + (F * 0.6 + 0.035) * refl;
  // カーテンとブラインド: 窓ごとに丈と色を変え、8×8 のタイルの繰り返しを崩す
  vec2 wCell = floor(g), wF = fract(g);
  float wH = ihash(wCell + 5.1);
  if (wH > 0.6) {
    float cov = (wH - 0.6) / 0.4 * uWin.y;
    float hang = smoothstep(uWin.x - cov - 0.004, uWin.x - cov + 0.004, wF.y);
    vec3 cloth = mix(vec3(0.46, 0.45, 0.4), vec3(0.34, 0.36, 0.36), ihash(wCell + 9.7));
    if (ihash(wCell + 2.3) > 0.6) cloth *= 0.82 + 0.18 * step(0.5, fract(wF.y * 34.0));
    winC = mix(winC, cloth + refl * F * 0.5, hang);
  }
  // 遠くの窓は 1 枚ずつ見分けられず、壁となじむ(遠景の格子模様を消す)
  float farK = smoothstep(110.0, 320.0, length(vIWorld - cameraPosition));
  winC = mix(winC, vec3(0.3, 0.32, 0.34), farK * 0.75);
  totalEmissiveRadiance = wm * winC;
#endif
`;

export function facadeMaterial(name, aniso, detailTex) {
  const f = makeFacade(name, aniso);
  const T = TYPES[name];
  const m = new THREE.MeshStandardMaterial({
    map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0,
    roughnessMap: f.rmMap, roughness: 1, metalness: 0, vertexColors: true,
  });
  m.userData.tile = [f.tileW, f.tileH];
  m.userData.floorH = f.floorH;
  m.userData.wall = T.wall;
  m.userData.bays = T.bays;
  const uGrid = { value: new THREE.Vector2(T.bays, T.floors) };
  const uCell = { value: new THREE.Vector3(T.bayW, T.floorH, 5) };
  const uWin = { value: new THREE.Vector2(1 - T.winY, T.winH) }; // 窓の上端(セル内 v)と高さ
  m.onBeforeCompile = (s) => {
    s.uniforms.uGrid = uGrid; s.uniforms.uWin = uWin; s.uniforms.uCell = uCell; s.uniforms.uRoomAmb = roomAmb; s.uniforms.tDetail = { value: detailTex };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vIWorld; varying vec3 vINormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vec4 iwp = vec4(transformed, 1.0);
  vIWorld = (modelMatrix * iwp).xyz;
  vINormal = normalize(mat3(modelMatrix) * objectNormal);`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + ROOM_PARS)
      // 実写の壁の凹凸と汚れを世界座標で重ねる(近くで見ても絵に見えないように)
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec2 wduv = vec2(vIWorld.x + vIWorld.z, vIWorld.y) / 3.0;
  float dLum = dot(texture2D(tDetail, wduv).rgb, vec3(0.33));
  diffuseColor.rgb *= mix(0.8, 1.22, dLum);
  diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.0, 3.5, vIWorld.y));
  // 雨だれ(縦に引き伸ばした濃淡)と面の大きなむら。ミップを上げて素材の細部を消し、濃淡だけ使う
  vec2 wxy = vec2(vIWorld.x + vIWorld.z, vIWorld.y);
  float rain = dot(texture2D(tDetail, vec2(wxy.x * 0.13, wxy.y * 0.008), 2.5).rgb, vec3(0.33));
  float blot = dot(texture2D(tDetail, wxy * 0.019 + 0.31, 5.0).rgb, vec3(0.33));
  float soot = smoothstep(0.28, 0.5, rain) * 0.6 + smoothstep(0.3, 0.48, blot) * 0.4;
  vec3 dirty = mix(vec3(dot(diffuseColor.rgb, vec3(0.33))), diffuseColor.rgb, 0.8) * vec3(0.72, 0.7, 0.66);
  diffuseColor.rgb = mix(dirty, diffuseColor.rgb, soot);`)
      .replace('#include <emissivemap_fragment>', ROOM_FRAG);
  };
  m.customProgramCacheKey = () => 'facade-akiba';
  return m;
}
export const FACADE_TYPES = Object.keys(TYPES);
