// 歩行・ジャンプ・カメラ切替・エモート・ボール。当たりは xz 平面の箱(50m 格子で検索)。
import * as THREE from 'three';
import { BOUNDS, WALKS, HOOPS, SPAWN } from './layout.js';

export class World {
  constructor(sunDir) { this.rects = []; this.grid = new Map(); this.tall = []; this.sunDir = sunDir; }
  key(ix, iz) { return (ix + 200) * 1000 + (iz + 200); }
  add(x0, z0, x1, z1, soft) {
    const r = [x0, z0, x1, z1, soft === 'soft'];
    const i = this.rects.push(r) - 1;
    for (let ix = Math.floor(x0 / 25); ix <= Math.floor(x1 / 25); ix++) for (let iz = Math.floor(z0 / 25); iz <= Math.floor(z1 / 25); iz++) {
      const k = this.key(ix, iz); let l = this.grid.get(k); if (!l) this.grid.set(k, l = []); l.push(i);
    }
  }
  addTall(x0, z0, x1, z1, h) { this.tall.push([x0, z0, x1, z1, h]); this.add(x0, z0, x1, z1); }
  near(x, z) { return this.grid.get(this.key(Math.floor(x / 25), Math.floor(z / 25))) || []; }
  // 半径 r の円を箱から押し出す
  push(p, r) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const seen = new Set();
      for (let ix = Math.floor((p.x - r) / 25); ix <= Math.floor((p.x + r) / 25); ix++) for (let iz = Math.floor((p.z - r) / 25); iz <= Math.floor((p.z + r) / 25); iz++) {
        const l = this.grid.get(this.key(ix, iz)); if (!l) continue;
        for (const i of l) {
          if (seen.has(i)) continue; seen.add(i);
          const b = this.rects[i];
          const cx = Math.max(b[0], Math.min(p.x, b[2])), cz = Math.max(b[1], Math.min(p.z, b[3]));
          let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          hit = true;
          if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
          else {
            // 中心が箱の中: 最短の面へ
            const c = [p.x - b[0], b[2] - p.x, p.z - b[1], b[3] - p.z]; let m = 0; for (let j = 1; j < 4; j++) if (c[j] < c[m]) m = j;
            if (m === 0) p.x = b[0] - r; else if (m === 1) p.x = b[2] + r; else if (m === 2) p.z = b[1] - r; else p.z = b[3] + r;
          }
        }
      }
    }
    return hit;
  }
  groundAt(x, z) {
    for (const w of WALKS) if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) return 0.14;
    return 0;
  }
  // その地点に日が当たるか(建物の箱を太陽方向へたどる)
  sunlit(x, z) {
    const s = this.sunDir; const k = 1 / Math.max(0.05, s.y);
    const ux = s.x * k, uz = s.z * k; // 高さ 1m あたりの水平移動
    for (const b of this.tall) {
      // 太陽方向の射線が箱の上空 h 以下を通るか
      let tmin = 0, tmax = b[4];
      for (const [o, d, lo, hi] of [[x, ux, b[0], b[2]], [z, uz, b[1], b[3]]]) {
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { tmin = 1; tmax = 0; } continue; }
        let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
        tmin = Math.max(tmin, a); tmax = Math.min(tmax, c);
      }
      if (tmin < tmax) return false;
    }
    return true;
  }
}

const SPEED_WALK = 1.75, SPEED_RUN = 4.6;

