// 建物: 外壁(種類ごとに結合)+屋上の機器+店先の帯・ひさし・室外機+遠景。
import * as THREE from 'three';
import { Batch, rng } from './batch.js';
import { B } from './layout.js';
import { facadeMaterial, FACADE_TYPES } from './facade.js';
import { faceFrame, coveredBySign, BAND_COUNT, TATE_COUNT } from './signs.js';

const STORE_H = 4.2;

// 店先の絵: ガラス越しの商品棚とシャッターの 8 種
function shopfrontTexture(aniso) {
  const W = 2048, H = 1024, CW = W / 4, CH = H / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(77);
  const prod = ['#7a3132', '#39496f', '#b1afa8', '#2a2a2d', '#8f7a3f', '#3a5d4a', '#63666b', '#8d6135', '#a2a29b', '#475470', '#3a3c40', '#7f8182', '#d5d3cc', '#26262a'];
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * CW, y = (i >> 2) * CH;
    g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, CW, CH); g.clip();
    if (i === 7) {
      // 閉じたシャッター
      g.fillStyle = '#9c9f9f'; g.fillRect(0, 0, CW, CH);
      for (let k = 0; k < CH; k += 7) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, k, CW, 2); }
      g.fillStyle = 'rgba(60,50,40,0.25)'; g.fillRect(0, CH * 0.82, CW, CH * 0.18);
    } else {
      // 店内: 明るい蛍光灯と棚
      // ガラス越しに見える奥行き: 商品を細かく、少しぼかして描き、奥へ向かって暗くする
      g.fillStyle = '#54564f'; g.fillRect(0, 0, CW, CH);
      g.filter = 'blur(0.9px)';
      const shelves = 5;
      for (let s = 0; s < shelves; s++) {
        const sy = 26 + s * ((CH - 70) / shelves), sh = (CH - 70) / shelves;
        g.fillStyle = '#6f7272'; g.fillRect(0, sy + sh - 2, CW, 2);
        for (let px = 1; px < CW;) {
          const pw = 9 + R() * 26, ph = sh * (0.35 + R() * 0.5);
          // 棚が詰まりきらないよう、ところどころ奥の壁を見せる
          if (R() < 0.14) { px += pw; continue; }
          g.fillStyle = prod[R() * prod.length | 0]; g.fillRect(px, sy + sh - 2 - ph, pw, ph);
          if (R() < 0.35) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(px + 1, sy + sh - 2 - ph * 0.7, pw - 2, ph * 0.16); }
          px += pw + 0.8;
        }
      }
      g.filter = 'none';
      // 値札の POP
      for (let k = 0; k < 9; k++) {
        g.fillStyle = ['#ffe73a', '#ff4b3a', '#fff'][R() * 3 | 0];
        const sx = R() * CW, sy = 30 + R() * (CH - 140);
        g.fillRect(sx, sy, 24, 15);
        g.fillStyle = '#c0141c'; g.font = '900 10px "Yu Gothic",sans-serif'; g.fillText(['特価', '¥980', '新品', '目玉', '激安'][R() * 5 | 0], sx + 2, sy + 11);
      }
      const depth = g.createLinearGradient(0, 0, 0, CH);
      depth.addColorStop(0, 'rgba(10,12,14,0.05)'); depth.addColorStop(1, 'rgba(10,12,14,0.42)');
      g.fillStyle = depth; g.fillRect(0, 0, CW, CH);
      // 床と腰
      g.fillStyle = '#6e7071'; g.fillRect(0, CH - 40, CW, 40);
      // サッシとガラスの映り込みはシェーダで手前に重ねる(奥の棚とずれて動くように)
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  // 区画の境でシェーダの floor が隣へ跳ねないよう、uv を内側へわずかに寄せる
  return { tex: t, uv: (i) => { const x = (i % 4) / 4, y = 1 - ((i >> 2) + 1) / 2; return [x + 0.001, y + 0.001, x + 0.249, y + 0.499]; } };
}

