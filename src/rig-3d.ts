import {
  AmbientLight, Color, DataTexture, DirectionalLight, Group, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, MeshToonMaterial, NearestFilter, NoColorSpace, NoToneMapping, OrthographicCamera,
  RedFormat, Scene, SRGBColorSpace, UnsignedByteType,
  WebGLRenderer,
} from 'three';
import { accessoryMeshes } from './accessories-3d';
import { blobGeometry } from './blob-geometry';
import { resolveConfig, type BuddyConfig } from './config';
import { resolveTheme } from './themes';
import type { BuddyHandle, BuddyMountOptions } from './rig';
import { EMOTES, type BuddyEvent, type BuddyState } from './states';
import { createFace } from './face-3d';
import { BLOB_PRESENTATION, blobPose } from './blob-presentation';

export interface Buddy3DOptions extends BuddyMountOptions {
  /** Turn in radians; positive faces toward the content to the right. */
  turn?: number;
  tilt?: number;
  animateTilt?: boolean;
  shading?: "cel" | "smooth" | "flat";
  lightPosition?: [number, number, number];
  ambientIntensity?: number;
  lightIntensity?: number;
  celTones?: [number, number, number];
}

/** Blob renderer with real depth and cel lighting, capped at 30 draws per second. */
export function mountBuddy3D(canvas: HTMLCanvasElement, options: Buddy3DOptions = {}): BuddyHandle {
  // Capture logical dimensions before Three applies device pixel density. Detached
  // poster canvases have no client size; backing pixels must never become CSS pixels.
  let width = canvas.clientWidth || canvas.width, height = canvas.clientHeight || canvas.height;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.dprCap ?? 2));
  const scene = new Scene();
  const camera = new OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 20);
  camera.position.set(0, 0.12, 6);
  camera.lookAt(0, 0, 0);
  scene.add(new AmbientLight(0xffffff, options.ambientIntensity ?? BLOB_PRESENTATION.ambientIntensity));
  const key = new DirectionalLight(0xffffff, options.lightIntensity ?? BLOB_PRESENTATION.lightIntensity);
  const [lightX, lightY, lightZ] = options.lightPosition ?? BLOB_PRESENTATION.lightPosition;
  key.position.set(lightX, lightY, lightZ);
  scene.add(key);
  const tones = new DataTexture(new Uint8Array(options.celTones ?? [70, 165, 255]), 3, 1, RedFormat, UnsignedByteType);
  tones.minFilter = tones.magFilter = NearestFilter;
  tones.colorSpace = NoColorSpace;
  tones.needsUpdate = true;
  const character = new Group();
  scene.add(character);
  let config = resolveConfig(options), state: BuddyState = 'idle';
  let attention = 1, disposed = false, frame = 0;
  let inView = true, projectionDirty = true, lastDraw = -Infinity;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const animated = () => !(options.reducedMotion ?? motionPreference.matches);
  const visible = () => !document.hidden && inView;
  renderer.setSize(width, height, false);
  const motionStarted = performance.now();
  let gazeX = 0, gazeY = 0, targetX = 0, targetY = 0;
  let face: ReturnType<typeof createFace> | undefined;
  let emote: BuddyEvent | null = null, emoteStarted = 0, lastFrame = 0;
  function rebuild() {
    face?.dispose();
    for (const child of [...character.children]) {
      character.remove(child);
      if (child instanceof Mesh) { child.geometry.dispose(); (child.material as MeshBasicMaterial).map?.dispose(); (child.material as MeshToonMaterial).dispose(); }
    }
    character.rotation.set(0, 0, 0);
    character.updateMatrixWorld(true);
    const color = new Color(resolveTheme(config.theme).accent);
    const material = options.shading === "flat"
      ? new MeshBasicMaterial({ color })
      : options.shading !== "cel"
      ? new MeshLambertMaterial({ color })
      : new MeshToonMaterial({ color, gradientMap: tones });
    const body = new Mesh(blobGeometry(config), material);
    character.add(body);
    body.updateMatrixWorld(true);
    for (const accessory of accessoryMeshes(config, body.geometry)) character.add(accessory);
    face = createFace(body, config);
    character.add(face.group);
  }
  function render(time = 0) {
    if (disposed) return;
    const w = canvas.clientWidth || width, h = canvas.clientHeight || height;
    if (w !== width || h !== height) {
      width = w; height = h;
      // setSize rewrites canvas.width/height even for unchanged sizes, resetting WebGL.
      renderer.setSize(width, height, false);
      projectionDirty = true;
    }
    if (projectionDirty) {
      const aspect = width / height;
      const framing = options.figureShare ? 1 / options.figureShare : config.accessories.length ? 1.85 : 1.45;
      camera.left = -framing * aspect; camera.right = framing * aspect;
      camera.top = framing; camera.bottom = -framing; camera.updateProjectionMatrix();
      projectionDirty = false;
    }
    const moving = animated();
    const now = time || performance.now();
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : .016;
    lastFrame = now;
    const duration = emote === 'flare' ? 1.1 : emote ? EMOTES[emote] : 0;
    const elapsed = (now - emoteStarted) / 1000;
    if (emote && elapsed > duration) emote = null;
    const weight = emote ? Math.min(1, elapsed / .12, (duration - elapsed) / .18) : 0;
    const blinkPhase = now % 4700;
    const blink = moving && blinkPhase < 150 ? Math.max(.1, Math.abs(blinkPhase - 75) / 75) : 1;
    face?.update(state, emote, weight, blink, moving ? 1 - Math.exp(-delta * 16) : 1, attention);
    gazeX += (targetX - gazeX) * (moving ? 1 - Math.exp(-delta * 10) : 1);
    gazeY += (targetY - gazeY) * (moving ? 1 - Math.exp(-delta * 10) : 1);
    const tiltPhase = now / 1400;
    const pose = blobPose(moving && (options.animateTilt ?? true) ? Math.max(0, now - motionStarted) / 1000 : 0);
    character.rotation.x = (options.tilt ?? pose.tilt) + gazeY * .45 + (moving && options.animateTilt && options.tilt !== undefined ? Math.sin(tiltPhase) * 0.20 : 0);
    character.rotation.y = (options.turn ?? pose.turn) + gazeX * .8 + (moving && options.animateTilt && options.turn !== undefined ? Math.sin(tiltPhase * 0.7) * 0.24 : 0);
    character.rotation.z = state === 'listening' ? -.07 : 0;
    if (emote === 'nod') character.rotation.x += Math.sin(elapsed * 12) * .15 * weight;
    if (emote === 'shake') character.rotation.y += Math.sin(elapsed * 14) * .18 * weight;
    if (emote === 'joy') character.rotation.z += Math.sin(elapsed * 8) * .04 * weight;
    character.position.y = moving && !options.animateTilt ? Math.sin(time / 1400) * 0.018 * config.bob : 0;
    renderer.render(scene, camera);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !visible()) return;
    if (now - lastDraw >= 1000 / 30 - 0.5) {
      render(now);
      lastDraw = now;
    }
    if (animated()) frame = requestAnimationFrame(tick);
  }
  function refresh() {
    if (disposed) return;
    if (!animated()) { render(); return; }
    if (visible() && !frame) frame = requestAnimationFrame(tick);
  }
  function visibilityChanged() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
    refresh();
  }
  function configure(partial: Partial<BuddyConfig>) { config = resolveConfig({ ...config, ...partial }); rebuild(); projectionDirty = true; refresh(); }
  rebuild(); render(); refresh();
  const resize = new ResizeObserver(refresh); resize.observe(canvas);
  const intersection = new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? false;
    visibilityChanged();
  });
  if (canvas.isConnected) intersection.observe(canvas);
  document.addEventListener('visibilitychange', visibilityChanged);
  motionPreference.addEventListener('change', visibilityChanged);
  return {
    setState(next) { if (state === next) return; state = next; options.onState?.(next); refresh(); },
    getState: () => state,
    setGaze(x, y) { targetX = Math.max(-1, Math.min(1, x)); targetY = Math.max(-1, Math.min(1, y)); if (!animated()) refresh(); },
    setAttention(value) { const next = Math.max(0, Math.min(1, value)); if (attention === next) return; attention = next; refresh(); },
    fire(event) { emote = event; emoteStarted = performance.now(); refresh(); },
    configure,
    getConfig: () => ({ ...config }),
    setTheme: theme => configure({ theme }),
    setFamily: family => configure({ family }),
    setCore: core => configure({ core }),
    setTrust: trust => configure({ trust }),
    destroy() {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      motionPreference.removeEventListener('change', visibilityChanged);
      for (const child of character.children) if (child instanceof Mesh) { child.geometry.dispose(); (child.material as MeshBasicMaterial).map?.dispose(); (child.material as MeshToonMaterial).dispose(); }
      face?.dispose(); tones.dispose(); renderer.dispose();
    },
  };
}
