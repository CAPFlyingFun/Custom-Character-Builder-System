# WHAT IS SEEN FROM A SIDE OF HER, sheet or skin: python3 seen.py <skin.b64> <sheet.json> <view: back|front|left|right> x0,x1,y0,y1 [cell_mm=4]
# an orthographic z-buffer of her light skin's triangles and of the sheet's; a map: '#' sheet first, 's' her skin first, '.' neither
import sys, json, base64, numpy as np
body = np.frombuffer(base64.b64decode(open(sys.argv[1]).read()), dtype=np.float32).reshape(-1, 3).astype(np.float64)
sheet = json.load(open(sys.argv[2])); cols, rows = sheet['columns'], sheet['rows']
pts = np.frombuffer(base64.b64decode(sheet['data']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
view = sys.argv[3]; x0, x1, y0, y1 = [float(v) for v in sys.argv[4].split(',')]; cell = float(sys.argv[5]) / 1000 if len(sys.argv) > 5 else 0.004
tri = np.fromfile('/home/claude/custom-character-builder-system/public/models/sarah-v2-body-light.bin', dtype=np.uint32).reshape(-1, 3)
tri = tri[(tri < len(body)).all(axis=1)]
st = []
for r in range(rows - 1):
    for c in range(cols):
        a, b = r * cols + c, r * cols + (c + 1) % cols; d, e = a + cols, b + cols
        st.append((a, b, d)); st.append((b, e, d))
st = np.array(st)
def proj(P):
    # (u across the picture, v up, w depth: smaller is nearer the eye)
    if view == 'back': return np.stack([-P[:, 0], P[:, 1], P[:, 2]], 1)
    if view == 'front': return np.stack([P[:, 0], P[:, 1], -P[:, 2]], 1)
    if view == 'left': return np.stack([P[:, 2], P[:, 1], -P[:, 0]], 1)
    return np.stack([-P[:, 2], P[:, 1], P[:, 0]], 1)
W, H = int(round((x1 - x0) / cell)), int(round((y1 - y0) / cell))
def zbuf(P, T):
    Q = proj(P); Z = np.full((H, W), np.inf); who = np.full((H, W), -1)
    A, B, C = Q[T[:, 0]], Q[T[:, 1]], Q[T[:, 2]]
    lo = np.minimum(np.minimum(A, B), C); hi = np.maximum(np.maximum(A, B), C)
    ok = (hi[:, 0] > x0) & (lo[:, 0] < x1) & (hi[:, 1] > y0) & (lo[:, 1] < y1)
    for i in np.nonzero(ok)[0]:
        a, b, c = A[i], B[i], C[i]
        i0, i1 = max(0, int((lo[i, 0] - x0) / cell)), min(W - 1, int((hi[i, 0] - x0) / cell))
        j0, j1 = max(0, int((lo[i, 1] - y0) / cell)), min(H - 1, int((hi[i, 1] - y0) / cell))
        if i1 < i0 or j1 < j0: continue
        us = x0 + (np.arange(i0, i1 + 1) + 0.5) * cell; vs = y0 + (np.arange(j0, j1 + 1) + 0.5) * cell
        U, V = np.meshgrid(us, vs)
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-14: continue
        l1 = ((b[1] - c[1]) * (U - c[0]) + (c[0] - b[0]) * (V - c[1])) / den
        l2 = ((c[1] - a[1]) * (U - c[0]) + (a[0] - c[0]) * (V - c[1])) / den
        l3 = 1 - l1 - l2
        m = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
        z = l1 * a[2] + l2 * b[2] + l3 * c[2]
        sub = Z[j0:j1 + 1, i0:i1 + 1]; w = who[j0:j1 + 1, i0:i1 + 1]
        take = m & (z < sub); sub[take] = z[take]; w[take] = i
    return Z, who
Zs, ws = zbuf(body, tri); Zc, wc = zbuf(pts, st)
skin_first = (Zs < Zc - 1e-4) & np.isfinite(Zs)
print(f"{view}: {W}x{H} cells of {cell*1000:.0f} mm; her skin seen in {int(skin_first.sum())}, sheet in {int(((Zc <= Zs) & np.isfinite(Zc)).sum())}")
for j in range(H - 1, -1, -1):
    line = ''
    for i in range(W):
        if skin_first[j, i]: line += 's' if not np.isfinite(Zc[j, i]) else 'S'
        elif np.isfinite(Zc[j, i]): line += '#'
        else: line += '.'
    print(f"{(y0 + (j + 0.5) * cell) * 100:6.1f} {line}")
# where her skin is seen in front of a sheet that lies behind it: how deep the sheet is behind, and which rows/columns of the sheet
m = skin_first & np.isfinite(Zc)
if m.any():
    dep = (Zc - Zs)[m] * 1000
    print(f"sheet behind her skin there by {dep.min():.1f} to {dep.max():.1f} mm (median {np.median(dep):.1f})")
    q = wc[m] // 2; rr = q // cols; cc = q % cols
    print('sheet rows', sorted(set(rr.tolist())), 'cols', sorted(set(cc.tolist())))
