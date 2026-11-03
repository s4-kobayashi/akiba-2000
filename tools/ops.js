// 実操作テスト: 開始画面→参加→W で歩く→V→1→Space→ボールを拾って F→M の地図で移動。キー入力は Playwright から本物を送る。
async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:9181/');
  await page.waitForFunction(() => document.querySelector('#start')?.classList.contains('ready'), null, { timeout: 29000 }).catch(() => {});
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.querySelector('#start')?.classList.contains('ready'))) break; await page.waitForTimeout(1000); }
  const out = { errs };
  out.startVisible = await page.evaluate(() => !document.querySelector('#start').hidden);
  await page.click('#join');
  await page.waitForTimeout(1500);
  const info = () => page.evaluate(() => { const a = window.__akiba, s = a.player.s; return { x: +a.player.pos.x.toFixed(2), z: +a.player.pos.z.toFixed(2), y: +a.player.pos.y.toFixed(2), third: s.third, emote: s.emote, score: s.score, shots: s.shots, held: a.player.ball.held, locked: a.input.locked, frames: a.frames }; });
  out.afterJoin = await info();
  out.hudVisible = await page.evaluate(() => !document.querySelector('#hud').hidden);
  // W で歩く(実時間)
  const p0 = await info();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW');
  const p1 = await info();
  out.walked = +Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2);
  // マウスで視点(ポインタロック時のみ)
  const y0 = await page.evaluate(() => window.__akiba.player.s.yaw);
  await page.mouse.move(600, 400); await page.mouse.move(700, 400);
  await page.waitForTimeout(400);
  out.yawDelta = +(await page.evaluate(() => window.__akiba.player.s.yaw) - y0).toFixed(3);
  // V 切替
  await page.keyboard.press('KeyV'); await page.waitForTimeout(800);
  out.third = (await info()).third;
  await page.locator('#scene').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/ops_third.png' });
  // 手を振る
  await page.keyboard.press('Digit1'); await page.waitForTimeout(500);
  out.emote = (await info()).emote;
  await page.locator('#scene').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/ops_wave.png' });
  await page.waitForTimeout(2500);
  // ジャンプ
  const yy = [];
  await page.keyboard.press('Space');
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(120); yy.push((await info()).y); }
  out.jumpY = Math.max(...yy);
  // ボール: コートで拾って投げる
  await page.evaluate(() => { const a = window.__akiba, b = a.player.ball; a.teleport(b.p.x + 0.5, b.p.z, Math.PI / 2, 0); });
  await page.waitForTimeout(1500);
  out.heldAfterPick = (await info()).held;
  await page.evaluate(() => { const a = window.__akiba; const h = a.player; const rimX = -32, rimZ = -58; a.teleport(rimX + 7, rimZ, Math.PI / 2, 0.2); void h; });
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);
  const th = await info();
  out.threw = { shots: th.shots, held: th.held };
  await page.waitForTimeout(3000);
  out.scoreAfter = (await info()).score;
  // M で地図 → 場所ボタンで移動
  await page.keyboard.press('KeyM'); await page.waitForTimeout(600);
  out.menuOpen = await page.evaluate(() => { const m = document.querySelector('#menu'); return m && !m.hidden; });
  await page.locator('#menu').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/ops_menu.png' }).catch(() => {});
  const btn = await page.evaluate(() => { const b = [...document.querySelectorAll('#menu button')].find((x) => /中央通り/.test(x.textContent)); return b ? b.textContent : null; });
  out.placeBtn = btn;
  if (btn) await page.click(`#menu button:has-text("${btn.trim()}")`);
  await page.waitForTimeout(800);
  out.afterTeleport = await info();
  out.menuClosed = await page.evaluate(() => { const m = document.querySelector('#menu'); return !m || m.hidden; });
  // 電車と人が動いているか
  out.moving = await page.evaluate(async () => {
    const a = window.__akiba; const trains = []; a.scene.traverse((o) => { if (o.userData && o.userData.len) trains.push(o); });
    const p0 = trains.map((t) => [t.position.x, t.position.z]);
    const q0 = a.people.people.filter((p) => p.path).slice(0, 3).map((p) => [p.x, p.z]);
    await new Promise((r) => setTimeout(r, 2000));
    return { trainDelta: trains.map((t, i) => +Math.hypot(t.position.x - p0[i][0], t.position.z - p0[i][1]).toFixed(1)), walkerDelta: a.people.people.filter((p) => p.path).slice(0, 3).map((p, i) => +Math.hypot(p.x - q0[i][0], p.z - q0[i][1]).toFixed(2)) };
  });
  return out;
}
