/**
 * THE WALKING STRIP (Joshua, 2026-11-08: "let the model actually walk and move from her legs vs just animation...
 * Obviously in the room don't want her to walk off and wander around, but could create a 5x10 meter walking strip and if
 * it gets to the end, will loop back seamlessly so you can see it walking"; Trello #273, step 2).
 *
 * She walks for real: her planted feet hold the floor and her body is carried over them (`actor/humanFeet.ts`, in the
 * room's `stepFeet`), at the true distance walked. What the room DRAWS is a floating origin, the rule TRADDOMIUM keeps for
 * its island -- the world's position is authoritative, the rendered one is temporary: she is drawn where she stands and
 * the strip is drawn moving under her. Its markings repeat every STRIP.stretch metres, so where the stretch ends and the
 * next begins nothing can change on screen, and the loop is seamless by construction rather than by a jump hidden from
 * the camera. Nothing she wears, nothing that sways on her and no camera ever moves for it.
 *
 * The strip is STRIP.width wide -- its edges drawn -- with a thin line every metre and a bold one where each stretch
 * starts, and it fades out ahead of her and behind her, so its drawn ends are never seen.
 *
 * THE SLOPE (Joshua, 2026-11-08: "test on different gradient like flat floor at 0, 30 straight ahead, and walking
 * (standing first) parallel to that angle"; then "we need to also add a downward slope... -30/-20/-10/0/+10/+20/+30"):
 * the belt tilts up to SLOPE.most degrees either way, AHEAD of her (+ uphill, - downhill) or ACROSS her path (+ rising to
 * her left, - to her right), like a treadmill's incline: a plane through where she stands, the belt running along it.
 * The ground she walks on is that plane (`slopeGrade`, `slopeNormal`).
 */
import * as THREE from 'three';

/** Which way the slope runs under her: along her path, or across it. */
export type SlopeHeading = 'ahead' | 'across';
/** `deg`: + rises ahead of her (uphill) or to her left; - falls ahead (downhill) or rises to her right. */
export interface StageSlope { readonly deg: number; readonly heading: SlopeHeading }
/** The steepest the belt tilts either way, degrees: Joshua's 30. A staircase's pitch; the steepest city streets are
 * about 17. */
export const SLOPE = Object.freeze({ most: 30, headings: Object.freeze(['ahead', 'across'] as const) });
const DEG = Math.PI / 180;

/** How the ground rises, per metre, along x and along z (her left is +x when `leftSign` is +1), at this slope. */
export function slopeGrade(s: StageSlope, leftSign = 1): { readonly x: number; readonly z: number } {
  const t = Math.tan(Math.max(-SLOPE.most, Math.min(SLOPE.most, s.deg || 0)) * DEG);
  return s.heading === 'across' ? { x: t * (leftSign < 0 ? -1 : 1), z: 0 } : { x: 0, z: t };
}

/** The ground's normal (unit) at this slope. */
export function slopeNormal(s: StageSlope, leftSign = 1): readonly [number, number, number] {
  const g = slopeGrade(s, leftSign), n = Math.hypot(g.x, 1, g.z);
  return [-g.x / n, 1 / n, -g.z / n];
}

/** The SLOPE line in the room. */
export function slopeLine(s: StageSlope): string {
  const d = Math.round(s.deg || 0);
  if (d === 0) return 'SLOPE · 0° · flat';
  const way = s.heading === 'across' ? `across, rising to her ${d > 0 ? 'left' : 'right'}` : d > 0 ? 'uphill' : 'downhill';
  return `SLOPE · ${d > 0 ? '+' : '−'}${Math.abs(d)}° · ${way}`;
}

/** The strip, metres. `width` and `stretch` are Joshua's 5 x 10 m; the rest GAME TUNING on renders. */
export const STRIP = Object.freeze({
  /** Across her path. */
  width: 5,
  /** One stretch: its markings repeat this often, so one stretch's end is the next one's start. */
  stretch: 10,
  /** Clear this far ahead and behind her... */
  clear: 4,
  /** ...and gone by this far (so it is drawn twice this long). */
  fade: 12,
});

