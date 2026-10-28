import { expect, it } from 'vitest';
import { BLOB_BODIES, exactKeepsBumps, exactSquareness, traceBlob } from '../src/blob';

it('keeps resting crafted silhouettes within the same proportion family', () => {
  for (const body of BLOB_BODIES) {
    for (const squareness of [0, 0.5, 1]) {
      const points: [number, number][] = [];
      const path = {
        moveTo(x: number, y: number) { points.push([x, y]); },
        quadraticCurveTo(cx: number, cy: number, x: number, y: number) { points.push([cx, cy], [x, y]); },
        closePath() {},
      };
      traceBlob(path as unknown as Path2D, body, 100, 0, 0, 0,
        exactSquareness(body, squareness, 0), 0, 'sphere', 0, 0, exactKeepsBumps(body));
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const ratio = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
      expect(ratio, `${body} at squareness ${squareness}`).toBeGreaterThanOrEqual(0.88 - 1e-10);
      expect(ratio, `${body} at squareness ${squareness}`).toBeLessThanOrEqual(1.18 + 1e-10);
    }
  }
});
