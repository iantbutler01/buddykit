import { expect, it } from 'vitest';
import { ACCESSORIES } from '../src/accessories';
import { accessoryMeshes } from '../src/accessories-3d';
import { blobGeometry } from '../src/blob-geometry';
import { resolveConfig } from '../src/config';

it('builds every accessory as finite solid geometry, without image planes', () => {
  const base = resolveConfig({ species: 'blob', body: 'squircle' });
  const body = blobGeometry(base);
  for (const name of ACCESSORIES.filter(name => name !== 'none')) {
    const meshes = accessoryMeshes({ ...base, accessories: [name] }, body);
    expect(meshes.length, name).toBeGreaterThan(0);
    for (const mesh of meshes) {
      expect(mesh.geometry.type, name).not.toBe('PlaneGeometry');
      mesh.geometry.computeBoundingBox();
      const extent = mesh.geometry.boundingBox!;
      expect(extent.max.z - extent.min.z, name).toBeGreaterThan(0);
      for (const value of mesh.geometry.getAttribute('position').array) expect(Number.isFinite(value), name).toBe(true);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        expect('map' in material && material.map, name).toBeFalsy();
        material.dispose();
      }
      mesh.geometry.dispose();
    }
  }
  body.dispose();
});

it('keeps the headset band outside every body silhouette', async () => {
  const { BLOB_BODIES } = await import('../src/blob');
  for (const shape of BLOB_BODIES) {
    const config = resolveConfig({ species: 'blob', body: shape, accessories: ['headset'] });
    const body = blobGeometry(config), p = body.getAttribute('position');
    const count = (p.count - 2) / 41;
    const outline = Array.from({ length: count }, (_, i) => [p.getX(20 * count + i), p.getY(20 * count + i)]);
    const meshes = accessoryMeshes(config, body);
    const band = meshes.find(m => m.name === 'headset-band')!;
    const vertices = band.geometry.getAttribute('position');
    for (let k = 0; k < vertices.count; k++) {
      const x = vertices.getX(k), y = vertices.getY(k);
      let inside = false;
      for (let i = 0, j = count - 1; i < count; j = i++) {
        const a = outline[i], b = outline[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      expect(inside, `${shape}: band vertex ${k} clips the body`).toBe(false);
    }
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
    }
    body.dispose();
  }
});