/** How much of the strip shows `z` metres ahead of (or behind) her: all of it near her, none past STRIP.fade. */
export function stripFade(z: number): number {
  const d = Math.abs(z), t = Math.min(1, Math.max(0, (d - STRIP.clear) / (STRIP.fade - STRIP.clear)));
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Where the strip's pattern stands when she has walked `walked` metres: the texture's offset along its length, 0..1 of a
 * stretch. A mark `z` metres along the strip from where she started is drawn at `z - walked` from her, so the mark she
 * started on comes round again every stretch. (The plane's length runs along world -Z as its UV v rises.)
 */
export function stripOffset(walked: number): number {
  const p = -walked / STRIP.stretch - STRIP.fade / STRIP.stretch;
  return p - Math.floor(p);
}

/** Pixels in the pattern: across (the width) and along (one stretch). */
const PX = Object.freeze({ across: 256, along: 1024 });

export class WalkStrip {
  /** What goes in the scene: the strip, tilted to the slope. */
  readonly object = new THREE.Group();
  readonly mesh: THREE.Mesh;
  /** Metres along the belt per metre she walks ahead (more, on a slope rising or falling ahead). */
  private along = 1;
  private readonly texture: THREE.CanvasTexture | null;
  private readonly canvas: HTMLCanvasElement | null;

  constructor(units: number) {
    const geometry = new THREE.PlaneGeometry(STRIP.width * units, 2 * STRIP.fade * units, 1, 96);
    // the fade, as each vertex's alpha (the plane lies along world z once laid flat: its own y is -z)
    const pos = geometry.getAttribute('position'), colour = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) colour.set([1, 1, 1, stripFade(pos.getY(i) / units)], 4 * i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colour, 4));
    this.canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
    if (this.canvas) { this.canvas.width = PX.across; this.canvas.height = PX.along; }
    this.texture = this.canvas ? new THREE.CanvasTexture(this.canvas) : null;
    if (this.texture) {
      this.texture.wrapT = THREE.RepeatWrapping;
      this.texture.repeat.set(1, (2 * STRIP.fade) / STRIP.stretch);
      this.texture.anisotropy = 8;
      this.texture.colorSpace = THREE.SRGBColorSpace;
    }
    const material = new THREE.MeshStandardMaterial({ map: this.texture, vertexColors: true, transparent: true, depthWrite: false, roughness: 0.95, metalness: 0 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = -1;
    this.mesh.name = 'walkStrip';
    this.object.add(this.mesh);
    this.object.visible = false;
  }

  /** Tilt it to the slope, about where she stands. */
  setSlope(s: StageSlope, leftSign = 1): void {
    const g = slopeGrade(s, leftSign);
    // rising toward +z is a turn about x by -atan; rising toward +x a turn about z by +atan
    this.object.rotation.set(-Math.atan(g.z), 0, Math.atan(g.x));
    this.along = Math.hypot(1, g.z);
  }

  /** Paint it in the stage's floor and rim colours (studioTheme.ts `THEME_STAGE`). */
  setColours(floor: number, rim: number): void {
    const c = this.canvas?.getContext('2d');
    if (!c || !this.texture) return;
    const W = PX.across, H = PX.along, perM = H / STRIP.stretch, css = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    // its lines in the rim's colour taken twice as far from the floor's, so they read on a floor seen side-on
    const line = [16, 8, 0].reduce((n, s) => { const f = (floor >> s) & 255, r = (rim >> s) & 255; return n | (Math.max(0, Math.min(255, Math.round(f + 2 * (r - f)))) << s); }, 0);
    c.fillStyle = css(floor); c.fillRect(0, 0, W, H);
    c.fillStyle = css(line);
    // a line every metre (5 cm); the stretch's own start bold (16 cm), split across the pattern's two ends so it wraps whole
    const lineW = Math.round(0.05 * perM), boldW = Math.round(0.16 * perM);
    for (let m = 1; m < STRIP.stretch; m++) c.fillRect(0, Math.round(m * perM - lineW / 2), W, lineW);
    c.fillRect(0, 0, W, boldW / 2); c.fillRect(0, H - boldW / 2, W, boldW / 2);
    // its edges (8 cm)
    const edge = Math.round((0.08 / STRIP.width) * W);
    c.fillRect(0, 0, edge, H); c.fillRect(W - edge, 0, edge, H);
    this.texture.needsUpdate = true;
  }

  /** Where she is along it: `walked` metres from where she started. */
  setWalked(walked: number): void {
    if (this.texture) this.texture.offset.y = stripOffset(walked * this.along);
  }

  dispose(): void {
    this.object.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.texture?.dispose();
  }
}
