import { expect, it } from 'vitest';
import { nativeBuddyScene } from '../src/native-scene';
import { resolveConfig } from '../src/config';
it('shares the dimensional body and accessories without mutating the saved identity', () => {
  const config = resolveConfig({ species: 'blob', body: 'bean', accessories: ['headset', 'glasses'], theme: 'pop-gold' });
  const before = JSON.stringify(config);
  const scene = nativeBuddyScene(config)!;
  expect(JSON.stringify(config)).toBe(before);
  expect(scene.meshes.filter(m => m.name.startsWith('eye-'))).toHaveLength(2);
  expect(scene.meshes.some(m => m.name === 'headset-band')).toBe(true);
  expect(scene.meshes.every(m => m.positions.length === m.normals.length && m.indices.length % 3 === 0)).toBe(true);
});
