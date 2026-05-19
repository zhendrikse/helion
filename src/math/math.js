/*************************
 * M A T H E M A T I C S *
 *************************/

export class Vec3 {
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;

        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    }

    set(x,y,z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    addScaledVector(v, scalar) {
        this.x += v.x * scalar;
        this.y += v.y * scalar;
        this.z += v.z * scalar;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    projectOnVector(v) {
        const denominator = v.lengthSq();

        if (denominator === 0) {
            return this.set(0, 0, 0);
        }

        const scalar = this.dot(v) / denominator;

        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;

        return this;
    }

    normalize() {
        const inv = 1 / this.length();

        this.x *= inv;
        this.y *= inv;
        this.z *= inv;

        return this;
    }
}

export class Integrators {
    static eulerStep(body, dt, accelerationFn) {
        const acceleration = accelerationFn(body);
        const newBody = body.clone();

        newBody.velocity.addScaledVector(acceleration, dt);
        newBody.position.addScaledVector(body.velocity, dt);
        newBody.acceleration = acceleration;

        return newBody;
    }

    static symplecticEulerStep(body, dt, accelerationFn) {
        const acceleration = accelerationFn(body);
        const newBody = body.clone();

        newBody.velocity.addScaledVector(acceleration, dt);
        newBody.position.addScaledVector(newBody.velocity, dt);
        newBody.acceleration = acceleration;

        return newBody;
    }

    static rk2Step(body, dt, accelerationFn) {
        const acceleration = accelerationFn(body);

        const derivative = (body) => ({
            dx: body.velocity.clone(),
            dv: acceleration
        });

        const k1 = derivative(body);

        const mid = body.clone();
        mid.position.addScaledVector(k1.dx, dt);
        mid.velocity.addScaledVector(k1.dv, dt);

        const k2 = derivative(mid);

        const newBody = body.clone();
        newBody.position.addScaledVector(k1.dx.clone().add(k2.dx), dt / 2);
        newBody.velocity.addScaledVector(k1.dv.clone().add(k2.dv), dt / 2);
        newBody.acceleration = acceleration;

        return newBody;
    }

    static rk4Step(body, dt, accelerationFn) {
        const acceleration = accelerationFn(body);

        const derivative = (body) => ({
            dx: body.velocity.clone(),
            dv: acceleration
        });

        const k1 = derivative(body);

        const s2 = body.clone();
        s2.position.addScaledVector(k1.dx, dt / 2);
        s2.velocity.addScaledVector(k1.dv, dt / 2);
        const k2 = derivative(s2);

        const s3 = body.clone();
        s3.position.addScaledVector(k2.dx, dt / 2);
        s3.velocity.addScaledVector(k2.dv, dt / 2);
        const k3 = derivative(s3);

        const s4 = body.clone();
        s4.position.addScaledVector(k3.dx, dt);
        s4.velocity.addScaledVector(k3.dv, dt);
        const k4 = derivative(s4);

        const newBody = body.clone();

        newBody.position
            .addScaledVector(k1.dx, dt / 6)
            .addScaledVector(k2.dx, dt / 3)
            .addScaledVector(k3.dx, dt / 3)
            .addScaledVector(k4.dx, dt / 6);

        newBody.velocity
            .addScaledVector(k1.dv, dt / 6)
            .addScaledVector(k2.dv, dt / 3)
            .addScaledVector(k3.dv, dt / 3)
            .addScaledVector(k4.dv, dt / 6);

        newBody.acceleration = acceleration;

        return newBody;
    }
}

export class Range {
    constructor(from, to, stepSize) {
        this.from = from;
        this.to = to;
        this.stepSize = stepSize || 0.1;
    }

    /**
     * Use:
     *   for (const x of range)
     *     console.log(x);
     *
     * @returns {Generator<*, void, *>}
     */
    *[Symbol.iterator]() {
        if (!isFinite(this.from) || !isFinite(this.to))
            throw new Error("Cannot iterate over an infinite interval.");
        if (this.stepSize <= 0)
            throw new Error("stepSize must be > 0");

        const n = Math.floor((this.to - this.from) / this.stepSize);
        for (let i = 0; i <= n; i++)
            yield this.from + i * this.stepSize;
    }
}

export class VectorFieldVector {
    constructor({
                    position = new Vec3(),
                    axis = new Vec3()
                } = {})  {
        this.position = position.clone();
        this.axis = axis.clone();
    }

    clone() {
        return new VectorFieldVector({
            position: this.position.clone(),
            axis: this.axis.clone(),
        });
    }

    to(view) { return { body: this, view: view}; };
}

export class ScalarField2D {
    valueAt(i, j) {}

    valueAtNormalized(u, v) {}

    step(dt) {}
}

class ScalarFieldValue {
    constructor({
                    position = new Vec3(),
                    value = 0
                } = {})  {
        this.position = position.clone();
        this.value = value;
    }

    clone() {
        return new VectorFieldVector({
            position: this.position.clone(),
            value: this.value,
        });
    }

    to(view) { return { body: this, view: view}; };
}

export class ComplexScalarFieldValue {
    constructor({
                    position = new Vec3(),
                    value = new Complex(0, 0)
                } = {})  {
        this.position = position.clone();
        this.value = value;
    }

    clone() {
        return new VectorFieldVector({
            position: this.position.clone(),
            value: this.value.clone(),
        });
    }

    get axis() { return new Vec3(0, this.value.re, this.value.im); }
}

export class VectorField {
    constructor() { }

    to(view) { return { body: this, view: view}; };

    vectorAt(positionVector) {
        throw new Error("You invoked the method of an abstract base class. Please create a subclass first.");
    }

    #centralDifferences(position, h) {
        const dx = new Vec3(h, 0, 0);
        const dy = new Vec3(0, h, 0);
        const dz = new Vec3(0, 0, h);

        const Fx1 = this.vectorAt(position.clone().add(dx));
        const Fx0 = this.vectorAt(position.clone().sub(dx));

        const Fy1 = this.vectorAt(position.clone().add(dy));
        const Fy0 = this.vectorAt(position.clone().sub(dy));

        const Fz1 = this.vectorAt(position.clone().add(dz));
        const Fz0 = this.vectorAt(position.clone().sub(dz));
        return { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 };
    }

    divergence(position, h = 1e-2) {
        const { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 } = this.#centralDifferences(position, h);

        return (
            (Fx1.x - Fx0.x) +
            (Fy1.y - Fy0.y) +
            (Fz1.z - Fz0.z)
        ) / (2 * h);
    }

    curl(position, h = 1e-2) {
        const { Fx0, Fy0, Fz0, Fx1, Fy1, Fz1 } = this.#centralDifferences(position, h);

        return new Vec3(
            (Fy1.z - Fy0.z - (Fz1.y - Fz0.y)) / (2 * h),
            (Fz1.x - Fz0.x - (Fx1.z - Fx0.z)) / (2 * h),
            (Fx1.y - Fx0.y - (Fy1.x - Fy0.x)) / (2 * h)
        );
    }

    curlMagnitude(position, h = 1e-2) {
        return this.curl(position, h).length();
    }
}

