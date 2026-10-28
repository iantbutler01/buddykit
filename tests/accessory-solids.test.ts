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
