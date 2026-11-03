// 回帰の切り分け: 外周テストが北で止まる原因と、実時間のシュートの成功率を測る。
async (page) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(200); }
  const lot = await page.evaluate(() => {
    const a = window.__akiba;
    const out = {};
    // 止まった地点の少し先から再開して、局所の障害物か外周かを見分ける
    a.teleport(20, -110, 0, 0); out.first = a.walkTo(20, -500, 90).at || [a.player.pos.x, a.player.pos.z];
    out.stopZ = +a.player.pos.z.toFixed(1);
    a.teleport(20, -150, 0, 0); a.walkTo(20, -500, 90); out.fromBeyond = +a.player.pos.z.toFixed(1);
    a.teleport(13, -110, 0, 0); a.walkTo(13, -500, 90); out.sideX13 = +a.player.pos.z.toFixed(1);
    return out;
  });
  // 実時間で 8 本投げる(ops.js と同じ立ち位置と操作)
  const shots = [];
  for (let k = 0; k < 8; k++) {
    await page.evaluate(() => { const a = window.__akiba; a.teleport(-25, -58, Math.PI / 2, 0.2); a.player.ball.held = true; });
    await page.waitForTimeout(400);
    const s0 = await page.evaluate(() => window.__akiba.player.s.score);
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(3000);
    const s1 = await page.evaluate(() => window.__akiba.player.s.score);
    shots.push(s1 - s0);
  }
  const fps = await page.evaluate(async () => { const a = window.__akiba, f0 = a.frames, t = performance.now(); await new Promise((r) => setTimeout(r, 2000)); return +(((a.frames - f0) * 1000) / (performance.now() - t)).toFixed(1); });
  return { lot, shots, fps };
}
