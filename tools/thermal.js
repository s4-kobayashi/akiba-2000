// 毎フレーム GPU 完了を待つ fps を 3 秒ごとに記録する(別プロセスの GPU 使用率と突き合わせるため時刻つき)。
async (page) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 2)) break; await page.waitForTimeout(200); }
  await page.evaluate(() => window.__akiba.renderer.setAnimationLoop(null));
  return await page.evaluate(async () => {
    const a = window.__akiba, gl = a.renderer.getContext(), px = new Uint8Array(4);
    a.teleport(16, -24, 0.6, 0.02);
    const log = [];
    let frames = 0, stop = false, t = 0;
    const step = () => { if (stop) return; a.post.render(t += 0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); frames++; requestAnimationFrame(step); };
    requestAnimationFrame(step);
    for (let i = 0; i < 20; i++) { const f0 = frames, t0 = performance.now(); await new Promise((r) => setTimeout(r, 3000)); log.push([new Date().toTimeString().slice(0, 8), +(((frames - f0) * 1000) / (performance.now() - t0)).toFixed(1)]); }
    stop = true;
    return log;
  });
}
