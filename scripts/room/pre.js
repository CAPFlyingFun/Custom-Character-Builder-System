const S = '/tmp/claude-0/-home-claude/0aec922d-6398-53e7-8334-b3d9add32b9d/scratchpad/t/';
const v = async (t, yaw, d = 250, dy = -0.05, pitch = 0.03) => { await hook('aim', yaw, pitch, d, 0, dy, 0); await pic(S + t + '.jpg', 1); };
const wear = async (name) => {
  await press(`sarahlab:outfit:builtin:${name}`); for (let k = 0; k < 300; k++) { const o = await text('sarahlab:outfit'); if (o && o.includes(name) && !o.includes('…')) break; await wait(400); }
  await wait(1500);
  if (name.includes('tee')) for (let k = 0; k < 160; k++) { const w = await hook('garmentWorn'); if (w && w.worn && !w.tailoring && w.outfit) break; await wait(500); }
  await run(6);
};
const preg = async (on) => { const p = await text('sarahlab:pregnant'); if (p && p.includes(on ? 'OFF' : 'ON')) await press('sarahlab:pregnant'); };
const out = {};
const read = async (k) => { const s = await hook('skirt'), low = await hook('paintLowState'); out[k] = s ? { fit: s.settings.fit ?? 1, len: s.settings.length, flare: s.settings.flare, hem: s.hem, rows: s.stats.rows, spanned: s.stats.spanned, cutMs: s.cutMs, jumps: s.stats.jumps, simMs: +s.stats.simMs.toFixed(1), skinMs: +s.stats.skinMs.toFixed(1), skinPut: s.stats.skinPut, skinPutMost: +(s.stats.skinPutMost * 1000).toFixed(1), legs: low && low.layers ? low.layers.filter(Boolean).map((l) => +(l.end ?? 0).toFixed(3)) : null, saved: (await hook('skirtSettings')).saved } : null; save(S + 'out-' + TAG + '.json', out); };
const set = async (patch) => { await hook('skirtSettings', patch); await wait(1200); await run(8); };
const points = async (k) => { save(S + k + '-sheet.json', await hook('skirtPoints')); save(S + k + '-skin.b64', await hook('skirtSkin')); };
const stand = async () => { await press('sarahlab:stand'); await hook('animate', 2, 1 / 30); await hook('hold', false); await wait(800); };
