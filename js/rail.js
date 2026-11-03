// 高架: 山手・京浜東北の南北の高架(写真のクリーム色のアーチ)と、その上を横切る総武線。駅舎と電車。
import * as THREE from 'three';
import { Batch } from './batch.js';

const NS = { x0: 66, x1: 96, deck: 8.6, z0: -340, z1: 330 };          // 南北(山手・京浜東北)
const EW = { z0: 56, z1: 72, deck: 13.2, x0: -470, x1: 340 };         // 東西(総武)

function trainTexture(aniso) {
  // 1 両ぶんの側面。色帯は別途 map を変えず vertexColor で出す。上から 屋根/窓帯/腰
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c9ccce'; g.fillRect(0, 0, 1024, 128);
  for (let x = 0; x < 1024; x += 8) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(x, 0, 1, 128); }
  g.fillStyle = '#ffffff'; // 色帯は白で抜き、頂点色を乗せる
  g.fillRect(0, 22, 1024, 12);
  const win = (x, w, y, h) => { g.fillStyle = '#12181c'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(160,190,210,0.25)'; g.fillRect(x, y, w, h * 0.35); };
  for (let d = 0; d < 4; d++) {
    const dx = 80 + d * 240;
    g.fillStyle = '#b2b5b6'; g.fillRect(dx, 26, 56, 92); win(dx + 4, 22, 34, 44); win(dx + 30, 22, 34, 44);
    if (d < 3) { win(dx + 70, 74, 36, 34); win(dx + 150, 74, 36, 34); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
}

function makeTrain(tex, band, cars = 6, carLen = 20) {
  const b = new Batch();
  const W = 2.9, H = 3.7, base = 0.9;
  for (let i = 0; i < cars; i++) {
    const x0 = i * carLen + 0.35, x1 = (i + 1) * carLen - 0.35;
    const col = band;
    // 両側面
    b.quad([x0, base, W / 2], [x1, base, W / 2], [x1, H, W / 2], [x0, H, W / 2], [0, 0, 1, 1], col);
    b.quad([x1, base, -W / 2], [x0, base, -W / 2], [x0, H, -W / 2], [x1, H, -W / 2], [0, 0, 1, 1], col);
    // 妻面(黒に近い uv)と屋根
    b.quad([x1, base, W / 2], [x1, base, -W / 2], [x1, H, -W / 2], [x1, H, W / 2], [0.09, 0.8, 0.095, 0.85], 0x9a9a9a);
    b.quad([x0, base, -W / 2], [x0, base, W / 2], [x0, H, W / 2], [x0, H, -W / 2], [0.09, 0.8, 0.095, 0.85], 0x9a9a9a);
    b.quad([x0, H, W / 2], [x1, H, W / 2], [x1, H + 0.22, W / 4], [x0, H + 0.22, W / 4], [0.0, 0.98, 0.002, 0.99], 0x6e7073);
    b.quad([x1, H, -W / 2], [x0, H, -W / 2], [x0, H + 0.22, -W / 4], [x1, H + 0.22, -W / 4], [0.0, 0.98, 0.002, 0.99], 0x6e7073);
    b.quad([x0, H + 0.22, W / 4], [x1, H + 0.22, W / 4], [x1, H + 0.22, -W / 4], [x0, H + 0.22, -W / 4], [0.0, 0.98, 0.002, 0.99], 0x6e7073);
    // 床下機器
    b.box(x0 + 2, 0.15, -1.2, x1 - 2, base, 1.2, { color: 0x24262a, scale: 40 });
    // 冷房機
    b.box(x0 + 5, H + 0.2, -0.9, x0 + 8, H + 0.5, 0.9, { color: 0x8f9193, scale: 40 });
    b.box(x1 - 8, H + 0.2, -0.9, x1 - 5, H + 0.5, 0.9, { color: 0x8f9193, scale: 40 });
  }
  const m = new THREE.Mesh(b.build(), new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.32, metalness: 0.65 }));
  m.castShadow = false; m.receiveShadow = false;
  m.userData.len = cars * carLen;
  return m;
}

