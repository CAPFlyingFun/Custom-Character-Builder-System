/**
 * A NUMBER TYPED EXACTLY, WITH A LIST THAT LOOKS IT UP AS IT IS TYPED (Joshua, 2026-11-19: "can we also make the main belly
 * slider with the option to type a specific amount like max belly and stuff with the slider to do like exactly 30%, or
 * 76%, etc… maybe could change the UI of all that to a scrollable list with a smart look up so if you start typing 5… it
 * will only show things starting at 5 like 50-59, if it was 1, it would should 1, 11-19, 100-199, etc…").
 *
 * `valuesStartingWith` is the look-up (pure): the whole numbers from `min` to `max` whose digits begin with what is typed.
 * `attachLookup` puts the list under a box: it opens when the box is touched, narrows at each key, scrolls, and a value
 * tapped -- or typed whole and Enter pressed -- is the box's value. The list floats over the page (fixed to the screen
 * under its box), so it fits any panel; its rows are 32 px tall (his: "it's hard to press certain buttons").
 */

/** The whole numbers from `min` to `max` whose digits begin with `typed` (all of them while nothing is typed), in order. */
export function valuesStartingWith(typed: string, min: number, max: number): number[] {
  const t = typed.trim().replace(/%$/, '');
  const lo = Math.ceil(Math.min(min, max)), hi = Math.floor(Math.max(min, max)), out: number[] = [];
  if (!/^\d*$/.test(t)) return out;
  for (let v = lo; v <= hi; v++) if (String(v).startsWith(t)) out.push(v);
  return out;
}

export interface LookupOptions {
  readonly min: number;
  readonly max: number;
  /** A value tapped in the list. */
  readonly pick: (v: number) => void;
  /** The value now (marked in the list, and scrolled to when nothing is typed). */
  readonly now?: () => number | null;
  /** What follows a value in the list ('%'). */
  readonly unit?: string;
}

/** The list's own look. GAME TUNING (his 32 px touch rule). */
export const LOOKUP_ROW_PX = 32, LOOKUP_ROWS_SHOWN = 6;

/** Opens a look-up list under `input` while it is in use; returns what takes it off again. */
export function attachLookup(input: HTMLInputElement, o: LookupOptions): () => void {
  const list = document.createElement('div');
  list.dataset.role = 'value-lookup';
  list.style.cssText = `position:fixed;z-index:1000;display:none;overflow-y:auto;max-height:${LOOKUP_ROW_PX * LOOKUP_ROWS_SHOWN}px;` +
    'background:#0d1117;border:1px solid #ffffff40;border-radius:8px;box-shadow:0 6px 18px #0008;-webkit-overflow-scrolling:touch';
  document.body.appendChild(list);
  let shown: number[] = [];
  const place = () => {
    const r = input.getBoundingClientRect(), w = Math.max(r.width, 76);
    list.style.left = `${Math.min(Math.max(4, r.left), window.innerWidth - w - 4)}px`;
    list.style.top = `${r.bottom + 2}px`;
    list.style.width = `${w}px`;
  };
  const fill = () => {
    const typed = input.value, now = o.now?.() ?? null, values = valuesStartingWith(typed, o.min, o.max);
    // (the same list as before: left as it is, so a finger mid-scroll is not thrown back)
    if (values.length === shown.length && values.every((v, k) => v === shown[k])) return;
    shown = values;
    list.replaceChildren(...values.map((v) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.value = String(v);
      b.textContent = `${v}${o.unit ?? ''}`;
      b.style.cssText = `display:block;width:100%;height:${LOOKUP_ROW_PX}px;border:0;border-bottom:1px solid #ffffff14;background:${v === now ? '#d4a85340' : 'transparent'};color:#e8e2d8;font:600 13px system-ui;text-align:left;padding:0 10px;cursor:pointer`;
      // (pressed without taking the box's focus: the list stays until the value is in)
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('click', () => { input.value = String(v); close(); o.pick(v); });
      return b;
    }));
    list.style.display = values.length ? 'block' : 'none';
    if (!typed.trim() && now !== null) { const k = values.indexOf(Math.round(now)); if (k >= 0) list.scrollTop = Math.max(0, (k - 2) * LOOKUP_ROW_PX); }
    else list.scrollTop = 0;
  };
  const open = () => { place(); shown = []; fill(); };
  const close = () => { list.style.display = 'none'; shown = []; };
  const onFocus = () => open(), onInput = () => { place(); fill(); }, onBlur = () => close();
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); input.blur(); } };
  input.addEventListener('focus', onFocus);
  input.addEventListener('input', onInput);
  input.addEventListener('blur', onBlur);
  input.addEventListener('keydown', onKey);
  return () => {
    input.removeEventListener('focus', onFocus); input.removeEventListener('input', onInput);
    input.removeEventListener('blur', onBlur); input.removeEventListener('keydown', onKey);
    list.remove();
  };
}
