// 最終チェック: ドラッグ視点 / シュートの得点 / reduced-motion / WebGL 不可のフォールバック / 390・768・1440 の overflow / VR ボタン分岐 / 外部リクエスト。
async (page) => {
  const out = {};
  const ext = [];
  const errs = [];
  page.on('request', (r) => { if (!/^(http:\/\/127\.0\.0\.1:9181|data:|blob:)/.test(r.url())) ext.push(r.url()); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  const ready = async () => { for (let i = 0; i < 60; i++) { if (await page.evaluate(() => document.querySelector('#start')?.classList.contains('ready'))) return true; await page.waitForTimeout(1000); } return false; };

  // ── 1440: 通常起動 ──
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/');
  await ready();
  const measure = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  out.w1440_start = await measure();
  out.vrButtonHiddenNoXR = await page.evaluate(() => document.querySelector('#enter-vr').hidden);
  await page.click('#join');
  await page.waitForTimeout(1500);
  out.w1440_hud = await measure();
  // ドラッグ視点(ポインタロック失敗時の代替)
  await page.waitForTimeout(300);
  out.lock = await page.evaluate(() => ({ locked: window.__akiba.input.locked, failed: window.__akiba.input.lockFailed }));
  const y0 = await page.evaluate(() => window.__akiba.player.s.yaw);
  await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.move(800, 400, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(500);
  out.dragYawDelta = +(await page.evaluate(() => window.__akiba.player.s.yaw) - y0).toFixed(3);
  // シュートの得点(固定刻みで 30 本)
  out.shots = await page.evaluate(() => {
    const a = window.__akiba, p = a.player; let n = 0;
    a.renderer.setAnimationLoop(null);
    const f0 = { mx: 0, my: 0, lookDX: 0, lookDY: 0 };
    const s0 = p.s.score;
    for (let k = 0; k < 30; k++) {
      a.teleport(-32 + 6, -58 + (k % 5 - 2) * 0.8, Math.PI / 2, 0.2);
      p.ball.held = true; p.throwBall(); p.ball.pickDelay = 9;
      for (let i = 0; i < 180; i++) p.update(1 / 60, f0, i / 60);
      n++;
    }
    return { thrown: n, scored: p.s.score - s0 };
  });
  await page.evaluate(() => { const a = window.__akiba; a.renderer.setAnimationLoop(null); });

  // ── 390 / 768: 開始画面と HUD の overflow ──
  for (const [w, h] of [[768, 1024], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('http://127.0.0.1:9181/');
    await ready();
    out[`w${w}_start`] = await measure();
    await page.screenshot({ path: `C:/Users/lucky/akiba-2000/shots/start_${w}.png` });
    await page.click('#join');
    await page.waitForTimeout(1200);
    out[`w${w}_hud`] = await measure();
    await page.keyboard.press('KeyM'); await page.waitForTimeout(500);
    out[`w${w}_menu`] = await measure();
    await page.screenshot({ path: `C:/Users/lucky/akiba-2000/shots/menu_${w}.png` });
    await page.evaluate(() => window.__akiba.renderer.setAnimationLoop(null));
  }
  await page.setViewportSize({ width: 1440, height: 810 });

  // ── reduced-motion: 電車と通行人が止まる ──
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 2)) break; await page.waitForTimeout(200); }
  out.reduced = await page.evaluate(async () => {
    const a = window.__akiba; const trains = []; a.scene.traverse((o) => { if (o.userData && o.userData.len) trains.push(o); });
    const p0 = trains.map((t) => [t.position.x, t.position.z]);
    const w = a.people.people.filter((p) => p.path).slice(0, 4), q0 = w.map((p) => [p.x, p.z]);
    await new Promise((r) => setTimeout(r, 2500));
    return { train: Math.max(...trains.map((t, i) => Math.hypot(t.position.x - p0[i][0], t.position.z - p0[i][1]))), walker: Math.max(...w.map((p, i) => Math.hypot(p.x - q0[i][0], p.z - q0[i][1]))) };
  });
  await page.emulateMedia({ reducedMotion: null });

  // ── WebGL 不可: フォールバック表示(getContext を潰す) ──
  await page.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...r) { return /webgl/.test(t) ? null : o.call(this, t, ...r); }; });
  await page.goto('http://127.0.0.1:9181/');
  await page.waitForTimeout(1500);
  out.fallback = await page.evaluate(() => ({ shown: !document.querySelector('#fallback').hidden, startHidden: document.querySelector('#start').hidden, text: document.querySelector('#fallback').textContent.trim().slice(0, 60) }));
  out.ext = ext; out.errs = [...new Set(errs)].slice(0, 8);
  return out;
}