// 高架と駅の当たり判定(buildRail の柱の並びと同じ)
export function addRailColliders(world) {
  world.addTall(46, 22, 96, 56, 13);
  for (let z = NS.z0; z < NS.z1; z += 9.8) {
    if (z > 18 && z < 56) continue;
    for (const x of [NS.x0, NS.x0 + 10, NS.x0 + 20, NS.x1 - 1.3]) world.add(x, z, x + 1.3, z + 1.3);
  }
  // 総武線のガード下は店で塞がる。路地(x -92〜-78)と中央通りだけ抜けられる
  world.add(-126, EW.z0, -92, EW.z1);
  world.add(-78, EW.z0, 46, EW.z1);
  world.tall.push([-126, EW.z0, 96, EW.z1, EW.deck], [-470, EW.z0, -153, EW.z1, EW.deck]);
  world.tall.push([NS.x0, -340, NS.x1, 330, NS.deck]);
}

export function buildRail(scene, tex, aniso) {
  const cream = new Batch(), gray = new Batch(), steel = new Batch(), dress = new Batch(), concrete = new Batch();
  const CREAM = 0xe9e0c4, CREAM_D = 0xc9c0a4;

  // ── 南北の高架(写真 2 枚目): クリーム色の柱+持ち送り+連続梁。駅舎より北だけ開放
  const span = 9.8;
  for (let z = NS.z0; z < NS.z1; z += span) {
    if (z > 18 && z < 56) continue; // 駅舎の中
    for (const x of [NS.x0, NS.x0 + 10, NS.x0 + 20, NS.x1 - 1.3]) {
      cream.box(x, 0, z, x + 1.3, NS.deck - 1.3, z + 1.3, { color: CREAM, scale: 2.6 });
      // 持ち送り
      cream.box(x - 0.35, NS.deck - 2.4, z - 0.35, x + 1.65, NS.deck - 1.3, z + 1.65, { color: CREAM, scale: 2.6 });
    }
    // 梁(柱間で下がる)
    cream.box(NS.x0, NS.deck - 2.0, z, NS.x1, NS.deck - 1.3, z + 1.3, { color: CREAM_D, scale: 2.6 });
  }
  cream.box(NS.x0 - 0.3, NS.deck - 1.3, NS.z0, NS.x1 + 0.3, NS.deck, NS.z1, { color: CREAM, scale: 3, bottom: true });
  // 欄干
  cream.box(NS.x0 - 0.3, NS.deck, NS.z0, NS.x0, NS.deck + 1.1, NS.z1, { color: CREAM, scale: 3 });
  cream.box(NS.x1, NS.deck, NS.z0, NS.x1 + 0.3, NS.deck + 1.1, NS.z1, { color: CREAM, scale: 3 });
  // 砕石
  gray.box(NS.x0, NS.deck, NS.z0, NS.x1, NS.deck + 0.3, NS.z1, { color: 0x5b5752, scale: 2 });

  // ── 東西の高架(総武線): 濃い灰のコンクリート+道路の上は鋼桁
  const roadGap = (x) => (x > -152 && x < -126);
  for (let x = EW.x0; x < EW.x1; x += 14) {
    if (roadGap(x) || roadGap(x + 2) || (x > 42 && x < 98)) continue;
    for (const z of [EW.z0 + 0.5, EW.z1 - 2]) gray.box(x, 0, z, x + 1.6, EW.deck - 1.4, z + 1.5, { color: 0xa9a79f, scale: 3 });
    gray.box(x - 0.4, EW.deck - 3, EW.z0, x + 2, EW.deck - 1.4, EW.z1, { color: 0x9f9d96, scale: 3 });
  }
  gray.box(EW.x0, EW.deck - 1.4, EW.z0, -152, EW.deck, EW.z1, { color: 0xa5a39b, scale: 3, bottom: true });
  gray.box(-126, EW.deck - 1.4, EW.z0, EW.x1, EW.deck, EW.z1, { color: 0xa5a39b, scale: 3, bottom: true });
  // 中央通りをまたぐ鋼桁(リベット感は法線なしで段差で)
  const gir = 0x4f6a63;
  steel.box(-152, EW.deck - 2.6, EW.z0, -126, EW.deck, EW.z0 + 0.6, { color: gir });
  steel.box(-152, EW.deck - 2.6, EW.z1 - 0.6, -126, EW.deck, EW.z1, { color: gir });
  for (let x = -152; x < -126; x += 2) { steel.box(x, EW.deck - 2.6, EW.z0 - 0.05, x + 0.14, EW.deck, EW.z0 + 0.65, { color: 0x3f564f }); steel.box(x, EW.deck - 2.6, EW.z1 - 0.65, x + 0.14, EW.deck, EW.z1 + 0.05, { color: 0x3f564f }); }
  steel.box(-152, EW.deck - 0.6, EW.z0, -126, EW.deck, EW.z1, { color: 0x3b4a47, bottom: true });
  // 道路両脇の橋脚
  for (const x of [-153.5, -126]) gray.box(x, 0, EW.z0, x + 1.8, EW.deck - 1.4, EW.z1, { color: 0xa39f97, scale: 3 });
  gray.box(EW.x0, EW.deck, EW.z0, EW.x1, EW.deck + 1.1, EW.z0 + 0.3, { color: 0xb0aea6, scale: 3 });
  gray.box(EW.x0, EW.deck, EW.z1 - 0.3, EW.x1, EW.deck + 1.1, EW.z1, { color: 0xb0aea6, scale: 3 });

  // ── 駅舎(写真右の灰色の壁): 電気街口。高架の真下から道路へ出る
  const st = { x0: 46, x1: 66, z0: 22, z1: 56 };
  concrete.box(st.x0, 0, st.z0, st.x1, 12, st.z1, { color: 0xb3b1a8, scale: 3 });
  concrete.box(st.x0 - 0.2, 12, st.z0 - 0.2, 96, 13.2, 56, { color: 0x9f9e96, scale: 3 });
  concrete.box(66, 0, 22, 96, 8.6, 56, { color: 0xa7a59c, scale: 3 });
  // 改札前の大庇と入口の暗がり
  dress.box(st.x0 - 2.5, 3.6, st.z0 - 3, st.x1 + 1, 4, st.z0, { color: 0x6c6e70 });
  dress.quad([st.x1, 0, st.z0 - 0.04], [st.x0, 0, st.z0 - 0.04], [st.x0, 3.6, st.z0 - 0.04], [st.x1, 3.6, st.z0 - 0.04], [0, 0, 1, 1], 0x14171a);
  for (let x = st.x0 + 2.5; x < st.x1; x += 4) dress.box(x, 0, st.z0 - 0.5, x + 0.5, 3.6, st.z0 - 0.04, { color: 0x8d8d86 });
  // ホーム屋根(青緑の波板、写真 3 枚目)
  const teal = 0x4c8c95;
  for (const zr of [[-40, 18], [18, 56]]) {
    for (const x of [NS.x0 + 6, NS.x0 + 16.5]) {
      dress.box(x, NS.deck + 5.3, zr[0], x + 8.5, NS.deck + 5.55, zr[1], { color: teal });
      for (let z = zr[0] + 4; z < zr[1]; z += 10) dress.pipe([x + 4.2, NS.deck, z], [x + 4.2, NS.deck + 5.3, z], 0.12, 0x6d7a77);
    }
  }
  // 北へ続く架線柱
  for (let z = NS.z0; z < NS.z1; z += 42) {
    for (const x of [NS.x0 + 0.5, NS.x1 - 0.5]) steel.pipe([x, NS.deck, z], [x, NS.deck + 7.2, z], 0.11, 0x5c6c63);
    steel.pipe([NS.x0 + 0.5, NS.deck + 7, z], [NS.x1 - 0.5, NS.deck + 7, z], 0.09, 0x5c6c63);
    steel.pipe([NS.x0 + 0.5, NS.deck + 6.2, z], [NS.x1 - 0.5, NS.deck + 6.2, z], 0.07, 0x5c6c63);
  }
  for (let x = EW.x0; x < EW.x1; x += 44) {
    for (const z of [EW.z0 + 0.4, EW.z1 - 0.4]) steel.pipe([x, EW.deck, z], [x, EW.deck + 7, z], 0.1, 0x5c6c63);
    steel.pipe([x, EW.deck + 6.8, EW.z0 + 0.4], [x, EW.deck + 6.8, EW.z1 - 0.4], 0.08, 0x5c6c63);
  }
  // ガード下の店: 間口の暗がりと帯(高架南の通りに面する)
  const shutters = new Batch();
  for (let x = -122; x < 40; x += 14) {
    if (x > -92 && x < -78) continue;
    // 午前は半分ほどシャッターが下りたまま
    if (((x + 200) / 14 | 0) % 2) shutters.box(x + 1.7, 0, EW.z1 - 3, x + 13.8, 3.6, EW.z1 - 2.6, { color: 0xd8d8d2, scale: 3.6 });
    else dress.box(x + 1.7, 0, EW.z1 - 3, x + 13.8, 3.6, EW.z1 - 2.6, { color: 0x3a3b38 });
    dress.box(x + 1.7, 3.6, EW.z1 - 3, x + 13.8, 4.5, EW.z1 - 2.5, { color: [0xc9311f, 0x1a4d9a, 0xcdb32f, 0x136f4e][((x + 200) / 14 | 0) % 4] });
  }

  // 実写の素地は暗いので、頂点色の明度が届くよう材質色を 1 超で持ち上げる
  const creamMat = new THREE.MeshStandardMaterial({ map: tex.viaduct.diff, normalMap: tex.viaduct.nor, roughnessMap: tex.viaduct.arm, roughness: 1, vertexColors: true, color: new THREE.Color(1.8, 1.82, 2.05) }); // 青を強めるのは素地の茶色みを打ち消すため
  scene.add(cream.mesh(creamMat));
  scene.add(gray.mesh(creamMat));
  scene.add(concrete.mesh(creamMat));
  const plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });
  scene.add(steel.mesh(plain));
  scene.add(dress.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })));

  scene.add(shutters.mesh(new THREE.MeshStandardMaterial({ map: tex.shutter.diff, normalMap: tex.shutter.nor, roughness: 0.6, vertexColors: true })));

  // ── 電車 ──
  const T = trainTexture(aniso);
  const mk = (band) => { const m = makeTrain(T, band); scene.add(m); return m; };
  const yama = 0x8fc31f, keihin = 0x3aa3dc, sobu = 0xf1c40f;
  const runs = [
    { m: mk(yama), axis: 'z', x: NS.x0 + 6, y: NS.deck + 0.3, dir: -1, speed: 13.5, phase: 0 },
    { m: mk(keihin), axis: 'z', x: NS.x0 + 14, y: NS.deck + 0.3, dir: 1, speed: 15, phase: 0.4 },
    { m: mk(yama), axis: 'z', x: NS.x0 + 18, y: NS.deck + 0.3, dir: 1, speed: 12.5, phase: 0.7 },
    { m: mk(keihin), axis: 'z', x: NS.x0 + 25, y: NS.deck + 0.3, dir: -1, speed: 14, phase: 0.15 },
    { m: mk(sobu), axis: 'x', z: EW.z0 + 5, y: EW.deck + 0.3, dir: 1, speed: 13, phase: 0.1 },
    { m: mk(sobu), axis: 'x', z: EW.z1 - 5, y: EW.deck + 0.3, dir: -1, speed: 14, phase: 0.55 },
  ];
  const span0 = 900; // 画面外まで走り抜けて、間隔を空けて戻る
  const update = (t) => {
    for (const r of runs) {
      const s = ((t * r.speed + r.phase * span0 * 1.6) % (span0 * 1.6)) - span0 * 0.8;
      const L = r.m.userData.len;
      if (r.axis === 'z') {
        const p = s * r.dir;
        r.m.rotation.y = -Math.PI / 2 * 1;
        r.m.position.set(r.x, r.y, p - L / 2);
      } else {
        const p = s * r.dir - 60;
        r.m.position.set(p - L / 2, r.y, r.z);
      }
    }
  };
  update(0);
  return { update };
}
