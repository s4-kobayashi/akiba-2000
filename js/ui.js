// 入力と画面の案内。VRChat の操作感(メニュー・エモート・カメラ切替・ネームプレート)を、この街の看板の語彙で作る。
const $ = (s) => document.querySelector(s);

export function createInput(canvas, ui) {
  const keys = new Set();
  const edge = { jump: false, throw: false, emote1: false, emote2: false, toggleCam: false };
  let dx = 0, dy = 0, touchMove = [0, 0];
  const inp = { locked: false };

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') { edge.jump = true; e.preventDefault(); }
    if (e.code === 'KeyF') edge.throw = true;
    if (e.code === 'KeyV') edge.toggleCam = true;
    if (e.code === 'Digit1') edge.emote1 = true;
    if (e.code === 'Digit2') edge.emote2 = true;
    if (e.code === 'KeyM' || e.code === 'Tab') { e.preventDefault(); ui.toggleMenu(() => inp.lock(), () => document.exitPointerLock?.()); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === canvas) { if (e.button === 0) edge.throw = true; }
    else if (!ui.menuOpen && !matchMedia('(pointer: coarse)').matches) inp.lock();
  });
  // ポインタロックが許されない環境では、ドラッグで視点を回す
  addEventListener('mousemove', (e) => { if (inp.locked || (inp.lockFailed && (e.buttons & 1) && !ui.menuOpen)) { dx += e.movementX; dy += e.movementY; } });
  document.addEventListener('pointerlockchange', () => {
    inp.locked = document.pointerLockElement === canvas;
    if (!inp.locked && !ui.menuOpen && !$('#hud').hidden) ui.openMenu();
  });
  document.addEventListener('pointerlockerror', () => { inp.lockFailed = true; });

  // タッチ: 左半分=移動、右半分=視点
  let moveId = null, lookId = null, mx0 = 0, my0 = 0, lx = 0, ly = 0;
  const stick = $('#stick');
  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth / 2 && moveId === null) { moveId = t.identifier; mx0 = t.clientX; my0 = t.clientY; stick.hidden = false; stick.style.transform = `translate(${mx0 - 44}px,${my0 - 44}px)`; }
      else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) touchMove = [Math.max(-1, Math.min(1, (t.clientX - mx0) / 50)), Math.max(-1, Math.min(1, -(t.clientY - my0) / 50))];
      if (t.identifier === lookId) { dx += (t.clientX - lx) * 2.2; dy += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const tend = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; touchMove = [0, 0]; stick.hidden = true; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  canvas.addEventListener('touchend', tend); canvas.addEventListener('touchcancel', tend);
  for (const [sel, name] of [['#t-jump', 'jump'], ['#t-throw', 'throw'], ['#t-wave', 'emote1'], ['#t-cam', 'toggleCam']]) {
    $(sel)?.addEventListener('click', () => { edge[name] = true; });
  }
  $('#t-menu')?.addEventListener('click', () => ui.toggleMenu(() => inp.lock(), () => {}));

  inp.frame = () => {
    const k = (c) => keys.has(c);
    const f = {
      mx: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + touchMove[0],
      my: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + touchMove[1],
      sprint: k('ShiftLeft') || k('ShiftRight') || Math.hypot(...touchMove) > 0.92,
      lookDX: dx, lookDY: dy, ...edge,
    };
    dx = dy = 0;
    for (const n in edge) edge[n] = false;
    if (ui.menuOpen) { f.mx = f.my = 0; f.jump = f.throw = false; }
    return f;
  };
  inp.lock = () => { try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* 拒否されたらドラッグ不可のまま */ } };
  return inp;
}

