import {
  AmbientLight, Color, DataTexture, DirectionalLight, Group, Mesh, MeshBasicMaterial,
  MeshToonMaterial, NearestFilter, NoColorSpace, NoToneMapping, OrthographicCamera,
  Raycaster, RedFormat, Scene, SphereGeometry, SRGBColorSpace, UnsignedByteType,
  Vector3, WebGLRenderer,
} from 'three';
import { blobGeometry } from './blob-geometry';
import { resolveConfig, type BuddyConfig } from './config';
import { resolveTheme } from './themes';
import type { BuddyHandle, BuddyMountOptions } from './rig';
import type { BuddyState } from './states';

export interface Buddy3DOptions extends BuddyMountOptions {
  /** Turn in radians; positive faces toward the content to the right. */
  turn?: number;
}

/** Local 3D renderer prototype: the same blob contours, real depth and cel lighting. */
export function mountBuddy3D(canvas: HTMLCanvasElement, options: Buddy3DOptions = {}): BuddyHandle {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.dprCap ?? 2));
  const scene = new Scene();
  const camera = new OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 20);
  camera.position.set(0, 0.12, 6);
  camera.lookAt(0, 0, 0);
  scene.add(new AmbientLight(0xffffff, 0.7));
  const key = new DirectionalLight(0xffffff, 2.8);
  key.position.set(-3, 3, 6);
  scene.add(key);
  const tones = new DataTexture(new Uint8Array([70, 165, 255]), 3, 1, RedFormat, UnsignedByteType);
  tones.minFilter = tones.magFilter = NearestFilter;
  tones.colorSpace = NoColorSpace;
  tones.needsUpdate = true;
  const character = new Group();
  scene.add(character);
  let config = resolveConfig(options), state: BuddyState = 'idle';
  let attention = 1, disposed = false, frame = 0;
  let eyes: Group;
  const sphere = new SphereGeometry(1, 32, 20);
  const ink = new MeshBasicMaterial({ color: 0x16181d });
  function rebuild() {
    for (const child of [...character.children]) {
      character.remove(child);
      if (child instanceof Mesh) { child.geometry.dispose(); (child.material as MeshToonMaterial).dispose(); }
    }
    character.rotation.set(0, 0, 0);
    character.updateMatrixWorld(true);
    const material = new MeshToonMaterial({ color: new Color(resolveTheme(config.theme).accent), gradientMap: tones });
    const body = new Mesh(blobGeometry(config), material);
    character.add(body);
    body.updateMatrixWorld(true);
    eyes = new Group();
    character.add(eyes);
    const ray = new Raycaster();
    for (const side of [-1, 1]) {
      const x = side * 0.24 * config.eyeSpacing + config.eyeShift * 0.15;
      const y = 0.16 * config.eyeRaise;
      ray.set(new Vector3(x, y, 3), new Vector3(0, 0, -1));
      const hit = ray.intersectObject(body)[0];
      const eye = new Mesh(sphere, ink);
      eye.scale.set(0.058 * config.eyeSize, 0.13 * config.eyeSize, 0.024);
      eye.position.set(x, y, (hit?.point.z ?? 0.62) + 0.014);
      if (hit?.face) eye.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hit.face.normal);
      eyes.add(eye);
    }
  }
  function render(time = 0) {
    if (disposed) return;
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = -1.45 * aspect; camera.right = 1.45 * aspect;
    camera.top = 1.45; camera.bottom = -1.45; camera.updateProjectionMatrix();
    const animated = !(options.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches);
    character.rotation.y = options.turn ?? 0.48;
    character.rotation.z = state === 'listening' ? -0.025 : 0;
    character.position.y = animated ? Math.sin(time / 1400) * 0.018 * config.bob : 0;
    eyes.scale.y = state === 'away' ? 0.12 : state === 'working' ? 0.7 : state === 'needs_you' ? 1 + 0.12 * attention : 1;
    renderer.render(scene, camera);
    if (animated) frame = requestAnimationFrame(render);
  }
  function refresh() { cancelAnimationFrame(frame); render(); }
  function configure(partial: Partial<BuddyConfig>) { config = resolveConfig({ ...config, ...partial }); rebuild(); refresh(); }
  rebuild(); render();
  const resize = new ResizeObserver(refresh); resize.observe(canvas);
  return {
    setState(next) { state = next; options.onState?.(next); refresh(); },
    getState: () => state,
    setAttention(value) { attention = Math.max(0, Math.min(1, value)); refresh(); },
    fire() { refresh(); },
    configure,
    getConfig: () => ({ ...config }),
    setTheme: theme => configure({ theme }),
    setFamily: family => configure({ family }),
    setCore: core => configure({ core }),
    setTrust: trust => configure({ trust }),
    destroy() {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect();
      for (const child of character.children) if (child instanceof Mesh) { child.geometry.dispose(); (child.material as MeshToonMaterial).dispose(); }
      sphere.dispose(); ink.dispose(); tones.dispose(); renderer.dispose();
    },
  };
}
