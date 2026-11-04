/**
 * THE SCENE CONTRACT the Character Room is built against -- the part of TRADDOMIUM's `app/Scene.ts` it uses, and no
 * more. A host gives it a renderer (the WebGL renderer, a render call, the canvas size) and a DOM layer above the
 * canvas; TRADDOMIUM's own `SceneContext` has both (and much else), so the game can host the room unchanged, and this
 * repository's own page (`main.ts`) hosts it with nothing else at all.
 */
import type * as THREE from 'three';

export interface FrameInfo {
  /** Unclamped wall-clock seconds since last frame -- for measurement only. */
  readonly rawDt: number;
  /** Clamped simulation seconds, 0 while paused -- for integration. */
  readonly simDt: number;
  /** Accumulated simulation seconds. */
  readonly elapsed: number;
}

export interface AppScene {
  readonly name: string;
  readonly three: THREE.Scene;
  readonly camera: THREE.Camera;
  /** Heavy loading belongs here, behind the loading screen. */
  enter(): Promise<void>;
  update(frame: FrameInfo): void;
  resize(width: number, height: number): void;
  dispose(): void;
  /** Anything drawn after the main render pass (a HUD pass, a second camera). */
  renderOverlays?(): void;
  /** True for a screen that may be held upright on a phone (the Character Room is). */
  readonly portrait?: boolean;
}

/** What the room draws with: three's renderer, one render call, the canvas's size in CSS pixels. */
export interface RoomRenderer {
  readonly gl: THREE.WebGLRenderer;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  size(): { width: number; height: number };
}

export interface SceneContext {
  readonly renderer: RoomRenderer;
  /** The DOM layer above the canvas. */
  readonly uiLayer: HTMLElement;
}

export type SceneFactory = (ctx: SceneContext) => AppScene;
