// 負荷の切り分け。条件を 1 つずつ変えて描画時間を測る(gl.finish 相当に readPixels で待つ)。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(500); }
  return await page.evaluate(async () => {
    const a = window.__akiba, { renderer, scene, camera, post, THREE } = a;
    renderer.setAnimationLoop(null);
    a.still(47, 11, Math.PI / 2, 0.03);
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const time = (fn, n = 5) => {
      fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t = performance.now();
      for (let i = 0; i < n; i++) { fn(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      return +((performance.now() - t) / n).toFixed(1);
    };
    const out = {};
    renderer.info.autoReset = false; renderer.info.reset();
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    out.scene = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
    renderer.info.autoReset = true;
    out.direct = time(() => { renderer.setRenderTarget(null); renderer.render(scene, camera); });
    out.post_full = time(() => post.render(1));
    post.gtao.enabled = false;
    out.post_noAO = time(() => post.render(1));
    post.bloom.enabled = false;
    out.post_noAO_noBloom = time(() => post.render(1));
    post.gtao.enabled = true; post.bloom.enabled = true;
    // 材質ごとの重さ: 隠して比べる
    const meshes = [];
    scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const list = meshes.map((m) => {
      const v = m.visible; m.visible = false;
      const t = time(() => { renderer.setRenderTarget(null); renderer.render(scene, camera); }, 3);
      m.visible = v;
      const idx = m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3;
      return { t, tris: Math.round(idx * (m.isInstancedMesh ? m.count : 1)), mat: m.material.type, map: !!m.material.map, n: m.isInstancedMesh ? m.count : 1 };
    }).sort((p, q) => p.t - q.t).slice(0, 10);
    out.withoutEach = list;
    const s = scene.children.find((c) => c.isDirectionalLight);
    const shadow = performance.now(); renderer.shadowMap.needsUpdate = true; renderer.setRenderTarget(null); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    out.shadowFrame = +(performance.now() - shadow).toFixed(0);
    out.size = [renderer.domElement.width, renderer.domElement.height];
    void s;
    return out;
  });
}
