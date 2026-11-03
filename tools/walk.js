// 自動歩行テスト: 道路を順に歩き、詰まり(walkTo が ok:false)と落下(y が 0 未満)を調べる。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 0)) break; await page.waitForTimeout(200); }
  return await page.evaluate(() => {
    const a = window.__akiba;
    a.renderer.setAnimationLoop(null);
    const legs = [
      ['駅前スポーン→駅前道路西', [47, 11], [-100, 11]],
      ['西端→中央通り', [-100, 11], [-139, 11]],
      ['中央通りを北端へ', [-139, 11], [-139, -205]],
      ['北端→中央通り南端(ガードくぐり)', [-139, -205], [-139, 225]],
      ['南端→ガード南へ戻る', [-139, 225], [-139, 84]],
      ['ガード南の通りを東へ', [-139, 80.5], [36, 80.5]],
      ['路地を北へくぐる', [-85, 79], [-85, 22]],
      ['駅前→広場の入口(南東)', [21, 11], [21, -20]],
      ['広場内→コート中央', [21, -20], [-6, -58]],
      ['コート→円形コート', [-6, -58], [-56, -27]],
      ['円形コート→入口(南西)', [-56, -27], [-29, -20]],
      ['入口→駅前道路', [-29, -20], [-29, 11]],
      ['駅前→東の高架沿いを北へ', [50, 8], [50, -100]],
      ['高架下をくぐって東へ', [58, -50], [92, -50]],
    ];
    const res = [];
    let minY = 1e9;
    for (const [name, from, to] of legs) {
      a.teleport(from[0], from[1], 0, 0);
      const before = [a.player.pos.x, a.player.pos.z];
      const r = a.walkTo(to[0], to[1], 400);
      minY = Math.min(minY, a.player.pos.y);
      res.push({ name, ok: r.ok, sec: +r.sec.toFixed(0), at: r.ok ? undefined : r.at.map((v) => +v.toFixed(1)), start: before.map((v) => +v.toFixed(1)), y: +a.player.pos.y.toFixed(2) });
    }
    // 外周の抜け: 範囲外へ向かって歩いても出られないか
    const edges = [];
    for (const [fx, fz, tx, tz] of [[-139, 0, -400, 0], [-139, 200, -139, 500], [-139, -200, -139, -500], [20, -110, 20, -500], [50, -100, 300, -100]]) {
      a.teleport(fx, fz, 0, 0);
      a.walkTo(tx, tz, 90);
      edges.push([+a.player.pos.x.toFixed(1), +a.player.pos.z.toFixed(1)]);
    }
    return { res, minY, edges };
  });
}
