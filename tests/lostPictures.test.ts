/**
 * A PICTURE THE BROWSER HAS DROPPED (sarahlab/lostPictures.ts; Joshua, 2026-11-13, of her skin gone black after the
 * screen was turned: "not sure if it could be a phone memory thing as well"). A decoded picture can be there in name and
 * empty after a phone restarts a page's graphics; it is told from a live one by looking at it, and the room says when
 * its graphics were restarted.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glbImage } from '../src/assets/assets';
import { LOOK_SIZE, graphicsNote, pictureLost } from '../src/sarahlab/lostPictures';

const decoded = () => true;
const samples = (rgba: readonly number[]) => { const out = new Uint8ClampedArray(LOOK_SIZE * LOOK_SIZE * 4); for (let i = 0; i < out.length; i += 4) out.set(rgba, i); return out; };

describe('a picture the browser has dropped', () => {
  it('a decoded picture that draws as something is alive', () => {
    expect(pictureLost({ width: 2048, height: 2048 }, () => samples([201, 152, 130, 255]), decoded)).toBe(false);
    // a normal map is never nothing; one live sample among empty ones is enough
    const one = samples([0, 0, 0, 0]); one[4 * 17 + 2] = 255;
    expect(pictureLost({ width: 2048, height: 2048 }, () => one, decoded)).toBe(false);
  });
  it('one that is closed, can not be drawn, or draws as nothing at all is lost', () => {
    expect(pictureLost({ width: 0, height: 0 }, () => samples([1, 1, 1, 255]), decoded)).toBe(true);
    expect(pictureLost({ width: 2048, height: 2048 }, () => null, decoded)).toBe(true);
    expect(pictureLost({ width: 2048, height: 2048 }, () => samples([0, 0, 0, 0]), decoded)).toBe(true);
    // (given back opaque and black is as lost as given back clear)
    expect(pictureLost({ width: 2048, height: 2048 }, () => samples([0, 0, 0, 255]), decoded)).toBe(true);
  });
  it('what is not a decoded picture is never called lost: the browser can decode an image element again', () => {
    const never = () => { throw new Error('not looked at'); };
    expect(pictureLost({ width: 2048, height: 2048 }, never, () => false)).toBe(false);
    expect(pictureLost(null, never)).toBe(false);
    expect(pictureLost({ width: 0, height: 0 }, never)).toBe(false);
  });
  it('the notice says nothing until the graphics have been taken away, then says what became of her pictures', () => {
    expect(graphicsNote({ lost: 0, restored: 0, redecoded: 0, gone: 0 })).toBe('');
    expect(graphicsNote({ lost: 1, restored: 0, redecoded: 0, gone: 0 })).toMatch(/^graphics lost/);
    expect(graphicsNote({ lost: 1, restored: 1, redecoded: 0, gone: 0 })).toBe('graphics restarted ×1 · ');
    expect(graphicsNote({ lost: 3, restored: 3, redecoded: 5, gone: 0 })).toBe('graphics restarted ×3 (5 of her pictures decoded again) · ');
    expect(graphicsNote({ lost: 1, restored: 1, redecoded: 4, gone: 1 })).toMatch(/1 of her pictures could not be brought back: BACK opens the room again/);
  });
});

/**
 * A DROPPED PICTURE IS DECODED AGAIN FROM THE MODEL FILE IT CAME IN (assets.ts `glbImage`, `redecodePictures`): the
 * picture's own packed bytes are found in the file by the image's number, as the file's table of contents gives them.
 */

/** A .glb made by hand: its table of contents, then its bytes. */
function glb(json: unknown, bin: Uint8Array): ArrayBuffer {
  const pad = (bytes: Uint8Array, fill: number) => { const out = new Uint8Array(Math.ceil(bytes.length / 4) * 4).fill(fill); out.set(bytes); return out; };
  const j = pad(new TextEncoder().encode(JSON.stringify(json)), 0x20), b = pad(bin, 0);
  const out = new Uint8Array(12 + 8 + j.length + 8 + b.length), view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, out.length, true);
  view.setUint32(12, j.length, true); view.setUint32(16, 0x4e4f534a, true); out.set(j, 20);
  view.setUint32(20 + j.length, b.length, true); view.setUint32(24 + j.length, 0x004e4942, true); out.set(b, 28 + j.length);
  return out.buffer;
}

describe('a picture found again in its model file', () => {
  const bin = new Uint8Array(64).map((_, i) => i);
  const file = glb({ buffers: [{ byteLength: 64 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 16 }, { buffer: 0, byteOffset: 16, byteLength: 10 }, { buffer: 0, byteOffset: 40, byteLength: 24 }],
    images: [{ bufferView: 1, mimeType: 'image/png' }, { bufferView: 2, mimeType: 'image/webp' }, { uri: 'outside.png' }] }, bin);
  it('by its number: its own bytes and its kind', () => {
    const first = glbImage(file, 0)!, second = glbImage(file, 1)!;
    expect(first.mimeType).toBe('image/png'); expect([...first.bytes]).toEqual([...bin.subarray(16, 26)]);
    expect(second.mimeType).toBe('image/webp'); expect([...second.bytes]).toEqual([...bin.subarray(40, 64)]);
  });
  it('none for a picture the file does not hold inside itself, a number it has not got, or bytes that are no model file', () => {
    expect(glbImage(file, 2)).toBeNull();
    expect(glbImage(file, 9)).toBeNull();
    expect(glbImage(new Uint8Array(40).buffer, 0)).toBeNull();
    expect(glbImage(new ArrayBuffer(4), 0)).toBeNull();
    expect(glbImage(file.slice(0, file.byteLength - 20), 1)).toBeNull();
    // a picture said to lie past the end of the file's bytes
    expect(glbImage(glb({ bufferViews: [{ buffer: 0, byteOffset: 60, byteLength: 40 }], images: [{ bufferView: 0 }] }, bin), 0)).toBeNull();
    // bytes kept in another file beside it
    expect(glbImage(glb({ buffers: [{ uri: 'beside.bin' }], bufferViews: [{ buffer: 0, byteLength: 8 }], images: [{ bufferView: 0 }] }, bin), 0)).toBeNull();
  });
  it('every picture inside every model file the room serves is found, whole, and is a picture', () => {
    const models = join(__dirname, '..', 'public', 'models');
    let pictures = 0;
    for (const name of readdirSync(models).filter((f) => f.endsWith('.glb'))) {
      const bytes = readFileSync(join(models, name)), buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const length = new DataView(buffer).getUint32(12, true);
      const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length))) as { images?: { bufferView?: number; mimeType?: string }[]; bufferViews?: { byteLength: number }[] };
      (json.images ?? []).forEach((image, index) => {
        if (image.bufferView === undefined) return;
        const found = glbImage(buffer, index);
        expect(found, `${name} image ${index}`).not.toBeNull();
        expect(found!.bytes.byteLength, `${name} image ${index}`).toBe(json.bufferViews![image.bufferView].byteLength);
        const b = found!.bytes, head = String.fromCharCode(...b.subarray(0, 12));
        const kind = b[0] === 0x89 && head.slice(1, 4) === 'PNG' ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP' ? 'image/webp' : head.slice(1, 7) === 'KTX 20' ? 'image/ktx2' : 'unknown';
        expect(kind, `${name} image ${index}`).toBe(found!.mimeType);
        pictures++;
      });
    }
    // her body's own pictures among them (her skin, her normal map, her roughness)
    expect(pictures).toBeGreaterThanOrEqual(3);
  });
});
