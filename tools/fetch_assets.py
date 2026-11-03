"""Poly Haven (CC0) の実写スキャン素材を assets/tex に取り込む。一度だけ実行する。

実行: uv run --no-project python tools/fetch_assets.py
取り込み後はページから外部への通信は発生しない(すべてローカル配信)。
"""

import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent / "assets"
API = "https://api.polyhaven.com/files/"

# (論理名, 素材ID, 解像度)  diff=色 / nor_gl=法線(OpenGL) / arm=AO・粗さ・金属の詰め合わせ
TEXTURES = [
    ("asphalt", "asphalt_02", "2k"),
    ("court", "concrete_floor_worn_001", "2k"),
    ("walk", "concrete_pavers", "1k"),
    ("brick", "red_brick_pavers", "1k"),
    ("slab", "concrete_floor_damaged_01", "1k"),
    ("viaduct", "concrete_wall_008", "2k"),
    ("plaster", "white_plaster_rough_01", "1k"),
    ("tile", "long_white_tiles", "1k"),
    ("rust", "rusty_metal_02", "1k"),
    ("shutter", "painted_metal_shutter", "1k"),
]
SHORT = {"Diffuse": "diff", "nor_gl": "nor", "arm": "arm"}


def get(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        print("skip", dest.name)
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "akiba-2000/1.0"})
    with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
        f.write(r.read())
    print("ok  ", dest.name, round(dest.stat().st_size / 1e6, 2), "MB")


def files(asset):
    req = urllib.request.Request(API + asset, headers={"User-Agent": "akiba-2000/1.0"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


manifest = {}
for name, asset, res in TEXTURES:
    info = files(asset)
    manifest[name] = {"source": asset}
    for k, short in SHORT.items():
        url = info[k][res]["jpg"]["url"]
        fn = f"{name}_{short}.jpg"
        get(url, ROOT / "tex" / fn)
        manifest[name][short] = f"assets/tex/{fn}"
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
print("manifest written")
