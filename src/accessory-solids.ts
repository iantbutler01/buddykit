import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry,
  Float32BufferAttribute, Mesh, MeshLambertMaterial, Shape, SphereGeometry,
  TorusGeometry, TubeGeometry, Vector3,
} from 'three';

/** Shared solid primitives for the existing accessory vocabulary. */
export class AccessorySolids {
  readonly meshes: Mesh[] = [];
  constructor(readonly name: string, readonly color: string) {}
  add(geometry: BufferGeometry, x: number, y: number, z: number, color = this.color): Mesh {
    const mesh = new Mesh(geometry, new MeshLambertMaterial({ color }));
    mesh.name = this.name;
    mesh.position.set(x, y, z);
    this.meshes.push(mesh);
    return mesh;
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, color = this.color) {
    return this.add(new BoxGeometry(w, h, d), x, y, z, color);
  }
  ball(x: number, y: number, z: number, w: number, h = w, d = w, color = this.color) {
    const mesh = this.add(new SphereGeometry(1, 24, 16), x, y, z, color);
    mesh.scale.set(w, h, d);
    return mesh;
  }
  cylinder(x: number, y: number, z: number, top: number, bottom: number, h: number, color = this.color) {
    return this.add(new CylinderGeometry(top, bottom, h, 40), x, y, z, color);
  }
  ring(x: number, y: number, z: number, radius: number, thickness: number, color = this.color) {
    return this.add(new TorusGeometry(radius, thickness, 10, 48), x, y, z, color);
  }
  tube(points: number[][], radius: number, color = this.color) {
    return this.add(new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 40, radius, 8, false), 0, 0, 0, color);
  }
  plate(points: number[][], z: number, depth = .065, color = this.color, bevel = .018) {
    const shape = new Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    return this.add(new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 3, steps: 1, curveSegments: 16 }), 0, 0, z, color);
  }
  /** A real thin shell conforming to the body's surface, clipped to a height band. */
  garment(body: BufferGeometry, low: number, high: number, color = this.color) {
    const p = body.getAttribute('position'), n = body.getAttribute('normal'), idx = body.getIndex()!;
    const vertices: number[] = [];
    const clip = (poly: Vector3[], y: number, keepAbove: boolean): Vector3[] => {
      const out: Vector3[] = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const insideA = keepAbove ? a.y >= y : a.y <= y;
        const insideB = keepAbove ? b.y >= y : b.y <= y;
        if (insideA) out.push(a);
        if (insideA !== insideB) out.push(a.clone().lerp(b, (y - a.y) / (b.y - a.y)));
      }
      return out;
    };
    for (let i = 0; i < idx.count; i += 3) {
      let poly = [0, 1, 2].map(j => {
        const k = idx.getX(i + j);
        return new Vector3().fromBufferAttribute(p, k).addScaledVector(new Vector3().fromBufferAttribute(n, k), .018);
      });
      poly = clip(clip(poly, low, true), high, false);
      for (let j = 1; j < poly.length - 1; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) vertices.push(v.x, v.y, v.z);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return this.add(geometry, 0, 0, 0, color);
  }
}