export function createPlayer({ camera, world, me, input, ui, scene }) {
  const pos = { x: SPAWN.x, y: world.groundAt(SPAWN.x, SPAWN.z), z: SPAWN.z };
  const s = { yaw: SPAWN.yaw, pitch: 0.02, vy: 0, grounded: true, third: false, moving: 0, phase: 0, emote: null, emoteT: 0, score: 0, shots: 0 };
  const eye = 1.56;

  // ボール
  const ball = {
    p: new THREE.Vector3(-2, 0.13, -46), v: new THREE.Vector3(), held: false, spin: 0,
    mesh: new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), new THREE.MeshStandardMaterial({ color: 0xc8541f, roughness: 0.6 })),
  };
  scene.add(ball.mesh);
  // 頭上のネームプレート(三人称のときだけ見える)
  const plate = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 72;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(16,20,26,0.82)'; g.fillRect(0, 0, 256, 72);
    g.fillStyle = '#f5c518'; g.fillRect(0, 0, 6, 72);
    g.fillStyle = '#f2efe6'; g.font = '700 34px "Noto Sans JP", "Yu Gothic", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('あなた', 131, 38);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false }));
    sp.scale.set(0.62, 0.174, 1); sp.visible = false; sp.renderOrder = 20;
    scene.add(sp); return sp;
  })();
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  ballShadow.rotation.x = -Math.PI / 2; scene.add(ballShadow);

  const fwd = () => [-Math.sin(s.yaw), -Math.cos(s.yaw)];
  const throwBall = () => {
    const f = fwd(), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
    ball.held = false; s.shots++;
    ball.p.set(pos.x + f[0] * 0.45, pos.y + 1.85, pos.z + f[1] * 0.45);
    // 近いゴールを向いて投げたら弾道を解く(自動補正は控えめに)
    let best = null, bd = 13;
    for (const h of HOOPS) {
      if (!h.rim) continue;
      const dx = h.rim.x - ball.p.x, dz = h.rim.z - ball.p.z, d = Math.hypot(dx, dz);
      const face = (dx * f[0] + dz * f[1]) / (d || 1);
      if (d < bd && face > 0.82) { bd = d; best = h; }
    }
    if (best) {
      const r = best.rim, T = 0.8 + bd * 0.1, err = bd * 0.012; // 山なりに落とす(浅い弾道は手前のリングで弾かれる)
      const tx = r.x + (Math.random() - 0.5) * err * 2, tz = r.z + (Math.random() - 0.5) * err * 2;
      ball.v.set((tx - ball.p.x) / T, (r.y - ball.p.y + 0.5 * 9.8 * T * T) / T, (tz - ball.p.z) / T);
    } else {
      const sp0 = 8.4; ball.v.set(f[0] * cp * sp0, Math.max(sp, -0.2) * sp0 + 3.6, f[1] * cp * sp0);
    }
    s.emote = 'shoot'; s.emoteT = 0.55;
  };
  const scored = new Set();

  const updateBall = (dt) => {
    if (ball.held) {
      const f = fwd(), dribble = s.moving > 0.2 ? Math.abs(Math.sin(performance.now() * 0.0085)) : 1;
      ball.p.set(pos.x + f[0] * 0.48 + f[1] * -0.22, pos.y + 0.13 + dribble * 0.74, pos.z + f[1] * 0.48 + f[0] * 0.22);
    } else {
      ball.v.y -= 9.8 * dt;
      ball.p.addScaledVector(ball.v, dt);
      const g = world.groundAt(ball.p.x, ball.p.z) + 0.12;
      if (ball.p.y < g) { ball.p.y = g; if (ball.v.y < 0) ball.v.y = -ball.v.y * 0.72; ball.v.x *= 0.8; ball.v.z *= 0.8; if (Math.abs(ball.v.y) < 0.6) ball.v.y = 0; }
      if (ball.p.y < 1.5) {
        const before = { x: ball.p.x, z: ball.p.z }, p = { x: ball.p.x, z: ball.p.z };
        if (world.push(p, 0.13)) {
          ball.p.x = p.x; ball.p.z = p.z;
          const nx = p.x - before.x, nz = p.z - before.z, l = Math.hypot(nx, nz) || 1;
          const vn = (ball.v.x * nx + ball.v.z * nz) / l;
          if (vn < 0) { ball.v.x -= (1.65 * vn * nx) / l; ball.v.z -= (1.65 * vn * nz) / l; }
        }
      } else if (world.push({ x: ball.p.x, z: ball.p.z }, 0.13) && ball.p.y < 2) { ball.v.x *= -0.5; ball.v.z *= -0.5; }
      for (const h of HOOPS) {
        if (!h.rim) continue;
        // ボード
        const dB = (ball.p.x - h.x) * h.dx + (ball.p.z - h.z) * h.dz;
        const side = Math.abs((ball.p.x - h.x) * h.dz - (ball.p.z - h.z) * h.dx);
        if (Math.abs(dB) < 0.14 && side < 0.92 && ball.p.y > 2.9 && ball.p.y < 3.95) {
          const vn = ball.v.x * h.dx + ball.v.z * h.dz;
          if (vn * dB < 0) { ball.v.x -= 1.65 * vn * h.dx; ball.v.z -= 1.65 * vn * h.dz; }
          ball.p.x += h.dx * Math.sign(dB) * (0.14 - Math.abs(dB)); ball.p.z += h.dz * Math.sign(dB) * (0.14 - Math.abs(dB));
        }
        // リング(トーラスへの距離)
        const rx = ball.p.x - h.rim.x, rz = ball.p.z - h.rim.z, rr = Math.hypot(rx, rz), ry = ball.p.y - h.rim.y;
        const toRing = Math.hypot(rr - 0.23, ry);
        if (toRing < 0.13 && rr > 0.001) {
          const nx = (rx / rr) * (rr - 0.23) / toRing, ny = ry / toRing, nz = (rz / rr) * (rr - 0.23) / toRing;
          const vn = ball.v.x * nx + ball.v.y * ny + ball.v.z * nz;
          if (vn < 0) { ball.v.x -= 1.5 * vn * nx; ball.v.y -= 1.5 * vn * ny; ball.v.z -= 1.5 * vn * nz; }
          ball.p.x += nx * (0.13 - toRing); ball.p.y += ny * (0.13 - toRing); ball.p.z += nz * (0.13 - toRing);
        }
        // 得点: 上からリングの内側を通過
        const prevY = ball.p.y - ball.v.y * dt;
        if (ball.v.y < 0 && prevY > h.rim.y && ball.p.y <= h.rim.y && rr < 0.2 && !scored.has(h)) {
          scored.add(h); s.score++; ui.toast(`ナイスシュート(${s.score}本目)`);
          ball.v.x *= 0.15; ball.v.z *= 0.15; ball.v.y = Math.max(ball.v.y, -2);
          setTimeout(() => scored.delete(h), 1200);
        }
      }
      // 地上で止まった/遠くへ行ったボールは手元へ戻せる位置に置く
      const d = Math.hypot(ball.p.x - pos.x, ball.p.z - pos.z);
      if (d < 0.8 && ball.p.y < 1.6 && ball.pickDelay <= 0) { ball.held = true; ui.toast('ボールを持った(クリック/F で投げる)'); }
      ball.pickDelay = (ball.pickDelay || 0) - dt;
    }
    ball.mesh.position.copy(ball.p);
    ball.mesh.rotation.x += ball.v.length() * dt * 2;
    const g2 = world.groundAt(ball.p.x, ball.p.z) + 0.02;
    ballShadow.position.set(ball.p.x, g2, ball.p.z);
    ballShadow.material.opacity = THREE.MathUtils.clamp(0.5 - (ball.p.y - g2) * 0.1, 0.05, 0.5);
  };

  let shake = 0;
  const teleport = (x, z, yaw, pitch = 0) => {
    pos.x = x; pos.z = z; pos.y = world.groundAt(x, z); s.vy = 0; if (yaw !== undefined) s.yaw = yaw; s.pitch = pitch;
  };

  const update = (dt, f, t) => {
    // 視点
    const sens = 0.0021;
    s.yaw -= f.lookDX * sens; s.pitch = THREE.MathUtils.clamp(s.pitch - f.lookDY * sens, -1.2, 1.2);
    // 歩行(カメラ基準)
    const mag = Math.min(1, Math.hypot(f.mx, f.my));
    const run = f.sprint;
    const speed = (run ? SPEED_RUN : SPEED_WALK) * mag;
    const fw = fwd(), rx = -fw[1], rz = fw[0];
    const n = Math.hypot(f.mx, f.my) || 1;
    const mx = (rx * f.mx + fw[0] * f.my) / n * speed, mz = (rz * f.mx + fw[1] * f.my) / n * speed;
    const prev = { x: pos.x, z: pos.z };
    pos.x += mx * dt; pos.z += mz * dt;
    const before = { x: pos.x, z: pos.z };
    world.push(pos, 0.3);
    // 外枠
    const out = pos.x < BOUNDS.x0 || pos.x > BOUNDS.x1 || pos.z < BOUNDS.z0 || pos.z > BOUNDS.z1;
    pos.x = THREE.MathUtils.clamp(pos.x, BOUNDS.x0, BOUNDS.x1); pos.z = THREE.MathUtils.clamp(pos.z, BOUNDS.z0, BOUNDS.z1);
    if (out && t - shake > 4) { shake = t; ui.toast('この先は工事中で通れません'); }
    // 接地: 歩道の段差はそのまま乗り越える
    const ground = world.groundAt(pos.x, pos.z);
    if (s.grounded) { pos.y += (ground - pos.y) * Math.min(1, dt * 12); }
    if (f.jump && s.grounded) { s.vy = 3.9; s.grounded = false; }
    if (!s.grounded) { s.vy -= 9.8 * dt; pos.y += s.vy * dt; if (pos.y <= ground) { pos.y = ground; s.grounded = true; s.vy = 0; } }
    const moved = Math.hypot(pos.x - prev.x, pos.z - prev.z) / Math.max(dt, 1e-3);
    s.moving = moved;
    s.phase += dt * moved * 3.4;

    // エモート
    if (f.emote1) { s.emote = 'wave'; s.emoteT = 2.4; }
    if (f.emote2) { s.emote = 'shoot'; s.emoteT = 0.8; }
    if (s.emoteT > 0) { s.emoteT -= dt; if (s.emoteT <= 0) s.emote = null; }
    if (f.toggleCam) s.third = !s.third;
    if (f.throw && ball.held) { throwBall(); ball.pickDelay = 1.2; }

    me.x = pos.x; me.z = pos.z; me.g = pos.y; me.jumpY = 0; me.yaw = s.yaw + (me.bodyTwist || 0);
    me.phase = s.phase;
    me.mode = s.emote || (moved > 2.5 ? 'run' : moved > 0.2 ? 'walk' : 'idle');
    me.poseT = s.emoteT; me.visible = s.third;
    plate.visible = s.third; plate.position.set(pos.x, pos.y + 2.02, pos.z);
    updateBall(dt);

    // カメラ
    const bob = !s.third && s.grounded && moved > 0.2 ? Math.sin(s.phase * 2) * 0.016 * Math.min(moved, 3) : 0;
    const look = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
    if (!s.third) {
      camera.position.set(pos.x, pos.y + eye + bob, pos.z);
    } else {
      // 肩越し。壁に寄ったら近づく
      const head = new THREE.Vector3(pos.x + rx * 0.35, pos.y + 1.55, pos.z + rz * 0.35);
      let d = 4.2;
      for (let k = 0.5; k <= 4.2; k += 0.25) {
        const px = head.x - look.x * k, pz = head.z - look.z * k;
        const q = { x: px, z: pz };
        if (world.push(q, 0.18) && !world.near(px, pz).some((i) => world.rects[i][4])) { d = k - 0.25; break; }
      }
      camera.position.copy(head).addScaledVector(look, -Math.max(0.6, d));
      camera.position.y = Math.max(camera.position.y, ground + 0.25);
    }
    camera.lookAt(camera.position.clone().add(look));
    void before;
  };
  return { update, pos, s, ball, teleport, get holding() { return ball.held; }, throwBall };
}
