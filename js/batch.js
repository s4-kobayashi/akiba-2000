// 静的ジオメトリの束。描画命令を増やさないよう、同じ材質の箱・面・部品を 1 つの BufferGeometry に結合する。
import * as THREE from 'three';

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();

export class Batch {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  get count() { return this.p.length / 3; }

  // a(左下) b(右下) c(右上) d(左上)。表は a→b→d の右手系の向き
  quad(a, b, c, d, uv = [0, 0, 1, 1], color = 0xffffff) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const s = this.count;
    this.p.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) this.n.push(nx, ny, nz);
    this.u.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]);
    // color は 1 色か、a b c d の 4 色(上下のグラデーション用)
    for (let k = 0; k < 4; k++) { const col = rgb(Array.isArray(color) ? color[k] : color); this.c.push(col[0], col[1], col[2]); }
    this.i.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }

  // 軸平行の箱。UV は実寸 ÷ scale(m)で、どの箱でも模様の大きさが揃う。
  box(x0, y0, z0, x1, y1, z1, { color = 0xffffff, scale = 2, bottom = false, top = true, offU = 0, offV = 0 } = {}) {
    const U = (a, b) => [offU + a / scale, offV + b / scale];
    const q = (a, b, c, d, w, h, u0 = 0, v0 = 0) => {
      const [uu0, vv0] = U(u0, v0), [uu1, vv1] = U(u0 + w, v0 + h);
      this.quad(a, b, c, d, [uu0, vv0, uu1, vv1], color);
    };
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], w, h, x0, y0);          // +z
    q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], w, h, -x1, y0);         // -z
    q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], d, h, -z1, y0);         // +x
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], d, h, z0, y0);          // -x
    if (top) q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], w, d, x0, -z1);
    if (bottom) q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], w, d, x0, z0);
  }

  // 既存のジオメトリを行列で置いて足す
  add(geo, matrix, color = 0xffffff) {
    const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv;
    const s = this.count, col = rgb(color);
    _m3.getNormalMatrix(matrix);
    for (let k = 0; k < P.count; k++) {
      _v.fromBufferAttribute(P, k).applyMatrix4(matrix);
      this.p.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(N, k).applyMatrix3(_m3).normalize();
      this.n.push(_n.x, _n.y, _n.z);
      if (UV) this.u.push(UV.getX(k), UV.getY(k)); else this.u.push(0, 0);
      this.c.push(col[0], col[1], col[2]);
    }
    if (geo.index) for (let k = 0; k < geo.index.count; k++) this.i.push(s + geo.index.getX(k));
    else for (let k = 0; k < P.count; k++) this.i.push(s + k);
  }

  // a→b を結ぶ細い円柱(パイプ・柵・電線)
  pipe(a, b, r = 0.03, color = 0xffffff, seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const L = A.distanceTo(B); if (L < 1e-4) return;
    const key = seg;
    const geo = pipeCache[key] || (pipeCache[key] = new THREE.CylinderGeometry(1, 1, 1, seg, 1, true));
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(_up, B.clone().sub(A).normalize());
    M.compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(r, L, r));
    this.add(geo, M, color);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  mesh(material, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(this.build(), material);
    m.castShadow = cast; m.receiveShadow = receive;
    return m;
  }
}
const pipeCache = {};
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();
function rgb(hex) { _c.set(hex); return [_c.r, _c.g, _c.b]; } // Color.set は sRGB → 線形へ変換する

export function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }
export const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
