import { BufferGeometry, Float32BufferAttribute } from 'three';
import { traceBlob, exactKeepsBumps, exactSquareness } from './blob';
import type { BuddyConfig } from './config';

/** Rounded extrusion of the existing outline, with broad faces and soft shoulders. */
export function blobGeometry(config: BuddyConfig): BufferGeometry {
  const contour: Array<[number, number]> = [];
  let current: [number, number] = [0, 0];
  const path = {
    moveTo(x: number, y: number) { current = [x, y]; },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
      const start = current;
      for (let step = 1; step <= 4; step++) {
        const t = step / 4, u = 1 - t;
        contour.push([u*u*start[0] + 2*u*t*cx + t*t*x, -(u*u*start[1] + 2*u*t*cy + t*t*y)]);
      }
      current = [x, y];
    },
    closePath() {},
  };
  const square = exactSquareness(config.body, config.squareness, config.hardness);
  const effectiveSquare = square + (1 - square) * 0.12 * config.gravity;
  traceBlob(path as unknown as Path2D, config.body, 1, 0, 0, 0,
    effectiveSquare, 0, config.core, 0, 2, exactKeepsBumps(config.body));
  const width = Math.max(...contour.map(p => p[0])) - Math.min(...contour.map(p => p[0]));
  const height = Math.max(...contour.map(p => p[1])) - Math.min(...contour.map(p => p[1]));
  const normalize = 2 / Math.max(width, height);
  const vertices: number[] = [], indices: number[] = [];
  const rings = 40, count = contour.length;
  const halfDepth = 0.26;
  for (let row = 0; row <= rings; row++) {
    const angle = -Math.PI / 2 + Math.PI * row / rings;
    const size = Math.pow(Math.max(0.00001, Math.cos(angle)), 0.38);
    const sine = Math.sin(angle);
    const z = Math.sign(sine) * Math.pow(Math.abs(sine), 0.38) * halfDepth;
    for (const [x, y] of contour) vertices.push(x * size * normalize, y * size * normalize, z);
  }
  for (let row = 0; row < rings; row++) for (let i = 0; i < count; i++) {
    const a = row * count + i, b = row * count + (i + 1) % count;
    const c = a + count, d = b + count;
    indices.push(a, c, b, b, c, d);
  }
  // Close both poles explicitly; a near-zero ring alone leaves a raycast hole.
  const back = vertices.length / 3;
  vertices.push(0, 0, -halfDepth);
  const front = vertices.length / 3;
  vertices.push(0, 0, halfDepth);
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    indices.push(i, next, back);
    indices.push(rings * count + i, front, rings * count + next);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
