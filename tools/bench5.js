// fps の頭打ちが環境の上限か、解像度依存かを調べる(各条件 7 秒捨てて 3 秒測る)。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 0)) break; await page.waitForTimeout(100); }
  return await page.evaluate(async () => {
    const a = window.__akiba, { renderer, scene, post } = a;
    const fps = async () => { await new Promise((r) => setTimeout(r, 7000)); const f0 = a.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 3000)); return +(((a.frames - f0) * 1000) / (performance.now() - t)).toFixed(1); };
    const out = { screen: [screen.width, screen.height], inner: [innerWidth, innerHeight], hidden: document.hidden, focus: document.hasFocus() };
    a.teleport(16, -24, 0.6, -0.03);
    out.base = await fps();
    const setDpr = (d) => { renderer.setPixelRatio(d); renderer.setSize(innerWidth, innerHeight, false); post.setSize(innerWidth, innerHeight, d); };
    setDpr(0.5); out.half = await fps();
    setDpr(1);
    const meshes = []; scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const bg = scene.background; meshes.forEach((m) => { m.visible = false; }); scene.background = null;
    out.empty = await fps();
    meshes.forEach((m) => { m.visible = true; }); scene.background = bg;
    return out;
  });
}