export class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    clone() { return new Complex(this.re, this.im); }

    absSquared() { return Complex.absSquared(this); }
    abs() { return Complex.abs(this); }
    phase = () => Math.atan2(this.im, this.re);

    static multiplyScalar = (a, scalar) => new Complex(a.re * scalar, a.im * scalar);
    static fromPhase = (theta) => new Complex(Math.cos(theta), Math.sin(theta));
    static absSquared(z_) { return z_.re * z_.re + z_.im * z_.im; }
    static abs = (z) => Math.sqrt(Complex.absSquared(z));
    static add = (a, b) => new Complex(a.re + b.re, a.im + b.im);
    static subtract = (a, b) => new Complex(a.re - b.re, a.im - b.im);
    static multiply = (a, b) => new Complex(
        a.re * b.re - a.im * b.im,
        a.re * b.im + a.im * b.re
    );
    static log = (z) => new Complex(Math.log(Complex.abs(z)), Math.atan2(z.im, z.re));
    static exp = (z) => new Complex(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im))
    static sin(z) {
        const a = Complex.exp(new Complex(-z.im, z.re));
        const b = Complex.exp(new Complex(z.im, -z.re));
        return new Complex((a.im - b.im) / 2, (b.re - a.re) / 2);
    }
    static divide = (z1, z2) => {
        const denominator = z2.re * z2.re + z2.im * z2.im;
        const re = z1.re * z2.re + z1.im * z2.im;
        const im = z1.im * z2.re - z1.re * z2.im;
        return new Complex(re / denominator, im / denominator);
    }
    static sqrt(z) {
        const r = Complex.abs(z);
        const real = Math.sqrt((r + z.re) / 2);
        const imag = Math.sign(z.im || 1) * Math.sqrt((r - z.re) / 2);
        return new Complex(real, imag);
    }
}

