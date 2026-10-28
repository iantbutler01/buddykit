import { CapsuleGeometry, CatmullRomCurve3, Group, Mesh, MeshBasicMaterial, Raycaster, TubeGeometry, Vector3 } from 'three';
import type { BuddyConfig } from './config';
import { faceLayout } from './face-layout';
import type { BuddyEvent, BuddyState } from './states';

/** Pill eyes and curved pleased eyes share the same positions on the body's face. */
export function createFace(body: Mesh, config: BuddyConfig) {
  const group = new Group();
  const layout = faceLayout(config);
  const ink = new MeshBasicMaterial({ color: 0x16181d });
  const pill = new CapsuleGeometry(1, 2.48, 12, 24);
  const curve = new TubeGeometry(new CatmullRomCurve3([
    new Vector3(-1, -.25, 0), new Vector3(-.65, .35, 0), new Vector3(0, .62, 0),
    new Vector3(.65, .35, 0), new Vector3(1, -.25, 0),
  ]), 20, .24, 8, false);
  const ray = new Raycaster();
  const entries = [-1, 1].map(side => {
    const x = side * layout.halfSpacing + layout.centerX, y = layout.centerY;
    ray.set(new Vector3(x, y, 3), new Vector3(0, 0, -1));
    const hit = ray.intersectObject(body)[0];
    const mount = new Group(); mount.position.set(x, y, (hit?.point.z ?? .26) + .018);
    if (hit?.face) mount.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hit.face.normal);
    const eye = new Mesh(pill, ink), smile = new Mesh(curve, ink);
    smile.scale.setScalar(.20 * config.eyeSize); smile.visible = false;
    mount.add(eye, smile); group.add(mount);
    return { eye, smile, side };
  });
  let openness = 1, width = 1, slant = 0;
  function update(state: BuddyState, event: BuddyEvent | null, eventWeight: number, blink: number, easing: number, attention: number) {
    let targetOpen = state === 'away' ? .12 : state === 'working' ? .72 : state === 'listening' ? 1.17 : state === 'needs_you' ? 1 + .24 * attention : 1;
    let targetWidth = state === 'listening' ? 1.04 : 1;
    let targetSlant = 0;
    if (event === 'surprise') { targetOpen += .38 * eventWeight; targetWidth += .30 * eventWeight; }
    if (event === 'tired') targetOpen = .32;
    if (event === 'angry' || event === 'annoyed') { targetOpen = .65; targetSlant = -.26 * eventWeight; }
    if (event === 'sad') { targetOpen = .8; targetSlant = .20 * eventWeight; }
    openness += (targetOpen - openness) * easing;
    width += (targetWidth - width) * easing;
    slant += (targetSlant - slant) * easing;
    const pleased = event === 'joy' && eventWeight > .18;
    for (const {eye, smile, side} of entries) {
      const asymmetric = state === 'listening' && side === -1 ? 1.1 : 1;
      eye.scale.set(layout.pillScale * width, layout.pillScale * openness * asymmetric * blink, .026);
      eye.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), slant * side);
      eye.visible = !pleased; smile.visible = pleased;
    }
  }
  return { group, update, dispose() { pill.dispose(); curve.dispose(); ink.dispose(); } };
}
