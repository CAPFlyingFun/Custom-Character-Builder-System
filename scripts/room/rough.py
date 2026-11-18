# WHERE A SHEET IS ROUGH: python3 rough.py <sheet.json> [n=12]: each point against the mean of its four neighbours in the grid, the worst
import sys, json, base64, numpy as np
sheet = json.load(open(sys.argv[1])); cols, rows = sheet['columns'], sheet['rows']; n = int(sys.argv[2]) if len(sys.argv) > 2 else 12
P = np.frombuffer(base64.b64decode(sheet['data']), dtype=np.float32).reshape(rows, cols, 3).astype(np.float64)
L = np.zeros((rows, cols))
for r in range(1, rows - 1):
    m = (P[r - 1] + P[r + 1] + np.roll(P[r], 1, 0) + np.roll(P[r], -1, 0)) / 4
    L[r] = np.linalg.norm(P[r] - m, axis=1)
idx = np.argsort(-L.ravel())[:n]
print(f"{sys.argv[1]}: off its neighbours' mean, mm: median {np.median(L[1:-1]) * 1000:.1f}, 99th {np.percentile(L[1:-1], 99) * 1000:.1f}, most {L.max() * 1000:.1f}")
print('  worst:', ' '.join(f"r{i // cols}c{i % cols}:{L.ravel()[i] * 1000:.0f}" for i in idx))
