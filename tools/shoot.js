// Playwright の browser_run_code_unsafe(filename) で読み込む撮影スクリプト。
// 定点(駅前・コート・ガード下・中央通りなど)を撮って shots/ に保存し、エラー数と描画負荷を返す。
async (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push('PE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  const ext = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1:9181') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ext.push(r.url()); });
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  const t0 = Date.now();
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(500); }
  const bootMs = Date.now() - t0;
  const gpu = await page.evaluate(() => { const gl = window.__akiba.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; });
  const fps = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 7000)); const a = window.__akiba, f0 = a.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); return ((a.frames - f0) * 1000) / (performance.now() - t); });
  const P = [
    ['01_station', 47, 11, Math.PI / 2, 0.03],
    ['02_court', 16, -24, 0.6, -0.03],
    ['03_roundcourt', -40, -14, Math.PI * 0.42, -0.02],
    ['04_chuo_n', -130, -120, Math.PI, 0.05],
    ['05_chuo_s', -130, 140, 0, 0.08],
    ['06_guard', -40, 76, Math.PI / 2, 0.12],
    ['07_lot', 2, -112, Math.PI, 0.02],
    ['08_arches', 60, -60, -Math.PI / 2, 0.05],
  ];
  const stats = {};
  for (const [name, x, z, yaw, pitch] of P) {
    await page.evaluate(([x, z, yaw, pitch]) => {
      window.__akiba.renderer.setAnimationLoop(null);
      window.__akiba.still(x, z, yaw, pitch);
      window.__akiba.still(x, z, yaw, pitch);
    }, [x, z, yaw, pitch]);
    await page.waitForTimeout(200);
    stats[name] = await page.evaluate(() => { const a = window.__akiba; const i = a.renderer.info.render; return [i.calls, i.triangles]; });
    await page.locator('#scene').screenshot({ path: `C:/Users/lucky/akiba-2000/shots/${name}.png` });
  }
  return { bootMs, gpu, fps, errs: [...new Set(errs)].slice(0, 12), ext, stats };
}
