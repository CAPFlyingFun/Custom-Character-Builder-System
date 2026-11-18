const TAG = 'n3';
const note = (k, x) => { out[k] = x; save(S + 'out-' + TAG + '.json', out); };
const st = async () => { const s = await hook('skirt'); return { put: s.stats.skinPut, most: +(s.stats.skinPutMost * 1000).toFixed(1), taut: s.stats.tautPut, tautMost: +(s.stats.tautMost * 1000).toFixed(1), skinMs: +s.stats.skinMs.toFixed(1), simMs: +s.stats.simMs.toFixed(1) }; };
await preg(false); await hook('bump', 0); await wait(3000); await run(4);
await wear('cloth pencil skirt (under belly)'); await press('sarahlab:stand'); await wait(800); await run(6);
// the shell (FIT 0, no paint), drawn taut across her creases: standing, six moments of a walk from her back and her front, seated
note('stand', await st()); await v('st-q', 0.6); await v('st-b', 3.14); await v('st-s', 1.57); await points('st');
{ await hook('hold', true); await press('sarahlab:walk'); for (let i = 0; i < 6; i++) { await hook('animate', i ? 0.2 : 0.95, 1 / 30); await points('wk' + i); await v('wk' + i + '-b', 3.14, 130, -0.2); await v('wk' + i + '-f', 0, 130, -0.2); if (i % 2) await v('wk' + i + '-s', 1.57, 130, -0.2); note('wk' + i, await st()); } await stand(); }
{ await hook('hold', true); await press('sarahlab:sit'); await hook('animate', 4, 1 / 30); await v('sit-q', 0.6); await v('sit-s', 1.57, 150, -0.15); await v('sit-b', 3.14, 150, -0.15); await points('sit'); note('sit', await st()); await stand(); }
return { out, errors: errors.slice(1) };
