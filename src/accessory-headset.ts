import type { BufferGeometry } from 'three';
import { AccessorySolids } from './accessory-solids';

/** Fit the headset around the actual equatorial outline rather than a nominal head width. */
export function buildHeadset(s: AccessorySolids, body: BufferGeometry, eyeY: number, front: number) {
  const p = body.getAttribute('position');
  const count = (p.count - 2) / 41;
  const contour = Array.from({ length: count }, (_, i) => [p.getX(20 * count + i), p.getY(20 * count + i)]);
  const cupY = eyeY - .12;
  const edge = (dx: number, dy: number) => {
    let distance = Infinity;
    for (let i = 0; i < count; i++) {
      const a = contour[i], b = contour[(i + 1) % count];
      const sx = b[0] - a[0], sy = b[1] - a[1];
      const denom = dx * sy - dy * sx;
      if (Math.abs(denom) < 1e-8) continue;
      const ax = a[0], ay = a[1] - cupY;
      const t = (ax * sy - ay * sx) / denom;
      const u = (ax * dy - ay * dx) / denom;
      if (t > 0 && u >= 0 && u <= 1) distance = Math.min(distance, t);
    }
    return distance;
  };
  const band = Array.from({ length: 41 }, (_, i) => {
    const angle = Math.PI * i / 40;
    const dx = -Math.cos(angle), dy = Math.sin(angle), radius = edge(dx, dy) + .09;
    return [dx * radius, cupY + dy * radius, 0];
  });
  s.tube(band, .035).name = 'headset-band';
  for (const point of [band[0], band[band.length - 1]]) s.ball(point[0], cupY, 0, .085, .17, .16);
  const left = band[0][0];
  s.tube([[left,cupY-.09,.08],[left-.025,cupY-.22,front+.10],[-.58,cupY-.29,front+.13],[-.34,cupY-.28,front+.13]],.024);
  s.ball(-.31,cupY-.28,front+.13,.06,.04,.04);
}
