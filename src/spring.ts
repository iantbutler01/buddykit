/** Critically-dampable spring — the only motion primitive in buddykit. */
export class Spring {
  p: number;
  v = 0;
  t: number;
  k: number;
  d: number;

  constructor(v: number, k = 130, d = 13) {
    this.p = v;
    this.t = v;
    this.k = k;
    this.d = d;
  }

  set(t: number) {
    this.t = t;
  }

  snap(t: number) {
    this.p = this.t = t;
    this.v = 0;
  }

  step(dt: number): number {
    const a = -this.k * (this.p - this.t) - this.d * this.v;
    this.v += a * dt;
    this.p += this.v * dt;
    return this.p;
  }
}
