import { expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { Mesh, MeshBasicMaterial } from 'three';
import { BLOB_BODIES } from '../src/blob';
import { blobGeometry } from '../src/blob-geometry';
import { resolveConfig } from '../src/config';

it('ports every existing body to a finite mesh with real depth and a front-facing surface', () => {
  for (const body of BLOB_BODIES) {
    const geometry = blobGeometry(resolveConfig({ body, species: 'blob' }));
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.52);
    for (const value of geometry.attributes.position.array) expect(Number.isFinite(value)).toBe(true);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(0, 0, 3), new Vector3(0, 0, -1));
    const hit = ray.intersectObject(mesh)[0];
    expect(hit, body).toBeDefined();
    expect(hit.point.z, body).toBeGreaterThan(0.25);
    expect(hit.face!.normal.z, body).toBeGreaterThan(0);
    geometry.dispose(); material.dispose();
  }
});
