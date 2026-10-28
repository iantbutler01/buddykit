import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial } from 'three';
import { resolveConfig, type BuddyConfig } from './config';
import { resolveTheme } from './themes';
import { blobGeometry } from './blob-geometry';
import { accessoryMeshes } from './accessories-3d';
import { createFace } from './face-3d';

/** Same geometry/materials as the browser, serialized for native scene rendering. */
export function nativeBuddyScene(input: Partial<BuddyConfig>) {
  const config = resolveConfig(input);
  if (config.species !== 'blob') return null;
  const root = new Group();
  const body = new Mesh(blobGeometry(config), new MeshLambertMaterial({ color: resolveTheme(config.theme).accent }));
  root.add(body, ...accessoryMeshes(config, body.geometry));
  const face = createFace(body, config);
  face.update('idle', null, 0, 1, 1, 1); root.add(face.group);
  root.updateMatrixWorld(true);
  const meshes: Array<{ positions: number[]; normals: number[]; indices: number[]; color: string; unlit: boolean; name: string }> = [];
  root.traverse(node => {
    if (!(node instanceof Mesh) || !node.visible) return;
    const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
    const material = node.material as MeshLambertMaterial;
    meshes.push({ positions: Array.from(geometry.getAttribute('position').array), normals: Array.from(geometry.getAttribute('normal').array),
      indices: geometry.index ? Array.from(geometry.index.array) : Array.from({length:geometry.getAttribute('position').count},(_,i)=>i),
      color: `#${material.color.getHexString()}`, unlit: material instanceof MeshBasicMaterial, name: node.name });
    geometry.dispose();
  });
  root.traverse(node => { if (node instanceof Mesh) { node.geometry.dispose(); (node.material as MeshLambertMaterial).dispose(); } });
  face.dispose();
  return { framing: config.accessories.length ? 1.85 : 1.45, meshes };
}
