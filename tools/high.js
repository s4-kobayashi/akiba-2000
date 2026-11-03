// AO 有効(?q=high)と自動調整(lock なし)の動作確認。エラーの有無と AO の絵、解像度の段階を返す。
async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /INVALID|not valid/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot&q=high');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(300); }
  await page.evaluate(() => { const a = window.__akiba; a.renderer.setAnimationLoop(null); a.still(-30, -6, 0.35, -0.02); a.still(-30, -6, 0.35, -0.02); });
  await page.waitForTimeout(200);
  await page.locator('#scene').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/high_ao.png' });
  await page.evaluate(() => { const a = window.__akiba; a.post.gtao.enabled = false; a.still(-30, -6, 0.35, -0.02); });
  await page.waitForTimeout(200);
  await page.locator('#scene').screenshot({ path: 'C:/Users/lucky/akiba-2000/shots/high_noao.png' });
  const high = await page.evaluate(() => ({ ao: window.__akiba.post.gtao.enabled }));
  // 自動調整
  await page.goto('http://127.0.0.1:9181/?autostart');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(300); }
  const auto = await page.evaluate(async () => {
    const a = window.__akiba, log = [];
    for (let i = 0; i < 7; i++) { const f0 = a.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); log.push({ fps: +(((a.frames - f0) * 1000) / (performance.now() - t)).toFixed(1), w: a.renderer.domElement.width, ao: a.post.gtao.enabled }); }
    return log;
  });
  return { high, auto, errs: [...new Set(errs)] };
}
