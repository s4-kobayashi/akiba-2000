// シュートの得点率と、fps の時間変化。rAF の見かけ(apparent)と、毎フレーム GPU 完了を待つ実力(synced)を分けて測る。
async (page) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 2)) break; await page.waitForTimeout(200); }
  const out = {};
  out.score = await page.evaluate(async () => {
    const a = window.__akiba, p = a.player;
    a.renderer.setAnimationLoop(null);
    const f0 = { mx: 0, my: 0, lookDX: 0, lookDY: 0 }, s0 = p.s.score;
    let n = 0;
    for (let k = 0; k < 12; k++) {
      a.teleport(-32 + 6, -58 + (k % 5 - 2) * 0.8, Math.PI / 2, 0.2);
      p.ball.held = true; p.throwBall(); p.ball.pickDelay = 9; n++;
      for (let i = 0; i < 180; i++) p.update(1 / 60, f0, i / 60);
      await new Promise((r) => setTimeout(r, 1250));
    }
    return { thrown: n, scored: p.s.score - s0 };
  });
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 2)) break; await page.waitForTimeout(200); }
  out.fps = await page.evaluate(async () => {
    const a = window.__akiba, r = { apparent: {}, synced: {} };
    const gl = a.renderer.getContext(), px = new Uint8Array(4);
    const bin = async () => { const f0 = a.frames, t = performance.now(); await new Promise((q) => setTimeout(q, 4000)); return +(((a.frames - f0) * 1000) / (performance.now() - t)).toFixed(1); };
    const P = [['station', 47, 11, Math.PI / 2], ['court', 16, -24, 0.6], ['chuo', -139, 20, 0], ['guard', -40, 76, Math.PI / 2]];
    for (const [k, x, z, y] of P) { a.teleport(x, z, y, 0.02); r.apparent[k] = [await bin(), await bin(), await bin()]; }
    // 毎フレーム描画完了を待つ
    const orig = a.post.render;
    a.post.render = (t) => { orig(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
    for (const [k, x, z, y] of P) { a.teleport(x, z, y, 0.02); await bin(); r.synced[k] = await bin(); }
    a.post.render = orig;
    return r;
  });
  return out;
}
