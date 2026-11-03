// シーン → GTAO(余裕がある GPU のみ) → ACES → 色の階調(2000 年頃のカラーネガ写真の寄せ) → FXAA。
// HDR 描画先の MSAA は内蔵 GPU で +145ms(実測)だったので使わない。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// three r171 の GTAOPass は外部の深度を渡すと setGBuffer で未作成の normalRenderTarget を参照して落ちる。
// 参照先だけを持つ代役を先に置く(shiki-no-michi で実測した回避策)。
class DepthOnlyGTAOPass extends GTAOPass {
  setGBuffer(depthTexture, normalTexture) {
    if (depthTexture !== undefined && !this.normalRenderTarget) {
      this.normalRenderTarget = { depthTexture, texture: null, setSize() {}, dispose() {} };
    }
    super.setGBuffer(depthTexture, normalTexture);
  }
}

// 全画面パスを重ねるたびに HDR を読み直すと重いので、FXAA・ACES・sRGB・色の階調を 1 パスにまとめる。
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, texel: { value: new THREE.Vector2() }, toneMappingExposure: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 texel; varying vec2 vUv;
    ${THREE.ShaderChunk.tonemapping_pars_fragment}
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float lum(vec3 c){ return sqrt(dot(c, vec3(0.299, 0.587, 0.114))); }
    vec3 fxaa(vec3 m){
      float lM = lum(m);
      float lNW = lum(texture2D(tDiffuse, vUv + texel * vec2(-1.0, 1.0)).rgb);
      float lNE = lum(texture2D(tDiffuse, vUv + texel * vec2(1.0, 1.0)).rgb);
      float lSW = lum(texture2D(tDiffuse, vUv + texel * vec2(-1.0, -1.0)).rgb);
      float lSE = lum(texture2D(tDiffuse, vUv + texel * vec2(1.0, -1.0)).rgb);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.05, lMax * 0.14)) return m;
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float rd = max((lNW + lNE + lSW + lSE) * 0.03, 0.008);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + rd), -6.0, 6.0) * texel;
      vec3 a = 0.5 * (texture2D(tDiffuse, vUv - dir / 6.0).rgb + texture2D(tDiffuse, vUv + dir / 6.0).rgb);
      vec3 b = 0.5 * a + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5).rgb + texture2D(tDiffuse, vUv + dir * 0.5).rgb);
      float lB = lum(b);
      return (lB < lMin || lB > lMax) ? a : b;
    }
    void main(){
      vec3 c = fxaa(texture2D(tDiffuse, vUv).rgb);
      c = clamp(ACESFilmicToneMapping(c), 0.0, 1.0);
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      // ネガフィルムの寄せ: 暗部をわずかに持ち上げて青へ、明部を暖色へ、彩度はやや控えめ
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(vec3(l), c, 0.88);
      c = c * vec3(1.015, 1.0, 0.97) + vec3(0.006, 0.01, 0.018) * (1.0 - l);
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);
      vec2 d = vUv - 0.5;
      c *= 1.0 - 0.2 * smoothstep(0.42, 0.95, length(d) * 1.414);
      c += (h(vUv * 1024.0 + fract(time) * 71.0) - 0.5) * 0.009;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function buildPost(renderer, scene, camera, { ao = true } = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  // 人の影がステンシルを使うので、深度テクスチャも深度+ステンシルにする
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, stencilBuffer: true });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.renderTarget2.depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedInt248Type);
  composer.renderTarget2.depthTexture.format = THREE.DepthStencilFormat;
  const gtao = new DepthOnlyGTAOPass(scene, camera, size.x, size.y, { depthTexture: composer.renderTarget2.depthTexture });
  gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.6, thickness: 1.2, scale: 1.2, samples: 8, distanceFallOff: 1.0, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 1, samples: 8 });
  gtao.blendIntensity = 0.85;
  gtao.enabled = ao;
  composer.addPass(gtao);
  const grade = new ShaderPass(FinalShader);
  grade.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
  grade.material.toneMapped = false; // three が同じ関数を前置すると二重定義でリンクに失敗する
  composer.addPass(grade);
  return {
    composer, gtao, grade,
    setSize(w, h, dpr) {
      composer.setPixelRatio(dpr); composer.setSize(w, h);
      gtao.setSize(Math.round(w * dpr * 0.5), Math.round(h * dpr * 0.5));
      grade.uniforms.texel.value.set(1 / (w * dpr), 1 / (h * dpr));
    },
    render(t) { grade.uniforms.time.value = t; composer.render(); },
    dispose() { composer.dispose(); gtao.dispose(); rt.dispose(); },
  };
}
