# WHAT A CAMERA SEES, sheet, skin or stool: python3 seen2.py <skin.b64> <sheet.json> cx,cy,cz tx,ty,tz stoolTop,stoolZ [fov_deg=30] [W=160]
import sys, json, base64, numpy as np
body = np.frombuffer(base64.b64decode(open(sys.argv[1]).read()), dtype=np.float32).reshape(-1, 3).astype(np.float64)
sheet = json.load(open(sys.argv[2])); cols, rows = sheet['columns'], sheet['rows']
pts = np.frombuffer(base64.b64decode(sheet['data']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
C = np.array([float(v) for v in sys.argv[3].split(',')]); T = np.array([float(v) for v in sys.argv[4].split(',')])
top, sz = [float(v) for v in sys.argv[5].split(',')]
fov = float(sys.argv[6]) if len(sys.argv) > 6 else 30.0; W = int(sys.argv[7]) if len(sys.argv) > 7 else 160; H = W
tri = np.fromfile('/home/claude/custom-character-builder-system/public/models/sarah-v2-body-light.bin', dtype=np.uint32).reshape(-1, 3)
tri = tri[(tri < len(body)).all(axis=1)]
st = []
for r in range(rows - 1):
    for c in range(cols):
        a, b = r * cols + c, r * cols + (c + 1) % cols; d, e = a + cols, b + cols
        st.append((a, b, d)); st.append((b, e, d))
st = np.array(st)
# the stool: a top disc and a side, 28 round
n = 28; ang = np.arange(n) * 2 * np.pi / n
sp = [[0, top, sz]] + [[0.2 * np.cos(a), top, sz + 0.2 * np.sin(a)] for a in ang] + [[0.22 * np.cos(a), 0, sz + 0.22 * np.sin(a)] for a in ang]
sp = np.array(sp); stt = []
for i in range(n):
    j = (i + 1) % n; stt.append((0, 1 + i, 1 + j)); stt.append((1 + i, 1 + n + i, 1 + j)); stt.append((1 + j, 1 + n + i, 1 + n + j))
stt = np.array(stt)
f = T - C; f /= np.linalg.norm(f); r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r); u = np.cross(r, f)
k = 1 / np.tan(np.radians(fov) / 2)
def proj(P):
    d = P - C; z = d @ f
    return np.stack([(d @ r) / z * k, (d @ u) / z * k, z], 1)
def zbuf(P, Tn):
    Q = proj(P); Z = np.full((H, W), np.inf); who = np.full((H, W), -1)
    A, B, Cc = Q[Tn[:, 0]], Q[Tn[:, 1]], Q[Tn[:, 2]]
    lo = np.minimum(np.minimum(A, B), Cc); hi = np.maximum(np.maximum(A, B), Cc)
    ok = (hi[:, 0] > -1) & (lo[:, 0] < 1) & (hi[:, 1] > -1) & (lo[:, 1] < 1) & (lo[:, 2] > 0.05)
    cell = 2 / W
    for i in np.nonzero(ok)[0]:
        a, b, c = A[i], B[i], Cc[i]
        i0, i1 = max(0, int((lo[i, 0] + 1) / cell)), min(W - 1, int((hi[i, 0] + 1) / cell))
        j0, j1 = max(0, int((lo[i, 1] + 1) / cell)), min(H - 1, int((hi[i, 1] + 1) / cell))
        if i1 < i0 or j1 < j0: continue
        us = -1 + (np.arange(i0, i1 + 1) + 0.5) * cell; vs = -1 + (np.arange(j0, j1 + 1) + 0.5) * cell
        U, V = np.meshgrid(us, vs)
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-16: continue
        l1 = ((b[1] - c[1]) * (U - c[0]) + (c[0] - b[0]) * (V - c[1])) / den
        l2 = ((c[1] - a[1]) * (U - c[0]) + (a[0] - c[0]) * (V - c[1])) / den
        l3 = 1 - l1 - l2
        m = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
        z = 1 / (l1 / a[2] + l2 / b[2] + l3 / c[2])
        sub = Z[j0:j1 + 1, i0:i1 + 1]; w = who[j0:j1 + 1, i0:i1 + 1]
        take = m & (z < sub); sub[take] = z[take]; w[take] = i
    return Z, who
Zs, ws = zbuf(body, tri); Zc, wc = zbuf(pts, st); Zt, wt = zbuf(sp, stt)
near = np.minimum(np.minimum(Zs, Zc), Zt)
out = np.full((H, W), '.')
out[np.isfinite(near) & (Zt == near)] = '='
out[np.isfinite(near) & (Zc == near)] = '#'
# the sheet's inner face: its triangles' own facing against the eye's line (wound so that the back middle faces back)
TA, TB, TD = pts[st[:, 0]], pts[st[:, 1]], pts[st[:, 2]]
TN = np.cross(TB - TA, TD - TA)
ref = 2 * (2 * cols + 36); sgn = -1 if TN[ref][2] > 0 else 1
cenT = (TA + TB + TD) / 3
facing = sgn * ((C - cenT) * TN).sum(1)
inner = np.zeros((H, W), bool); mm = np.isfinite(near) & (Zc == near)
inner[mm] = facing[wc[mm]] < 0
out[inner] = '%'
out[np.isfinite(near) & (Zs == near)] = 's'
for j in range(H - 1, -1, -1): print(''.join(out[j]))
m = (out == 's')
# her skin seen below the sheet's top: where