/**
 * Static parametric surface.
 *
 * Each subclass of this class implements a function F(u, v) => (x, y, z) that can be attached to a surface view.
 */
export class StaticSurface {
    sample(u, v, target) {
        throw new Error("Abstract class: sample() must be implemented!");
    }

    to(view) { return { body: this, view: view}; };
}

/**
 * Dynamic parametric surface.
 *
 * Each subclass of this class implements a function F(u, v, t) => (x, y, z) that can be attached to a surface view.
 */
export class DynamicSurface {
    sample(u, v, time, target) {
        throw new Error("Abstract class: sample() must be implemented!");
    }

    update(dt, time) {}

    to(view) { return { body: this, view: view}; };
}

/**
 * Field for a surface based on a lattice
 */
export class SurfaceField {
    valueAt(i, j) {
        throw new Error("valueAt(i,j) not implemented");
    }
}

export class PDESurfaceField extends SurfaceField {
    constructor({
        resolution = 50
    } = {}) {
        super();
        this._resolution = resolution;
        this._u = this._createGrid(resolution);
        this._uPrev = this._createGrid(resolution);
        this._uNext = this._createGrid(resolution);
        this._time = 0;
    }

    _createGrid(n) {
        return Array.from({ length: n }, () => new Float32Array(n));
    }

    update(dt) {
        this._time += dt;
        this.step(dt);
        this._swap();
    }

    _swap() {
        const tmp = this._uPrev;
        this._uPrev = this._u;
        this._u = this._uNext;
        this._uNext = tmp;
    }

    // override in subclass
    step(dt) {
        throw new Error("step(dt) must be implemented in each concrete PDE surface");
    }

    valueAt(i, j) { return this._u[i][j]; }

    size() { return this._resolution; }
}

export class FiniteDifferenceMethodField extends PDESurfaceField{
    constructor({
        resolution = 100,
        damping = 0.999,
        waveSpeed = 2
    } = {}) {
        super({resolution});
        this._c = waveSpeed
        this._damping = damping;
        this._init();
    }

    _init() {
        for (let i = 0; i < this._resolution; i++)
            for (let j = 0; j < this._resolution; j++) {
                const x = i / this._resolution;
                const y = j / this._resolution;

                this._u[i][j] = Math.sin(10 * x) * Math.cos(10 * y);
                this._uPrev[i][j] = this._u[i][j];
            }
    }

    step(dt) {
        const resolution = this._resolution;
        const c2 = this._c * this._c;
        const dt_dt_c2 = dt * dt * c2;
        for (let i = 1; i < resolution - 1; i++)
            for (let j = 1; j < resolution - 1; j++) {
                const laplacian =
                    this._u[i+1][j] + this._u[i-1][j] + this._u[i][j+1] + this._u[i][j-1] - 4 * this._u[i][j];
                this._uNext[i][j] = 2 * this._u[i][j] - this._uPrev[i][j] + dt_dt_c2 * laplacian;
                this._uNext[i][j] *= this._damping;
            }

        this._applyBoundary();
    }

    _applyBoundary() {
        const n = this._resolution - 1;
        for (let i = 0; i < this._resolution; i++) {
            this._uNext[0][i] = 0;
            this._uNext[n][i] = 0;
            this._uNext[i][0] = 0;
            this._uNext[i][n] = 0;
        }
    }

}

/**
 * Partial different equation surface, a dynamic surface governed by a partial differential equation.
 */
export class PDESurface extends DynamicSurface {
    constructor({
        field,
        width = 10,
        depth = 10
    } = {}) {
        super();
        this._field = field;
        this._width = width;
        this._depth = depth;
    }

    update(dt) {
        this._field.update(dt);
    }

    sample(u, v, target) {
        const i = Math.floor(u * (this._field.size() - 1));
        const j = Math.floor(v * (this._field.size() - 1));
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;

        target.set(x, this._field.valueAt(i, j), z);
    }
}
