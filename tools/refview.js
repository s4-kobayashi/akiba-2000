// 当時の写真(駅のホームから広場を見下ろす視点)と並べて見るための撮影。通常フレームの負荷も返す。
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
  await page.evaluate(() => {
    const a = window.__akiba, c = a.camera;
    a.still(38, 14, 0.98, -0.2);
    c.position.set(38, 12, 14);
    a.post.render(0);
  });
  await page.waitForTimeout(200);
  await page.locator('#scene').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/ref_view.png' });
  return { stats, errs };
}