// 店先: ガラスの奥に床と天井と棚のある部屋を計算で描く。手前のサッシと映り込みは面に固定なので、歩くと奥だけがずれる
function shopMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSWorld; varying vec3 vSNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vSWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vSNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSWorld; varying vec3 vSNormal;')
      .replace('#include <map_fragment>', /* glsl */`
  vec2 cellS = vec2(4.0, 2.0);
  vec2 cid = floor(vMapUv * cellS), cuv = vMapUv * cellS - cid;
  vec3 shopE = vec3(0.0);
  if (cid.x > 2.5 && cid.y < 0.5) {
    diffuseColor *= texture2D(map, vMapUv); // 閉じたシャッター
  } else {
    vec3 sV = normalize(vSWorld - cameraPosition), sN = normalize(vSNormal), sT = normalize(cross(vec3(0.0, 1.0, 0.0), sN));
    vec3 rd = vec3(dot(sV, sT), sV.y, max(-dot(sV, sN), 0.02));
    const float roomD = 3.2, roomH = 3.2;
    float py = clamp(vSWorld.y, 0.01, roomH - 0.01);
    float tb = roomD / rd.z;
    float tf = rd.y < 0.0 ? py / -rd.y : 1e5;
    float tc = rd.y > 0.0 ? (roomH - py) / rd.y : 1e5;
    float t = min(tb, min(tf, tc));
    vec3 h = vec3(rd.x * t, py + rd.y * t, rd.z * t);
    vec3 inner;
    if (t == tb) {
      vec2 cont = vec2(cuv.x + h.x / 6.0, h.y / roomH);
      vec2 wrapped = vec2(fract(cont.x), clamp(cont.y, 0.005, 0.995));
      inner = textureGrad(map, (cid + wrapped) / cellS, dFdx(cont) / cellS, dFdy(cont) / cellS).rgb;
    } else if (t == tf) {
      float check = mod(floor(h.x / 0.6) + floor(h.z / 0.6), 2.0);
      inner = vec3(0.27, 0.265, 0.25) * (0.9 + 0.1 * check);
    } else {
      float lamp = 1.0 - smoothstep(0.05, 0.1, abs(fract(h.z / 1.2) - 0.5));
      inner = mix(vec3(0.26), vec3(0.95, 1.0, 0.92), lamp);
    }
    inner *= mix(1.0, 0.72, h.z / roomD);
    // 面に固定のサッシ(1.5m ごとの方立て、上枠、足元の腰板)
    float fw = max(fwidth(cuv.x * 4.0), 1e-4);
    float mull = 1.0 - smoothstep(0.012, 0.012 + fw, abs(fract(cuv.x * 4.0 + 0.5) - 0.5));
    float frame = max(max(mull, step(0.965, cuv.y)), step(vSWorld.y, 0.4));
    vec3 rv = reflect(sV, sN);
    // 正面に映るのは向かいの街で、空が映るのは見上げたときだけ
    vec3 street = mix(vec3(0.24, 0.25, 0.26), vec3(0.42, 0.5, 0.62), smoothstep(0.2, 0.8, rv.y));
    float fres = pow(1.0 - clamp(dot(-sV, sN), 0.0, 1.0), 3.0);
    float F = 0.06 + 0.94 * fres;
    shopE = (1.0 - frame) * ((1.0 - F) * inner * 0.55 + (F * 0.85 + 0.07) * street);
    diffuseColor.rgb = mix(vec3(0.008), vec3(0.075, 0.08, 0.085), frame);
  }`)
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = shopE;');
  };
  m.customProgramCacheKey = () => 'akiba-shop';
  return m;
}

