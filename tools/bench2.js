// 条件別の描画時間(JS と GPU の合計)。同じ条件を 3 回の中央値で比べる。
async (page) => {
  await page.goto('http://127.0.0.1:9181/?autostart&lock&shot');
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => window.__akiba && window.__akiba.frames > 3)) break; await page.waitForTimeout(500); }
  return await page.evaluate(async () => {
    const a = window.__akiba, { renderer, scene, camera, post, THREE, people } = a;
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
    const out = {};
    out.base_direct = time(direct);
    out.base_post = time(() => post.render(1));
    post.gtao.enabled = false; out.noAO = time(() => post.render(1));
    // MSAA なし
    for (const rt of [post.composer.renderTarget1, post.composer.renderTarget2]) { rt.samples = 0; rt.dispose(); }
    out.noAO_noMSAA = time(() => post.render(1));
    post.gtao.enabled = true; out.AO_noMSAA = time(() => post.render(1));
    post.gtao.updateGtaoMaterial({ samples: 6 }); post.gtao.updatePdMaterial({ samples: 6, rings: 1 });
    out.AO6_noMSAA = time(() => post.render(1));
    post.gtao.enabled = false;
    // 影のサンプル: PCF へ
    renderer.shadowMap.type = THREE.PCFShadowMap; scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.needsUpdate = true; });
    renderer.shadowMap.needsUpdate = true;
    out.pcf_noAO_noMSAA = time(() => post.render(1));
    const sun = scene.children.find((c) => c.isDirectionalLight);
    sun.castShadow = false; scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.needsUpdate = true; });
    out.noShadow = time(() => post.render(1));
    scene.environment = null; scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.needsUpdate = true; });
    out.noEnv_noShadow = time(() => post.render(1));
    // JS 側: 人の更新
    const t0 = performance.now(); for (let i = 0; i < 20; i++) people.update(0.016, i, false); out.people_js = +((performance.now() - t0) / 20).toFixed(2);
    return out;
  });
}
