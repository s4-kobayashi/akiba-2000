// 起動と描画ループ。
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { B, PLACES, ZONES, BOUNDS } from './layout.js';
import { buildSignAtlas, buildSignMeshes } from './signs.js';
import { buildBuildings } from './buildings.js';
import { buildGround } from './ground.js';
import { buildRail, addRailColliders } from './rail.js';
import { buildProps } from './props.js';
import { createPeople } from './people.js';
import { World, createPlayer } from './player.js';
import { buildPost } from './post.js';
import { createUI, createInput } from './ui.js';

const qs = new URLSearchParams(location.search);
const mobile = matchMedia('(pointer: coarse)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);

function fail(msg) {
  $('#fallback').hidden = false; $('#start').hidden = true;
  console.warn(msg);
}

async function main() {
  // 捨てキャンバスで WebGL2 を確かめる(本番キャンバスで先に getContext すると three の属性が無視される)
  if (!document.createElement('canvas').getContext('webgl2')) return fail('WebGL2 非対応');
  const canvas = $('#scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: qs.has('shot') }); }
  catch (e) { return fail(String(e)); }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const progress = (n, label) => { $('#bar').style.transform = `scaleX(${n})`; $('#load-label').textContent = label; };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.08, 1400);
  camera.rotation.order = 'YXZ';

  // ── 素材 ──
  progress(0.05, '路面と壁の素材を読み込み中');
  const manifest = await (await fetch('assets/manifest.json')).json();
  const texLoader = new THREE.TextureLoader();
  const tex = {};
  const names = Object.keys(manifest);
  let done = 0;
  await Promise.all(names.map(async (name) => {
    tex[name] = {};
    await Promise.all(['diff', 'nor', 'arm'].map(async (k) => {
      const t = await texLoader.loadAsync(manifest[name][k]);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
      t.colorSpace = k === 'diff' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex[name][k] = t;
    }));
    done++; progress(0.05 + 0.45 * (done / names.length), '路面と壁の素材を読み込み中');
  }));

  // ── 空と太陽。HDRI の太陽(最も明るい画素)の方位を、写真から読んだ太陽方位に合わせて回す ──
  progress(0.55, '2000 年初夏の空を用意中');
  const hdr = await new RGBELoader().setDataType(THREE.FloatType).loadAsync('assets/hdri/sky.hdr');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const D = hdr.image.data, W = hdr.image.width, H = hdr.image.height;
  let bi = 0, bl = -1;
  for (let i = 0; i < W * H; i += 3) { const l = D[i * 4] + D[i * 4 + 1] + D[i * 4 + 2]; if (l > bl) { bl = l; bi = i; } }
  const sx = bi % W, sy = Math.floor(bi / W);
  const hdrAz = (sx / W) * Math.PI * 2 - Math.PI / 2; // equirect の u から方位へ
  const hdrEl = (0.5 - sy / H) * Math.PI;
  // 目標: 午前 10 時頃、南東の高い太陽(パノラマ写真の、東面が日向で影が北西へ伸びる様子から)
  const target = new THREE.Vector3(0.62, 0, 0.62).normalize();
  const el = THREE.MathUtils.clamp(hdrEl, 0.7, 1.05);
  const sunDir = new THREE.Vector3(target.x * Math.cos(el), Math.sin(el), target.z * Math.cos(el)).normalize();
  const targetAz = Math.atan2(target.z, target.x);
  const rotY = -(targetAz - hdrAz);
  scene.background = hdr; scene.backgroundRotation.set(0, rotY, 0); scene.backgroundIntensity = 0.95;
  // 4K の HDRI を直接引かず、PMREM に畳んだものを IBL にする。半球光は地面からの照り返しの補いだけ
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  pmrem.dispose();
  scene.environmentRotation.set(0, rotY, 0); scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight(0xc4d2e2, 0x9a9488, 0.34));
  scene.fog = new THREE.FogExp2(0xc4d0dc, 0.0019);
  // 空の霞: 都心の夏の白っぽい空(写真の淡い青)へ寄せる。地平ほど濃い
  const haze = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { c: { value: new THREE.Color(0xc9dcf0).multiplyScalar(1.3) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 c; varying vec3 vD; void main(){ float h = clamp(normalize(vD).y, 0.0, 1.0); float a = mix(0.82, 0.1, smoothstep(0.0, 0.5, h)); gl_FragColor = vec4(c, a); }',
  }));
  haze.frustumCulled = false; haze.renderOrder = -10; scene.add(haze);

  const sun = new THREE.DirectionalLight(0xfff0dc, 4.4);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(mobile ? 2048 : 4096);
  sun.shadow.bias = -0.00022; sun.shadow.normalBias = 0.035;
  const SC = sun.shadow.camera; SC.near = 10; SC.far = 800; SC.left = -170; SC.right = 170; SC.top = 170; SC.bottom = -170;
  scene.add(sun, sun.target);
  const placeShadow = (x, z) => {
    sun.target.position.set(x, 0, z);
    sun.position.set(x, 0, z).addScaledVector(sunDir, 400);
    SC.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  };

  // ── 街 ──
  progress(0.6, '電気街の看板を描いています');
  await nextFrame();
  const atlas = buildSignAtlas(aniso);
  const world = new World(sunDir);
  for (const b of B) world.addTall(b.x0, b.z0, b.x1, b.z1, b.h);
  addRailColliders(world);
  progress(0.68, '通りを敷いています');
  await nextFrame();
  buildGround(scene, tex, aniso);
  progress(0.74, '建物を建てています');
  await nextFrame();
  const { byId } = buildBuildings(scene, tex, atlas, aniso);
  buildSignMeshes(atlas, byId, scene);
  progress(0.84, '高架と電車を置いています');
  await nextFrame();
  const rail = buildRail(scene, tex, aniso);
  progress(0.9, '自転車と街灯を並べています');
  await nextFrame();
  const props = buildProps(scene, tex, atlas, world);
  scene.traverse((o) => {
    const m = o.material;
    // 重い面を後から描き、手前に隠れた画素の計算を省く(不透明は renderOrder 順)
    if (m && m.userData && m.userData.tile) o.renderOrder = 2;
    if (m && m.userData && m.userData.groundTop) o.renderOrder = 4;
    if (m && m.userData && m.userData.ground) o.renderOrder = 5;
  });
  const shadowDir = new THREE.Vector2(-sunDir.x / sunDir.y, -sunDir.z / sunDir.y);
  const people = createPeople(scene, shadowDir, world);

  const ui = createUI({ places: PLACES, zones: ZONES, bounds: BOUNDS, buildings: B });
  const input = createInput(canvas, ui);
  const player = createPlayer({ camera, world, me: people.me, input, ui, scene });
  placeShadow(player.pos.x - 60, player.pos.z - 30);

  // ── ポスト ──
  const lowQ = mobile || qs.get('q') === 'low';
  const post = buildPost(renderer, scene, camera, { ao: qs.get('q') === 'high' });
  // 描画解像度の段階。重ければ下へ降りる
  const SCALES = [1, 0.85, 0.72, 0.6];
  let scaleI = lowQ ? 2 : 0;
  let dpr = Math.min(devicePixelRatio, 1.5) * SCALES[scaleI];
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    // 縦画面は横の視野が狭くなりすぎるので広げる
    camera.aspect = w / h; camera.fov = w < h ? 64 : 45; camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    post.setSize(w, h, dpr);
  };
  resize(); addEventListener('resize', resize);

  // ── VR(対応端末のみ入口を出す) ──
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      if (!ok) return;
      renderer.xr.enabled = true;
      const btn = $('#enter-vr'); btn.hidden = false;
      btn.addEventListener('click', async () => {
        const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
        renderer.xr.setReferenceSpaceType('local-floor');
        await renderer.xr.setSession(session);
      });
    }).catch(() => {});
  }

  // ── ループ ──
  const clock = new THREE.Clock();
  let shadowAt = { x: player.pos.x, z: player.pos.z };
  let running = false, started = false, t = 0;
  const fpsBuf = [];
  let slow = 0, upTried = false;
  const loop = () => {
    const dt = Math.min(0.1, clock.getDelta());
    t += dt;
    const f = input.frame();
    if (renderer.xr.isPresenting) {
      // VR ではコントローラのスティックで移動
      for (const src of renderer.xr.getSession().inputSources) {
        const a = src.gamepad?.axes; if (!a || a.length < 4) continue;
        if (src.handedness === 'left') { f.mx = a[2]; f.my = -a[3]; }
        if (src.handedness === 'right') f.lookDX += a[2] * 8;
      }
    }
    player.update(dt, f, t);
    haze.position.copy(camera.position);
    props.updateCars(dt, reduced);
    rail.update(reduced ? 200 : t);
    people.update(dt, t, reduced, camera);
    ui.update(player, f, t);
    // 影は動いたときだけ描き直す(シーン全体を毎フレーム焼くと主因の負荷になる: shiki-no-michi の実測)
    if (Math.hypot(player.pos.x - shadowAt.x, player.pos.z - shadowAt.z) > 40) { shadowAt = { x: player.pos.x, z: player.pos.z }; placeShadow(player.pos.x - 40, player.pos.z - 20); }
    if (renderer.xr.isPresenting) renderer.render(scene, camera);
    else post.render(t);
    // 余裕があれば AO を足し、重いときは AO → 解像度の順に落とす
    fpsBuf.push(dt); if (fpsBuf.length > 40) fpsBuf.shift();
    if (!qs.has('lock') && fpsBuf.length === 40) {
      const avg = fpsBuf.reduce((a, b) => a + b, 0) / 40;
      if (!upTried && !lowQ && avg < 1 / 50) { upTried = true; post.gtao.enabled = true; fpsBuf.length = 0; }
      if (avg > 1 / 24) slow += dt; else slow = 0;
      if (slow > 1.5) {
        slow = 0; fpsBuf.length = 0;
        if (post.gtao.enabled) post.gtao.enabled = false;
        else if (scaleI < SCALES.length - 1) { scaleI++; dpr = Math.min(devicePixelRatio, 1.5) * SCALES[scaleI]; resize(); }
      }
    }
    window.__akiba.frames++;
  };

  // 開始画面の背景は駅前のパノラマを 1 枚だけ描く
  player.teleport(47, 11, Math.PI / 2, 0.03);
  renderer.compile(scene, camera);
  player.update(0.001, { mx: 0, my: 0, lookDX: 0, lookDY: 0 }, 0);
  people.update(0.001, 0, reduced, camera);
  renderer.shadowMap.needsUpdate = true;
  post.render(0);
  progress(1, '準備ができました');
  $('#start').classList.add('ready');

  const begin = (locked = true) => {
    started = true;
    $('#start').hidden = true; $('#hud').hidden = false;
    if (!running) { running = true; renderer.setAnimationLoop(loop); clock.getDelta(); }
    if (locked && !mobile) input.lock();
  };
  $('#join').addEventListener('click', () => begin());
  $('#resume')?.addEventListener('click', () => { ui.closeMenu(); input.lock(); });
  ui.onTeleport = (p) => { player.teleport(p.x, p.z, p.yaw, 0); ui.closeMenu(); input.lock(); };
  document.addEventListener('visibilitychange', () => {
    if (!started) return;
    if (document.hidden) { renderer.setAnimationLoop(null); running = false; }
    else if (!running) { running = true; clock.getDelta(); renderer.setAnimationLoop(loop); }
  });

  addEventListener('pagehide', () => { renderer.setAnimationLoop(null); post.dispose(); renderer.dispose(); });

  // 検証フック
  window.__akiba = {
    frames: 0, player, renderer, scene, camera, post, people, world, sunDir, THREE,
    info: () => ({ ...renderer.info.render, x: player.pos.x, z: player.pos.z, y: player.pos.y, yaw: player.s.yaw, third: player.s.third, score: player.s.score, held: player.ball.held }),
    teleport: (x, z, yaw, pitch) => player.teleport(x, z, yaw, pitch),
    begin, input, placeShadow,
    // 同じ時刻のまま 1 枚描く(撮影用)
    still: (x, z, yaw, pitch = 0, third = false) => {
      player.teleport(x, z, yaw, pitch); player.s.third = third;
      player.update(0.016, { mx: 0, my: 0, lookDX: 0, lookDY: 0 }, t);
      placeShadow(x - 40, z - 20); people.update(0.016, t, reduced, camera);
      post.render(t);
    },
    // 自動歩行テスト: 目標地点へ操作入力で歩き、着けるかを固定刻みで調べる
    walkTo: (x, z, maxSec = 300) => {
      const dt = 1 / 30; let sec = 0; const stuckFrom = [];
      while (sec < maxSec) {
        const dx = x - player.pos.x, dz = z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.8) return { ok: true, sec };
        player.s.yaw = Math.atan2(-dx, -dz);
        player.update(dt, { mx: 0, my: 1, sprint: true, lookDX: 0, lookDY: 0 }, sec);
        sec += dt; stuckFrom.push([player.pos.x, player.pos.z]);
        if (stuckFrom.length > 90) {
          const [ax, az] = stuckFrom.shift();
          if (Math.hypot(ax - player.pos.x, az - player.pos.z) < 0.6) return { ok: false, sec, at: [player.pos.x, player.pos.z] };
        }
      }
      return { ok: false, sec, at: [player.pos.x, player.pos.z], timeout: true };
    },
  };
  if (qs.has('autostart')) begin(false);
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
window.__akiba = { frames: 0 };
main().catch((e) => { console.error(e); $('#load-label').textContent = '読み込みに失敗しました: ' + e.message; });
