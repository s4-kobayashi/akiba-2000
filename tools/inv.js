// 三角形数の多いメッシュを一覧する。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 0)) break; await page.waitForTimeout(100); }
  return await page.evaluate(() => {
    const a = window.__akiba; const out = [];
    a.scene.traverse((m) => { if (!m.isMesh) return; const g = m.geometry; const idx = g.index ? g.index.count / 3 : g.attributes.position.count / 3; const n = m.isInstancedMesh ? m.count : (g.instanceCount && g.instanceCount !== Infinity ? g.instanceCount : 1); out.push({ tris: Math.round(idx * n), each: Math.round(idx), n, mat: m.material.type, cast: m.castShadow, tr: m.material.transparent, alpha: m.material.alphaTest, col: m.material.color && m.material.color.getHexString() }); });
    out.sort((x, y) => y.tris - x.tris);
    return { total: out.reduce((s, x) => s + x.tris, 0), top: out.slice(0, 14) };
  });
}
