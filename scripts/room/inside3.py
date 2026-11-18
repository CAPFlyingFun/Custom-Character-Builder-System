# HOW MUCH OF A SHEET'S SURFACE (not only its points) IS UNDER HER SKIN:
#   python3 inside3.py <her posed skin .b64> <sheet .json> [label] [--list]
# each quad of the sheet sampled 4 x 4; the nearest of her drawn triangles to each sample, and which side of it it is.
import sys, json, base64, numpy as np
src = open('/tmp/claude-0/-home-claude/0aec922d-6398-53e7-8334-b3d9add32b9d/scratchpad/inside.py').read()
head = src.split("K = 48")[0]
argv = sys.argv
exec(head)
def signed_of(P, K=48):
    _, idx = tree.query(P, k=K)
    out = np.zeros(len(P))
    for i, p in enumerate(P):
        t = idx[i]
        q = closest(p[None, :].repeat(len(t), 0), A[t], B[t], C[t])
        d = np.linalg.norm(q - p, axis=1); j = d.argmin()
        out[i] = np.sign(((p - q[j]) * N[t[j]]).sum()) * d[j]
    return out
G = pts.reshape(rows, cols, 3)
S4 = [(u + 0.5) / 4 for u in range(4)]
samples = []; where = []
for r in range(rows - 1):
    a = G[r]; b = np.roll(G[r], -1, axis=0); c = G[r + 1]; d = np.roll(G[r + 1], -1, axis=0)
    for u in S4:
        for v in S4:
            samples.append((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v)
            where.append(np.stack([np.full(cols, r + v), np.arange(cols) + u], 1))
P = np.concatenate(samples); W = np.concatenate(where)
sg = signed_of(P)
under = sg < -0.0005
print(f"{label}: {int(under.sum())} of {len(P)} samples of its surface under her skin ({100 * under.mean():.2f}%), deepest {(-sg.min() * 1000 if under.any() else 0):.1f} mm")
if under.any():
    rr = np.floor(W[under, 0]).astype(int); cc = np.floor(W[under, 1]).astype(int)
    print('  rows', {int(k): int((rr == k).sum()) for k in sorted(set(rr))})
    print('  cols', {int(k): int((cc == k).sum()) for k in sorted(set(cc))})
