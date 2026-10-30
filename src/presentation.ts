import { mountBuddy as mountLegacy, renderPosterPng as posterLegacy, type BuddyMountOptions } from './rig';
import { mountBuddy3D } from './rig-3d';
import { resolveConfig } from './config';

/** Stored identities are unchanged; blob presentation now uses the dimensional rig. */
export function mountBuddy(canvas: HTMLCanvasElement, options: BuddyMountOptions = {}) {
  return resolveConfig(options).species === 'blob' ? mountBuddy3D(canvas, options) : mountLegacy(canvas, options);
}
export async function renderPosterPng(options: BuddyMountOptions & { size?: number; state?: import('./states').BuddyState } = {}): Promise<Blob> {
  if (resolveConfig(options).species !== 'blob') return posterLegacy(options);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = options.size ?? 512;
  const handle = mountBuddy3D(canvas, { ...options, reducedMotion: true, dprCap: 1 });
  handle.setState(options.state ?? 'idle');
  try { return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to render Nym portrait')), 'image/png')); }
  finally {
    handle.destroy();
    // A poster owns a disposable offscreen canvas. Free its context as well as
    // its GL objects so a grid of previews cannot evict the live character.
    canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
