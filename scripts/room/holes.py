# HOLES IN A DARK SKIRT in a picture: python3 holes.py [-t dark=75] <picture>...
# the not-dark pixels wholly enclosed by dark ones (a hand across its edge is not enclosed): each patch's place, size and colour
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
args = sys.argv[1:]; T = 75
if args and args[0] == '-t': T = int(args[1]); args = args[2:]
for f in args:
    a = np.array(Image.open(f).convert('RGB')).astype(int)
    dark = a.max(2) < T
    # the skirt: the biggest dark blob
    lab, n = ndi.label(dark)
    if not n: print(f"{f}: no skirt"); continue
    big = 1 + np.argmax(ndi.sum(dark, lab, range(1, n + 1))); skirt = lab == big
    holes = ndi.binary_fill_holes(skirt) & ~skirt
    hl, hn = ndi.label(holes); out = []
    for k in range(1, hn + 1):
        m = hl == k; c = int(m.sum())
        if c < 2: continue
        ys, xs = np.nonzero(m); col = a[m].mean(0)
        out.append(f"{c} px at x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()} colour ({col[0]:.0f},{col[1]:.0f},{col[2]:.0f}){' SKIN' if col[0] > 105 and col[0] - col[2] > 15 else ''}")
    print(f"{f}: {int(holes.sum())} px in {len(out)} patches" + (': ' + '; '.join(out[:8]) if out else ''))
