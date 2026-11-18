# HOW MUCH OF A SHEET IS UNDER HER SKIN: python3 inside.py <her posed skin .b64 (metres, Float32 x3)> <sheet .json {columns, rows, data}> [label]
# her drawn triangles are the light list's; the nearest of them to each point of the sheet, and which side of it the point is.
import sys, json, base64, numpy as np
from scipy.spatial import cKDTree
body = np.frombuffer(base64.b64decode(open(sys.argv[1]).read()), dtype=np.float32).reshape(-1, 3).astype(np.float64)
sheet = json.load(open(sys.argv[2])); cols, rows = sheet['columns'], sheet['rows']
pts = np.frombuffer(base64.b64decode(sheet['data']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
label = sys.argv[3] if len(sys.argv) > 3 else ''
tri = np.fromfile('/home/claude/custom-character-builder-system/public/models/sarah-v2-body-light.bin', dtype=np.uint32).reshape(-1, 3)
tri = tri[(tri < len(body)).all(axis=1)]
lo, hi = pts[:, 1].min() - 0.08, pts[:, 1].max() + 0.08
keep = ((body[tri][:, :, 1] > lo) & (body[tri][:, :, 1] < hi)).all(axis=1)
tri = tri[keep]
A, B, C = body[tri[:, 0]], body[tri[:, 1]], body[tri[:, 2]]
cen = (A + B + C) / 3
N = np.cross(B - A, C - A); area = np.linalg.norm(N, axis=1); N = N / np.maximum(area, 1e-18)[:, None]
tree = cKDTree(cen)
def closest(p, a, b, c):
    # Ericson 5.1.5, vectorised over candidate triangles
    ab, ac, ap = b - a, c - a, p - a
    d1 = (ab * ap).sum(1); d2 = (ac * ap).sum(1)
    bp = p - b; d3 = (ab * bp).sum(1); d4 = (ac * bp).sum(1)
    cp = p - c; d5 = (ab * cp).sum(1); d6 = (ac * cp).sum(1)
    vc = d1 * d4 - d3 * d2; vb = d5 * d2 - d1 * d6; va = d3 * d6 - d5 * d4
    out = np.empty_like(a)
    den = np.where(np.abs(va + vb + vc) < 1e-30, 1, va + vb + vc)
    v = vb / den; w = vc / den
    out[:] = a + ab * v[:, None] + ac * w[:, None]
    m = (d1 <= 0) & (d2 <= 0); out[m] = a[m]
    m2 = (d3 >= 0) & (d4 <= d3); out[m2] = b[m2]
    m3 = (vc <= 0) & (d1 >= 0) & (d3 <= 0); t = d1 / np.where(d1 - d3 == 0, 1, d1 - d3); out[m3] = (a + ab * t[:, None])[m3]
    m4 = (d6 >= 0) & (d5 <= d6); out[m4] = c[m4]
    m5 = (vb <= 0) & (d2 >= 0) & (d6 <= 0); t = d2 / np.where(d2 - d6 == 0, 1, d2 - d6); out[m5] = (a + ac * t[:, None])[m5]
    m6 = (va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0); t = (d4 - d3) / np.where((d4 - d3) + (d5 - d6) == 0, 1, (d4 - d3) + (d5 - d6)); out[m6] = (b + (c - b) * t[:, None])[m6]
    return out
K = 48
_, idx = tree.query(pts, k=K)
signed = np.zeros(len(pts))
for i, p in enumerate(pts):
    t = idx[i]
    q = closest(p[None, :].repeat(K, 0), A[t], B[t], C[t])
    d = np.linalg.norm(q - p, axis=1); j = d.argmin()
    # the side: by the nearest triangle's own facing, or (at an edge or a corner of it) by the mean facing of the triangles as near
    near = d < d[j] + 1e-6
    n = N[t][near].mean(0)
    s = float(np.dot(p - q[j], n))
    signed[i] = d[j] if s >= 0 else -d[j]
under = signed < -0.0005
r = np.arange(len(pts)) // cols
by = {int(k): int(under[r == k].sum()) for k in np.unique(r[under])}
print(f"{label}: {int(under.sum())} of {len(pts)} points under her skin, deepest {(-signed.min() * 1000 if under.any() else 0):.1f} mm; within 2 mm of it or under: {int((signed < 0.002).sum())}; rows {by}")
