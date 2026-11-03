// 献血バスと献血ルームの看板が描画されるかを見る撮影と、三角形の再計測。
async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /not valid|INVALID/.test(m.text())) errs.push(m.text().slice(0, 300)); });
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(300); }
  const stats = {};
  for (const [name, x, z, yaw] of [['station', 47, 11, Math.PI / 2], ['court', 16, -24, 0.6], ['chuo', -130, -120, Math.PI]]) {
    stats[name] = await page.evaluate(([x, z, yaw]) => {
      const a = window.__akiba, r = a.renderer;
      r.setAnimationLoop(null);
      a.still(x, z, yaw, 0.02);
      r.info.autoReset = false; r.info.reset();
      r.shadowMap.needsUpdate = false;
      a.post.render(0);
      const v = [r.info.render.calls, r.info.render.triangles];
      r.info.autoReset = true;
      return v;
    }, [x, z, yaw]);
  }
  for (const [name, x, z, yaw, pitch] of [['bus', 56, -56, 0.72, 0.02], ['room', -30, -30, Math.PI / 2, 0.14]]) {
    await page.evaluate(([x, z, yaw, pitch]) => { const a = window.__akiba; a.still(x, z, yaw, pitch); a.still(x, z, yaw, pitch); }, [x, z, yaw, pitch]);
    await page.waitForTimeout(200);
    await page.locator('#scene').screenshot({ path: `C:/Users/lucky/akiba-2000/shots/${name}.png` });
  }
  // 歩行の回帰: バスの脇を抜けられるか
  const pass = await page.evaluate(() => { const a = window.__akiba; a.teleport(50, 8, 0, 0); return a.walkTo(50, -100, 400).ok; });
  return { stats, pass, errs };
}
