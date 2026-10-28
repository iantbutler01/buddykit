import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry } from 'three';
import { accessoryLayer, drawAccessory, type AccessoryGeom } from './accessories';
import { blobAnchors } from './blob';
import type { BuddyConfig } from './config';
import { resolveTheme } from './themes';

/** Reuse the accessory artwork on body-local planes, so it follows the 3D tilt. */
export function accessoryMeshes(config: BuddyConfig, body: BufferGeometry): Mesh[] {
  if (!config.accessories.length) return [];
  body.computeBoundingBox();
  const bounds = body.boundingBox!;
  const unit = 140, canvasSize = 512;
  const positions = body.getAttribute('position');
  const count = (positions.count - 2) / 41;
  const clip = new Path2D();
  for (let i = 0; i < count; i++) {
    const index = 20 * count + i;
    const x = positions.getX(index) * unit, y = -positions.getY(index) * unit;
    if (i === 0) clip.moveTo(x, y); else clip.lineTo(x, y);
  }
  clip.closePath();
  const theme = resolveTheme(config.theme);
  const geom: AccessoryGeom = {
    anchors: blobAnchors(unit, -bounds.max.y * unit, -bounds.min.y * unit,
      { cy: -0.16 * config.eyeRaise * unit, ox: config.eyeShift * 0.15 * unit, oy: 0 }),
    eyeCX: 0.24 * config.eyeSpacing * unit, ringR: 0.18 * config.eyeSize * unit,
    t: 0, dark: '#242326', accent: theme.accent, clipCloth: clip, clipHead: clip,
    colors: config.accessoryColors, tone: config.accessoryTone, defaultTone: '#242326', fine: true,
  };
  return (['behind', 'front'] as const).flatMap(layer => {
    const names = config.accessories.filter(name => (accessoryLayer(name) === 'behind' ? 'behind' : 'front') === layer);
    if (!names.length) return [];
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!; ctx.translate(canvasSize / 2, canvasSize / 2);
    for (const name of names) drawAccessory(ctx, name, geom, 1);
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    const material = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide, depthWrite: false });
    const mesh = new Mesh(new PlaneGeometry(canvasSize / unit, canvasSize / unit), material);
    mesh.position.z = layer === 'behind' ? -0.28 : 0.30;
    return [mesh];
  });
}
