"""アスファルト素材から太いひびを消す。

素材の太いひびが 3.2m 周期で繰り返し、回転コピーと重なって路面の格子に見えていた。
ひびの部分だけ、ひびの無い別の場所を塊のままずらして埋める。元の素材は残す。

uv run --with pillow --with numpy --with scipy python tools/decrack.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

TEX = Path(__file__).resolve().parent.parent / "assets" / "tex"
MIN_AREA = 700  # これより小さい暗がりは粒として残す


def crack_mask(lum: np.ndarray) -> np.ndarray:
    base = ndi.gaussian_filter(lum, 60, mode="wrap")
    soft = ndi.gaussian_filter(lum, 5, mode="wrap")
    dark = (soft - base) < -9
    labels, n = ndi.label(dark)
    areas = ndi.sum(dark, labels, range(1, n + 1))
    keep = np.isin(labels, 1 + np.flatnonzero(areas >= MIN_AREA))
    return ndi.binary_dilation(keep, iterations=16)


def main() -> None:
    diff = np.asarray(Image.open(TEX / "asphalt_diff.jpg").convert("RGB"), float)
    nor = np.asarray(Image.open(TEX / "asphalt_nor.jpg").convert("RGB"), float)
    mask = crack_mask(diff.mean(axis=2))
    print("crack area", round(float(mask.mean()) * 100, 2), "%")

    # ひびが重ならないずらし量を選ぶ。残りは次の候補で埋める
    remaining = mask.copy()
    out_diff, out_nor = diff.copy(), nor.copy()
    h, w = mask.shape
    candidates = [(y, x) for y in range(101, h, 211) for x in range(157, w, 263)]
    for step in range(6):
        best = min(candidates, key=lambda s: (remaining & np.roll(mask, s, axis=(0, 1))).sum())
        ok = remaining & ~np.roll(mask, best, axis=(0, 1))
        if not ok.any():
            break
        region = ndi.binary_dilation(ok, iterations=2) & remaining
        alpha = ndi.gaussian_filter(region.astype(float), 7, mode="wrap")[..., None]
        alpha = np.clip(alpha * 1.6, 0, 1)
        out_diff = out_diff * (1 - alpha) + np.roll(diff, best, axis=(0, 1)) * alpha
        out_nor = out_nor * (1 - alpha) + np.roll(nor, best, axis=(0, 1)) * alpha
        remaining = remaining & ~region
        print("step", step, "shift", best, "left", round(float(remaining.mean()) * 100, 3), "%")
        if not remaining.any():
            break

    clean = Image.fromarray(np.clip(out_diff, 0, 255).astype("uint8"))
    clean.save(TEX / "asphalt_clean_diff.jpg", quality=90)
    Image.fromarray(np.clip(out_nor, 0, 255).astype("uint8")).save(TEX / "asphalt_clean_nor.jpg", quality=90)
    clean.resize((512, 512)).save(TEX.parent.parent / "shots" / "asphalt_clean.png")


if __name__ == "__main__":
    main()
