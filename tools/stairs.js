// 外階段の見え方を確かめる撮影(エアコン棟の南面を駅前道路から見上げる)。
async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(200); }
  // エアコン棟の南面(駅前道路から)と、オノデンの東面(路地の入口から)。道路から見える 2 棟
  for (const [name, x, z, yaw, pitch] of [['stairs', -116, 12, 0.3, 0.32], ['stairs2', -84.5, 24, Math.PI + 0.35, 0.42]]) {
    await page.evaluate(([x, z, yaw, pitch]) => { const a = window.__akiba; a.renderer.setAnimationLoop(null); a.still(x, z, yaw, pitch); a.still(x, z, yaw, pitch); }, [x, z, yaw, pitch]);
    await page.waitForTimeout(200);
    await page.locator('#scene').screenshot({ path: `C:/Users/lucky/akiba-2000/shots/${name}.png` });
  }
  return { errs };
}
