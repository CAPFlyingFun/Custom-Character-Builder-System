# the points of a sheet that are under her skin, one by one: python3 inside2.py skin.b64 sheet.json
import sys, json, base64, numpy as np
from scipy.spatial import cKDTree
exec(open('/tmp/claude-0/-home-claude/0aec922d-6398-53e7-8334-b3d9add32b9d/scratchpad/inside.py').read().split("under = signed")[0])
r = np.arange(len(pts)) // cols; c = np.arange(len(pts)) % cols
for i in np.where(signed < -0.0005)[0]:
    # how its neighbours in the sheet stand
    nb = [((r[i]) * cols + (c[i] + 1) % cols), ((r[i]) * cols + (c[i] - 1) % cols), max(0, i - cols), min(len(pts) - 1, i + cols)]
    print(f"row {r[i]} col {c[i]} ({c[i] * 5} deg) at x {pts[i,0]*100:.1f} y {pts[i,1]*100:.1f} z {pts[i,2]*100:.1f} cm: {signed[i]*1000:.1f} mm; neighbours {[round(float(signed[j])*1000,1) for j in nb]}")