export function createUI({ places, zones, bounds, buildings }) {
  const ui = { menuOpen: false, onTeleport: null };
  const toastEl = $('#toast');
  let toastT;
  ui.toast = (msg) => {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
  };

  // 地図: 実際のレイアウトから描く
  const map = $('#map'), g = map.getContext('2d');
  const VIEW = { x0: -195, x1: 100, z0: -225, z1: 245 };
  const sx = map.width / (VIEW.x1 - VIEW.x0), sz = map.height / (VIEW.z1 - VIEW.z0);
  const X = (x) => (x - VIEW.x0) * sx, Z = (z) => (z - VIEW.z0) * sz;
  const drawMap = (me) => {
    g.fillStyle = '#e9e5da'; g.fillRect(0, 0, map.width, map.height);
    g.fillStyle = '#c9c4b6'; g.fillRect(X(-146), 0, (X(-132) - X(-146)), map.height);
    g.fillStyle = '#c9c4b6'; g.fillRect(X(-128), Z(3), X(44) - X(-128), Z(18) - Z(3));
    g.fillStyle = '#b9c8dc'; g.fillRect(X(-90), Z(-104), X(40) - X(-90), Z(-3) - Z(-104));
    g.fillStyle = '#7f7e78';
    for (const b of buildings) g.fillRect(X(b.x0), Z(b.z0), X(b.x1) - X(b.x0), Z(b.z1) - Z(b.z0));
    g.fillStyle = '#d7c98f'; g.fillRect(X(66), 0, X(96) - X(66), map.height); g.fillRect(0, Z(56), map.width, Z(72) - Z(56));
    g.fillStyle = '#14181d'; g.font = '700 11px "BIZ UDPGothic","Yu Gothic",sans-serif'; g.textAlign = 'center';
    g.fillText('コート', X(-20), Z(-52)); g.fillText('駅', X(72), Z(34));
    g.save(); g.translate(X(-139), Z(150)); g.rotate(-Math.PI / 2); g.fillText('中央通り', 0, 4); g.restore();
    g.fillText('総武線', X(-30), Z(66));
    if (me) {
      g.fillStyle = '#d3202a'; g.beginPath(); g.arc(X(me.x), Z(me.z), 5, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#d3202a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X(me.x), Z(me.z));
      g.lineTo(X(me.x) - Math.sin(me.yaw) * 12, Z(me.z) - Math.cos(me.yaw) * 12); g.stroke();
    }
    void bounds;
  };
  const list = $('#places');
  for (const p of places) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = p.n;
    b.addEventListener('click', () => ui.onTeleport?.(p));
    list.appendChild(b);
  }
  map.addEventListener('click', (e) => {
    const r = map.getBoundingClientRect();
    const x = VIEW.x0 + ((e.clientX - r.left) / r.width) * (VIEW.x1 - VIEW.x0);
    const z = VIEW.z0 + ((e.clientY - r.top) / r.height) * (VIEW.z1 - VIEW.z0);
    let best = places[0], bd = 1e9;
    for (const p of places) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
    ui.onTeleport?.(best);
  });

  let myLast = null, reLock = null, unLock = null;
  ui.openMenu = () => { ui.menuOpen = true; $('#menu').hidden = false; drawMap(myLast); };
  ui.closeMenu = () => { ui.menuOpen = false; $('#menu').hidden = true; };
  ui.toggleMenu = (lock, unlock) => {
    reLock = lock; unLock = unlock;
    if (ui.menuOpen) { ui.closeMenu(); reLock?.(); } else { ui.openMenu(); unLock?.(); }
  };

  const zoneEl = $('#zone'), ballEl = $('#ballhint');
  let lastZone = '';
  ui.update = (player) => {
    const p = player.pos;
    myLast = { x: p.x, z: p.z, yaw: player.s.yaw };
    const z = zones.find((a) => p.x >= a.x0 && p.x <= a.x1 && p.z >= a.z0 && p.z <= a.z1);
    const name = z ? z.n : '電気街';
    if (name !== lastZone) { lastZone = name; zoneEl.textContent = name; }
    const hint = player.holding ? 'クリック / F で投げる' : '';
    if (ballEl.textContent !== hint) ballEl.textContent = hint;
  };
  return ui;
}
