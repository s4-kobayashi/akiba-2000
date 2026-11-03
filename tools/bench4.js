// 実際のループの fps(固定解像度)。駅前・コート・中央通りで測る。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 0)) break; await page.waitForTimeout(100); }
  return await page.evaluate(async () => {
    const a = window.__akiba;
    // 開始直後は GPU へ命令が溜まるだけで実力より高く出る(47fps の偽値を実測)ので長めに捨てる
    const fps = async () => { await new Promise((r) => setTimeout(r, 7000)); const f0 = a.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); return +(((a.frames - f0) * 1000) / (performance.now() - t)).toFixed(1); };
    const out = { size: [a.renderer.domElement.width, a.renderer.domElement.height] };
    a.teleport(47, 11, Math.PI / 2, 0.03); out.station = await fps();
    a.teleport(16, -24, 0.6, -0.03); out.court = await fps();
    a.teleport(-139, 20, 0, 0.05); out.chuo = await fps();
    a.renderer.info.autoReset = false; a.renderer.info.reset(); a.post.render(1); out.calls = a.renderer.info.render.calls; out.tris = a.renderer.info.render.triangles; a.renderer.info.autoReset = true;
    return out;
  });
}