export function buildBuildings(scene, tex, atlas, aniso) {
  const byId = Object.fromEntries(B.map((b) => [b.id, b]));
  const R = rng(2000), TR = rng(2001);
  const walls = {}, mats = {};
  for (const t of FACADE_TYPES) { walls[t] = new Batch(); mats[t] = facadeMaterial(t, aniso, tex.plaster.diff); }
  const roof = new Batch();        // 屋上のコンクリート(world uv)
  const dress = new Batch();       // 室外機・水槽・配管など(頂点色のみ)
  const shops = new Batch();       // 店先の絵
  const signBand = new Batch();    // 帯看板(看板アトラス)
  const SF = shopfrontTexture(aniso);

  const addWall = (b, f, h0, h1) => {
    const T = mats[b.t].userData, fr = faceFrame(b, f), L = fr.len;
    const off = (Math.floor(R() * T.bays) / T.bays);
    const tw = T.tile[0], th = T.tile[1];
    // 窓が床の高さに合うよう、V は高さ/タイル高さ。U は整数スパンで合わせて端で窓が切れないようにする
    const bayW = tw / T.bays, nb = Math.max(1, Math.round(L / bayW)), us = (nb * bayW) / tw;
    const x1 = fr.o[0] + fr.d[0] * L, z1 = fr.o[1] + fr.d[1] * L;
    const tint = 0.84 + R() * 0.28;
    const col = new THREE.Color(tint, tint * (0.98 + R() * 0.03), tint * (0.95 + R() * 0.05));
    // パラペットの下は雨が伝って黒ずむ。最上部の数メートルだけ上へ向かって暗くする
    const hm = Math.max(h0, h1 - 4 - R() * 3);
    const top = col.clone().multiplyScalar(0.58 + R() * 0.14);
    const slice = (y0, y1, c0, c1) => walls[b.t].quad([fr.o[0], y0, fr.o[1]], [x1, y0, z1], [x1, y1, z1], [fr.o[0], y1, fr.o[1]], [off, y0 / th, off + us, y1 / th], [c0, c0, c1, c1]);
    slice(h0, hm, col, col);
    slice(hm, h1, col, top);
  };

  // 外階段: 道路から側面が見えるビルの鉄骨階段。人の頭より上から始める(地上の支柱は細く、当たり判定は持たない)
  const fireStairs = (b, f, u0) => {
    const fr = faceFrame(b, f), fh = mats[b.t].userData.floorH, st = 0x5a5650;
    const P = (u, y, d) => [fr.o[0] + fr.d[0] * u + fr.n[0] * d, y, fr.o[1] + fr.d[1] * u + fr.n[1] * d];
    const u1 = u0 + 3.2, D0 = 0.05, D1 = 1.25;
    const landing = (u, y) => {
      const a = P(u - 0.6, y, D0), c = P(u + 0.6, y + 0.08, D1);
      dress.box(Math.min(a[0], c[0]), y, Math.min(a[2], c[2]), Math.max(a[0], c[0]), y + 0.08, Math.max(a[2], c[2]), { color: st });
      dress.pipe(P(u - 0.6, y + 1.05, D1), P(u + 0.6, y + 1.05, D1), 0.022, st, 3);
    };
    let i = 0;
    for (let y = fh; y + fh < b.h; y += fh, i++) {
      const uA = i % 2 ? u1 : u0, uB = i % 2 ? u0 : u1;
      landing(uA, y);
      dress.pipe(P(uA, y, D1 - 0.1), P(uB, y + fh, D1 - 0.1), 0.05, st, 3);
      dress.pipe(P(uA, y, D0 + 0.1), P(uB, y + fh, D0 + 0.1), 0.05, st, 3);
      // 踏み板の面(上下どちらからも見えるよう両向き)
      const a = P(uA, y, D0 + 0.1), c = P(uB, y + fh, D0 + 0.1), e = P(uB, y + fh, D1 - 0.1), g = P(uA, y, D1 - 0.1);
      dress.quad(a, c, e, g, [0, 0, 1, 1], st);
      dress.quad(g, e, c, a, [0, 0, 1, 1], st);
      dress.pipe(P(uA, y + 1, D1 - 0.1), P(uB, y + fh + 1, D1 - 0.1), 0.02, st, 3);
    }
    for (const u of [u0, u1]) dress.pipe(P(u, 0, D1), P(u, fh * (i + 1), D1), 0.04, st, 3);
  };
  const byIdS = Object.fromEntries(B.map((b) => [b.id, b]));
  // 隣のビルと接していない面だけに置く(接する面だと外から見えない)
  for (const [id, f, u] of [['aircon', 's', 5], ['toshiba', 's', 8], ['onoden', 'e', 10], ['dept', 'w', 14], ['w2', 'n', 10]]) fireStairs(byIdS[id], f, u);

  for (const b of B) {
    for (const f of ['e', 'w', 'n', 's']) addWall(b, f, 0, b.h);
    // 上階の後退: 屋上に一回り小さい階を重ね、輪郭の箱を崩す。手前の屋上看板に掛からないよう内側へ寄せる
    const rw = b.x1 - b.x0, rd = b.z1 - b.z0;
    if (rw > 14 && rd > 14 && R() < 0.55) {
      const fh = mats[b.t].userData.floorH, n = 1 + (R() * 3 | 0);
      const top = { ...b, x0: b.x0 + rw * (0.12 + R() * 0.15), x1: b.x1 - rw * (0.12 + R() * 0.15), z0: b.z0 + rd * (0.12 + R() * 0.15), z1: b.z1 - rd * (0.12 + R() * 0.15) };
      for (const f of ['e', 'w', 'n', 's']) addWall(top, f, b.h, b.h + fh * n);
      roof.box(top.x0, b.h + fh * n - 0.02, top.z0, top.x1, b.h + fh * n + 0.4, top.z1, { scale: 4, color: 0x8f8f8a });
    }
    // 屋上: パラペットと機器
    const pw = 0.3, ph = 1.0;
    roof.box(b.x0, b.h - 0.02, b.z0, b.x1, b.h + 0.02, b.z1, { scale: 4, color: 0x9a9a96 });
    const edge = 0xaaa9a2;
    roof.box(b.x0, b.h, b.z0, b.x1, b.h + ph, b.z0 + pw, { scale: 3, color: edge });
    roof.box(b.x0, b.h, b.z1 - pw, b.x1, b.h + ph, b.z1, { scale: 3, color: edge });
    roof.box(b.x0, b.h, b.z0, b.x0 + pw, b.h + ph, b.z1, { scale: 3, color: edge });
    roof.box(b.x1 - pw, b.h, b.z0, b.x1, b.h + ph, b.z1, { scale: 3, color: edge });
    // 階段室
    const sx = b.x0 + 4 + R() * Math.max(1, b.x1 - b.x0 - 10), sz = b.z0 + 3 + R() * Math.max(1, b.z1 - b.z0 - 8);
    roof.box(sx, b.h, sz, sx + 4.5, b.h + 3.2, sz + 4.5, { scale: 3, color: 0x9e9d97 });
    // 高架水槽
    const tx = b.x0 + 3 + R() * Math.max(1, b.x1 - b.x0 - 8), tz = b.z0 + 3 + R() * Math.max(1, b.z1 - b.z0 - 8);
    dress.box(tx, b.h + 1.8, tz, tx + 3, b.h + 3.8, tz + 2.4, { color: 0xc9c9c0 });
    for (const [lx, lz] of [[0, 0], [3, 0], [0, 2.4], [3, 2.4]]) dress.pipe([tx + lx, b.h, tz + lz], [tx + lx, b.h + 1.9, tz + lz], 0.05, 0x55585a, 3);
    // 屋上の室外機と箱。高さも向きも不揃いに散らす
    for (let k = 0, n = 2 + (R() * 3 | 0); k < n; k++) {
      const ux = b.x0 + 1.5 + R() * Math.max(1, b.x1 - b.x0 - 4), uz = b.z0 + 1.5 + R() * Math.max(1, b.z1 - b.z0 - 4);
      const w = 0.8 + R() * 1.8, d = 0.6 + R() * 1.2, hh = 0.7 + R() * 1.6;
      dress.box(ux, b.h, uz, ux + w, b.h + hh, uz + d, { color: R() < 0.5 ? 0xb9b8ae : 0x85837b });
    }
    // 空に抜ける鉄骨の枠とアンテナ(写真の屋上の輪郭)。半分のビルだけ
    if (R() < 0.5) {
      const fx = b.x0 + 2 + R() * Math.max(1, b.x1 - b.x0 - 9), fz = b.z0 + 2 + R() * Math.max(1, b.z1 - b.z0 - 4), fw = 4 + R() * 3, fh = 3 + R() * 4, st = 0x4e5052;
      for (const u of [0, fw]) dress.pipe([fx + u, b.h, fz], [fx + u, b.h + fh, fz], 0.06, st, 3);
      for (const k of [0.5, 1]) dress.pipe([fx, b.h + fh * k, fz], [fx + fw, b.h + fh * k, fz], 0.05, st, 3);
      dress.pipe([fx + fw * 0.5, b.h + fh, fz], [fx + fw * 0.5, b.h + fh + 3 + R() * 4, fz], 0.025, st, 3);
    }
    // 屋上室外機
    for (let i = 0; i < 5; i++) {
      const ax = b.x0 + 1.5 + R() * (b.x1 - b.x0 - 3), az = b.z0 + 1.5 + R() * (b.z1 - b.z0 - 3);
      dress.box(ax, b.h, az, ax + 1.1, b.h + 1, az + 0.5, { color: 0xc6c7c0 });
    }
    // アンテナ
    const anx = (b.x0 + b.x1) / 2 + R() * 6 - 3, anz = (b.z0 + b.z1) / 2 + R() * 4 - 2, anh = 5 + R() * 7;
    dress.pipe([anx, b.h, anz], [anx, b.h + anh, anz], 0.035, 0x6a6c6e);
    for (let k = 0; k < 3; k++) dress.pipe([anx - 0.9, b.h + anh - k * 0.6, anz], [anx + 0.9, b.h + anh - k * 0.6, anz], 0.012, 0x6a6c6e);

    // 店先
    for (const f of b.shops || '') {
      const fr = faceFrame(b, f), L = fr.len;
      let u = 0;
      while (u < L - 0.5) {
        const w = Math.min(L - u, 5 + R() * 8);
        const idx = R() * 8 | 0, uv0 = SF.uv(idx);
        const out = 0.06;
        const P = (uu, y, o) => [fr.o[0] + fr.d[0] * uu + fr.n[0] * o, y, fr.o[1] + fr.d[1] * uu + fr.n[1] * o];
        shops.quad(P(u, 0, out), P(u + w, 0, out), P(u + w, STORE_H - 1.0, out), P(u, STORE_H - 1.0, out), [uv0[0], uv0[1], uv0[0] + (uv0[2] - uv0[0]) * Math.min(1, w / 6), uv0[3]]);
        // 帯看板(専用の看板を持つ建物は省く)
        const band = atlas.uv['band' + (R() * BAND_COUNT | 0)];
        if (b.id !== 'sato' || f !== 'n') signBand.quad(P(u, STORE_H - 1.0, 0.25), P(u + w, STORE_H - 1.0, 0.25), P(u + w, STORE_H + 0.1, 0.25), P(u, STORE_H + 0.1, 0.25), band);
        signBand.quad(P(u, STORE_H + 0.1, 0.25), P(u + w, STORE_H + 0.1, 0.25), P(u + w, STORE_H + 0.1, 0.02), P(u, STORE_H + 0.1, 0.02), atlas.uv.frame);
        // ひさし(前下がり)
        if (R() < 0.7) {
          const cols = [0xb8232a, 0x1d6a48, 0x204a9a, 0xd8d4c6, 0xc26a1a];
          const co = cols[R() * cols.length | 0], y0 = STORE_H - 1.0, depth = 1.3 + R() * 0.5;
          dress.quad(P(u, y0 - 0.32, depth), P(u + w, y0 - 0.32, depth), P(u + w, y0, 0.26), P(u, y0, 0.26), [0, 0, 1, 1], co);
          dress.quad(P(u, y0 - 0.6, depth), P(u + w, y0 - 0.6, depth), P(u + w, y0 - 0.32, depth), P(u, y0 - 0.32, depth), [0, 0, 1, 1], co);
        }
        // 店頭ワゴンと段ボール
        if (R() < 0.75 && idx !== 7) {
          const n = 1 + (R() * 3 | 0);
          for (let k = 0; k < n; k++) {
            const wu = u + 0.6 + R() * Math.max(0.1, w - 2), o = 0.9 + R() * 0.6, sw = 0.6 + R() * 0.7, sh = 0.5 + R() * 0.7;
            const pa = P(wu, 0.12, o), pb = P(wu + sw, 0.12 + sh, o + 0.55);
            dress.box(Math.min(pa[0], pb[0]), pa[1], Math.min(pa[2], pb[2]), Math.max(pa[0], pb[0]), pb[1], Math.max(pa[2], pb[2]),
              { color: [0xb08a58, 0xa27c4c, 0xc9c6bc, 0x8c8a82, 0xb69468][R() * 5 | 0] });
          }
        }
        u += w;
      }
    }
    // 袖看板: 壁から直角に突き出す細い縦長の看板。実名の平看板の前には置かない
    for (const f of (b.shops || '') + (b.x1 === -92 ? 'e' : '')) {
      const fr = faceFrame(b, f), L = fr.len;
      const P = (uu, y, o) => [fr.o[0] + fr.d[0] * uu + fr.n[0] * o, y, fr.o[1] + fr.d[1] * uu + fr.n[1] * o];
      const n = 1 + (L / 11 | 0);
      for (let k = 0; k < n; k++) {
        const su = 0.8 + (k + TR()) / n * (L - 1.6), y0 = STORE_H + 0.5 + TR() * 2, h = 4.6 + TR() * 2.2;
        if (y0 + h > b.h - 0.6 || coveredBySign(b.id, f, su - 1, y0, 2, h)) continue;
        const uv = atlas.uv['tate' + (TR() * TATE_COUNT | 0)], o0 = 0.15, o1 = 1.25;
        signBand.quad(P(su, y0, o0), P(su, y0, o1), P(su, y0 + h, o1), P(su, y0 + h, o0), uv);
        signBand.quad(P(su, y0, o1), P(su, y0, o0), P(su, y0 + h, o0), P(su, y0 + h, o1), uv);
      }
    }
    // 室外機と配管(各面)
    for (const f of ['e', 'w', 'n', 's']) {
      const fr = faceFrame(b, f), L = fr.len;
      const P = (uu, y, o) => [fr.o[0] + fr.d[0] * uu + fr.n[0] * o, y, fr.o[1] + fr.d[1] * uu + fr.n[1] * o];
      const count = (L * b.h) / 90 | 0;
      for (let i = 0; i < count; i++) {
        const u = 1 + R() * (L - 2), y = STORE_H + 2 + Math.floor(R() * Math.max(1, b.h - STORE_H - 4) / 3.4) * 3.4;
        if (coveredBySign(b.id, f, u, y, 0.8, 0.58)) continue;
        const a = P(u, y, 0.02), z = P(u + 0.8, y + 0.58, 0.36);
        dress.box(Math.min(a[0], z[0]), a[1], Math.min(a[2], z[2]), Math.max(a[0], z[0]), z[1], Math.max(a[2], z[2]), { color: 0xc9cac2 });
        // 室外機の黒いファン面
        const fa = P(u + 0.08, y + 0.06, 0.37), fb = P(u + 0.68, y + 0.06, 0.37), fc = P(u + 0.68, y + 0.52, 0.37), fd = P(u + 0.08, y + 0.52, 0.37);
        dress.quad(fa, fb, fc, fd, [0, 0, 1, 1], 0x34363a);
      }
      // 縦樋
      const pipes = Math.max(1, Math.round(L / 16));
      for (let i = 0; i < pipes; i++) {
        const u = ((i + 0.5) / pipes) * L + (R() - 0.5) * 2;
        dress.pipe(P(u, STORE_H, 0.1), P(u, b.h, 0.1), 0.055, 0x8d8e8a, 4);
      }
      // 階ごとの水切り: 実際に張り出す板で、日が当たると壁に細い影を落とす。店のある通り側だけ
      if ((b.shops || '').includes(f)) {
        const M = mats[b.t].userData, fh = M.floorH, ledge = new THREE.Color(M.wall).multiplyScalar(0.92), under = ledge.clone().multiplyScalar(0.6);
        for (let y = STORE_H + fh; y < b.h - 1; y += fh) {
          // 看板に隠れる区間を飛ばして、残りをひと続きの板にする
          let start = -1;
          for (let u = 0; u <= L; u += 1.5) {
            const free = u < L && !coveredBySign(b.id, f, u, y, 1.5, 0.2);
            if (free && start < 0) start = u;
            if (!free && start >= 0) {
              const e = Math.min(u, L), o = 0.2, t = 0.14;
              dress.quad(P(start, y, o), P(e, y, o), P(e, y + t, o), P(start, y + t, o), [0, 0, 1, 1], ledge);
              dress.quad(P(start, y + t, o), P(e, y + t, o), P(e, y + t, 0), P(start, y + t, 0), [0, 0, 1, 1], ledge);
              dress.quad(P(start, y, 0), P(e, y, 0), P(e, y, o), P(start, y, o), [0, 0, 1, 1], under);
              start = -1;
            }
          }
        }
      }
    }
  }

  for (const t of FACADE_TYPES) if (walls[t].count) scene.add(walls[t].mesh(mats[t]));
  const roofMat = new THREE.MeshStandardMaterial({ map: tex.slab.diff, normalMap: tex.slab.nor, roughnessMap: tex.slab.arm, vertexColors: true, roughness: 1 });
  scene.add(roof.mesh(roofMat));
  const dressMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.05, side: THREE.DoubleSide });
  scene.add(dress.mesh(dressMat));
  scene.add(shops.mesh(shopMaterial(SF.tex), { cast: false }));
  const bandMat = new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.5 });
  scene.add(signBand.mesh(bandMat));

  // ─── 遠景(歩けない街区の外)。影は落とさず、霧に溶かす ───
  const far = {}; const farList = ['white', 'beige', 'gray', 'cream'];
  for (const t of farList) far[t] = new Batch();
  const FR = rng(91), WR = rng(92), AR = rng(93), farSigns = [];
  const farDress = new Batch(); // dress は上で確定済みなので、遠景のアンテナは別に持つ
  const addFar = (x0, x1, z0, z1) => {
    for (let x = x0; x < x1;) {
      const w = 14 + FR() * 22;
      for (let z = z0; z < z1;) {
        const d = 14 + FR() * 24, h = 12 + FR() * FR() * 44;
        const t = farList[FR() * farList.length | 0], M = mats[t].userData;
        // 窓の寸法を棟ごとに変えて、同じ型の繰り返しに見せない
        const ws = 0.78 + WR() * 0.5, tw = M.tile[0] * ws, th = M.tile[1] * ws, off = FR();
        // 棟ごとに明るさと色味を変える(同じベージュの列にしない)
        const k = 0.66 + WR() * 0.46, warm = (WR() - 0.5) * 0.14, c = new THREE.Color(k * (1 + warm), k, k * (0.98 - warm));
        const bb = far[t];
        const X0 = x, X1 = x + w - 1, Z0 = z, Z1 = z + d - 1;
        bb.quad([X1, 0, Z1], [X1, 0, Z0], [X1, h, Z0], [X1, h, Z1], [off, 0, off + d / tw, h / th], c);
        bb.quad([X0, 0, Z0], [X0, 0, Z1], [X0, h, Z1], [X0, h, Z0], [off, 0, off + d / tw, h / th], c);
        bb.quad([X0, 0, Z1], [X1, 0, Z1], [X1, h, Z1], [X0, h, Z1], [off, 0, off + w / tw, h / th], c);
        bb.quad([X1, 0, Z0], [X0, 0, Z0], [X0, h, Z0], [X1, h, Z0], [off, 0, off + w / tw, h / th], c);
        roof.quad([X0, h, Z1], [X1, h, Z1], [X1, h, Z0], [X0, h, Z0], [0, 0, 2, 2], 0x777775);
        // 街区の内側を向く面に縦の看板と帯(遠景も看板の街にする)
        if (WR() < 0.55 && h > 16) farSigns.push({ X0, X1, Z0, Z1, h, toX: x0 > 0 ? -1 : x1 < -100 ? 1 : 0, toZ: x0 > 0 || x1 < -100 ? 0 : z0 < 0 ? 1 : -1, u: 0.15 + WR() * 0.7, y: 4 + WR() * (h - 14), sh: 5 + WR() * 4, w: 1.6 + WR() * 1.6, k: 'tate' + (WR() * TATE_COUNT | 0), bandK: 'band' + (WR() * BAND_COUNT | 0), bandY: 3.4 + WR() * 2 });
        // 屋上の塔屋(写真の遠景の輪郭はでこぼこしている)
        if (FR() < 0.6) {
          const px = X0 + (X1 - X0) * (0.2 + FR() * 0.4), pz = Z0 + (Z1 - Z0) * (0.2 + FR() * 0.4), pw = 3 + FR() * 6, pd = 3 + FR() * 5;
          roof.box(px, h, pz, Math.min(X1, px + pw), h + 2.5 + FR() * 4, Math.min(Z1, pz + pd), { scale: 4, color: 0x8c8c88 });
        }
        // 広場から見える棟だけ、上階の後退と写真の空に立つアンテナ塔を足す。乱数は AR に分けて配置を動かさない
        const dPlaza = Math.hypot((X0 + X1) / 2, (Z0 + Z1) / 2 + 50);
        if (dPlaza < 240 && h > 18 && AR() < 0.45) {
          const c2 = c.clone().multiplyScalar(0.9), i = 2 + AR() * 3, top = h + 3 + AR() * 7;
          const a0 = X0 + i, a1 = X1 - i, b0 = Z0 + i, b1 = Z1 - i, tw2 = (a1 - a0) / tw, td2 = (b1 - b0) / tw, th2 = (top - h) / th;
          bb.quad([a1, h, b1], [a1, h, b0], [a1, top, b0], [a1, top, b1], [off, 0, off + td2, th2], c2);
          bb.quad([a0, h, b0], [a0, h, b1], [a0, top, b1], [a0, top, b0], [off, 0, off + td2, th2], c2);
          bb.quad([a0, h, b1], [a1, h, b1], [a1, top, b1], [a0, top, b1], [off, 0, off + tw2, th2], c2);
          bb.quad([a1, h, b0], [a0, h, b0], [a0, top, b0], [a1, top, b0], [off, 0, off + tw2, th2], c2);
        }
        if (dPlaza < 320 && h > 24 && AR() < 0.55) {
          const ax = X0 + (X1 - X0) * (0.25 + AR() * 0.5), az = Z0 + (Z1 - Z0) * (0.25 + AR() * 0.5);
          farDress.pipe([ax, h, az], [ax, h + 7 + AR() * 10, az], 0.1, 0x55575a, 4);
        }
        z += d;
      }
      x += w;
    }
  };
  addFar(108, 340, -340, 330);      // 高架の東
  addFar(-430, -196, -340, 330);    // 中央通りの西の奥
  addFar(-80, 106, -350, -232);     // 北
  addFar(-82, 106, 124, 330);       // 南
  for (const t of farList) scene.add(far[t].mesh(mats[t], { cast: false, receive: false }));
  scene.add(farDress.mesh(dressMat, { cast: false, receive: false }));
  // 遠景のビルの屋上に立つ大看板(写真 2 枚目の東の空の並び)
  const boards = new Batch();
  const bd = (x, y, z, w, h, k) => boards.quad([x, y, z + w / 2], [x, y, z - w / 2], [x, y + h, z - w / 2], [x, y + h, z + w / 2], atlas.uv[k]);
  // 視線の先が西向き(東を見る)ので西面に見せる
  const bdW = (x, y, z, w, h, k) => boards.quad([x, y, z - w / 2], [x, y, z + w / 2], [x, y + h, z + w / 2], [x, y + h, z - w / 2], atlas.uv[k]);
  bdW(128, 38, -80, 7, 8, 'rich'); bdW(160, 46, -165, 13, 13, 'kintetsu'); bdW(120, 34, -28, 8, 5, 'sogo');
  void bd;
  for (const s of farSigns) {
    const O = 0.25, top = Math.min(s.y + s.sh, s.h - 0.5);
    if (s.toX) {
      const X = (s.toX > 0 ? s.X1 : s.X0) + s.toX * O, L = s.Z1 - s.Z0, zc = s.Z0 + L * s.u;
      boards.quad([X, s.y, zc - s.w / 2], [X, s.y, zc + s.w / 2], [X, top, zc + s.w / 2], [X, top, zc - s.w / 2], atlas.uv[s.k]);
      boards.quad([X, s.bandY, s.Z0 + 0.5], [X, s.bandY, s.Z1 - 0.5], [X, s.bandY + 1.1, s.Z1 - 0.5], [X, s.bandY + 1.1, s.Z0 + 0.5], atlas.uv[s.bandK]);
    } else {
      const Z = (s.toZ > 0 ? s.Z1 : s.Z0) + s.toZ * O, L = s.X1 - s.X0, xc = s.X0 + L * s.u;
      boards.quad([xc - s.w / 2, s.y, Z], [xc + s.w / 2, s.y, Z], [xc + s.w / 2, top, Z], [xc - s.w / 2, top, Z], atlas.uv[s.k]);
      boards.quad([s.X0 + 0.5, s.bandY, Z], [s.X1 - 0.5, s.bandY, Z], [s.X1 - 0.5, s.bandY + 1.1, Z], [s.X0 + 0.5, s.bandY + 1.1, Z], atlas.uv[s.bandK]);
    }
  }
  scene.add(boards.mesh(new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.6, side: THREE.DoubleSide }), { cast: false, receive: false }));
  return { byId };
}
