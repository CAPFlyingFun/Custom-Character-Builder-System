/**
 * HER STEPS ON A TILE FLOOR (Joshua, 2026-11-07: "making procedural SFX for sneakers on tile floors like in a lab...
 * can we add the sound effect that plays every time the shoe steps down? Since we have the foot bone, it can be always
 * accurate"). No sound files: each step is made as it happens, the way he found it done -- a short low THUMP of a rubber
 * sole meeting tile, a burst of high-passed noise for its SCUFF, now and then a little rubber SQUEAK just after, and the
 * room's short ECHO (a lab: hard walls, not a hall).
 *
 * When a step is heard is not a timer but her feet: `StepWatch` follows each sneaker's heel (its lowest point, carried
 * by her ankle bone) and calls a step the moment it comes down onto the floor from off it. How hard, from how fast it
 * came down. So the steps keep time with her walk at any speed, any build, and nothing at all is heard while she stands.
 */

/**
 * When a heel is down and when it is up again, metres over the floor (two, so a heel resting at the line does not step
 * over and over), the least time between one foot's steps, and the speed down that makes a full-strength step. GAME
 * TUNING.
 */
export const STEP = Object.freeze({ down: 0.006, up: 0.015, apart: 0.22, fullSpeed: 0.45, quietest: 0.35 });

/** One foot's heel as `StepWatch` follows it. */
interface Heel { up: boolean; height: number; since: number }

/**
 * Her heels' heights over the floor, frame by frame: which came down onto it this frame, and how hard (0..1). Pure
 * arithmetic, so it can be tried without a sound.
 */
export class StepWatch {
  private readonly heels: Heel[] = [];
  private clock = 0;

  /** This frame's heights (metres over the floor, one a foot) after `dt` seconds: the feet that stepped, with how hard. */
  update(heights: readonly number[], dt: number): { foot: number; strength: number }[] {
    this.clock += dt;
    const steps: { foot: number; strength: number }[] = [];
    heights.forEach((h, foot) => {
      let heel = this.heels[foot];
      // (a foot first seen is wherever it is: down if it is down; nothing is heard for being there already)
      if (!heel) { heel = this.heels[foot] = { up: h > STEP.up, height: h, since: -Infinity }; return; }
      const speed = dt > 0 ? (heel.height - h) / dt : 0;
      heel.height = h;
      if (heel.up && h <= STEP.down) {
        heel.up = false;
        if (this.clock - heel.since >= STEP.apart) {
          heel.since = this.clock;
          steps.push({ foot, strength: Math.max(STEP.quietest, Math.min(1, speed / STEP.fullSpeed)) });
        }
      } else if (!heel.up && h > STEP.up) heel.up = true;
    });
    return steps;
  }

  /** Forget every foot (a new body, a jump of pose): the next frame sees them where they are. */
  reset(): void { this.heels.length = 0; this.clock = 0; }
}

/**
 * The sound of them: one audio graph, made on the first touch (a phone plays nothing until it is touched), each step
 * a few short sounds into it. `on` false is silent and makes nothing.
 */
export class TileSteps {
  on = true;
  private ctx: AudioContext | null = null;
  private room: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Make the sound (or wake it): on a touch or a key, as a phone requires. */
  unlock(): void {
    if (!this.on) return;
    const Ctx = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) {
      const ctx = new Ctx(), master = ctx.createGain(), room = ctx.createGain();
      master.gain.value = 0.7; master.connect(ctx.destination);
      // the room: what it hears goes on to the speaker, and a short reflection of it a little after (a tiled lab)
      const delay = ctx.createDelay(), echo = ctx.createGain();
      delay.delayTime.value = 0.075; echo.gain.value = 0.16;
      room.gain.value = 0.8;
      room.connect(master); room.connect(delay); delay.connect(echo); echo.connect(master);
      // the scuff's noise, made once and played from for every step
      const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.11), ctx.sampleRate), data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx; this.room = room; this.noise = noise;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** One step: `strength` 0..1, `foot` 0 or 1 (the second a little softer and lower, as one foot is). */
  step(strength: number, foot: number): void {
    const ctx = this.ctx, room = this.room;
    if (!this.on || !ctx || !room || !this.noise || ctx.state !== 'running') return;
    const time = ctx.currentTime + 0.005, other = foot % 2 === 1, s = (other ? 0.85 : 1) * Math.max(0, Math.min(1, strength));
    const env = (g: GainNode, at: number, peak: number, rise: number, fall: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + rise);
      g.gain.exponentialRampToValueAtTime(0.0001, at + fall);
    };
    // the sole on the tile: a quick low tap, falling
    const thump = ctx.createOscillator(), thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(other ? 125 : 145, time);
    thump.frequency.exponentialRampToValueAtTime(65, time + 0.075);
    env(thumpGain, time, 0.24 * s, 0.006, 0.12);
    thump.connect(thumpGain); thumpGain.connect(room);
    thump.start(time); thump.stop(time + 0.13);
    // its scuff: the noise, only its highs
    const scuff = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), scuffGain = ctx.createGain();
    scuff.buffer = this.noise;
    filter.type = 'highpass'; filter.frequency.value = 1100;
    env(scuffGain, time, 0.12 * s, 0.008, 0.09);
    scuff.connect(filter); filter.connect(scuffGain); scuffGain.connect(room);
    scuff.start(time); scuff.stop(time + 0.11);
    // now and then the rubber squeaks just after it lands, a little differently every time
    if (Math.random() > 0.35) {
      const squeak = ctx.createOscillator(), squeakGain = ctx.createGain(), at = time + 0.025;
      squeak.type = 'sine';
      squeak.frequency.setValueAtTime(2200 + Math.random() * 500, at);
      squeak.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 300, at + 0.045);
      env(squeakGain, at, 0.035 * s, 0.01, 0.055);
      squeak.connect(squeakGain); squeakGain.connect(room);
      squeak.start(at); squeak.stop(at + 0.06);
    }
  }

  dispose(): void { void this.ctx?.close(); this.ctx = null; this.room = null; this.noise = null; }
}
