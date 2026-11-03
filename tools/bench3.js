// 残りの負荷の切り分け。条件を 1 つずつ切って描画時間(readPixels で待つ)の中央値を比べる。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(500); }
  return await page.evaluate(async () => {
    const a = window.__akiba, { renderer, scene, camera, post, THREE } = a;
    renderer.setAnimationLoop(null);
    a.still(47, 11, Math.PI / 2, 0.03);
    const gl = renderer.getContext(), px = new Uint8Array(4);
    const time = (fn) => {
      const rec = [];
      fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let i = 0; i < 5; i++) { const t = performance.now(); fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); rec.push(performance.now() - t); }
      rec.sort((x, y) => x - y); return +rec[2].toFixed(1);
    };
    const direct = () => { renderer.setRenderTarget(null); renderer.render(scene, camera); };
    const out = { size: [renderer.domElement.width, renderer.domElement.height], dpr: devicePixelRatio };
    renderer.info.autoReset = false; renderer.info.reset(); direct();
    out.calls = renderer.info.render.calls; out.tris = renderer.info.render.triangles; renderer.info.autoReset = true;
    out.direct = time(direct);
    out.post = time(() => post.render(1));
    post.bloom.enabled = false; out.post_noBloom = time(() => post.render(1)); post.bloom.enabled = true;
    // 材質ごとに隠して差を見る(どの層が画面を食っているか)
    const base = time(direct);
    const meshes = []; scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const per = [];
    for (const m of meshes) {
      const idx = m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3;
      const tris = Math.round(idx * (m.isInstancedMesh ? m.count : 1));
      m.visible = false; const t = time(direct); m.visible = true;
      per.push({ save: +(base - t).toFixed(1), tris, mat: m.material.type, map: !!m.material.map, tr: !!m.material.transparent });
    }
    per.sort((p, q) => q.save - p.save);
    out.base = base; out.top = per.slice(0, 8);
    const sun = scene.children.find((c) => c.isDirectionalLight);
    sun.castShadow = false; scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.needsUpdate = true; });
    out.direct_noShadowSampling = time(direct);
    return out;
  });
}
