import {Interval, Vec3} from "./math.js";
import {DifferentialGeometry} from "./diffgeometry.js";

export class Surface {
    sample(u, v, target) {
        throw new Error("Abstract class: sample() must be implemented!");
    }

    alwaysWith(view) { return { body: this, view: view, always: true }; };
    onceWith(view) { return { body: this, view: view, always: false}; };
}

export class HeightFieldSurface extends Surface {
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

    get width() { return this._width; }
    get depth() { return this._depth; }

    sample(u, v, target) {
        const x = (u - 0.5) * this._width;
        const z = (v - 0.5) * this._depth;
        target.set(x, this._field.scalarValueAt(x, z), z);
    }
}

export class ParametricSurface extends Surface {
    constructor({
        uRange = new Interval(-0.5, 0.5),
        vRange = new Interval(-0.5, 0.5),
        x = (u, v) => u,
        y = (u, v) => v,
        z = (u, v) => 0
    } = {}) {
        super();
        this._uRange = uRange;
        this._vRange = vRange;
        this._x = x;
        this._y = y;
        this._z = z;
    }

    sample(u, v, target) {
        const uu = this._uRange.scaleUnitParameter(u);
        const vv = this._vRange.scaleUnitParameter(v);
        target.set(this._x(uu, vv), this._z(uu, vv), this._y(uu, vv));
    }
}

/**
 * Scalar field on a surface.
 * │
 * ├── MeanCurvatureField
 * ├── GaussianCurvatureField
 * ├── PrincipalCurvatureField
 * ├── GeodesicDistanceField
 * ├── UserDefinedField
 */
export class SurfaceScalarField {
    constructor(surface) {
        this._surface = surface;
        this._target = new Vec3();
    }

    set surface(newSurface) { this._surface = newSurface; }

    scalarValueAt(u, v) {
        throw new Error("scalarValueAt() must be implemented!");
    }
}

export class HeightScalarField extends SurfaceScalarField {
    constructor(surface) {
        super(surface);
    }

    scalarValueAt(u, v) {
        this._surface.sample(u, v, this._target);
        return this._target.y;
    }
}

export class MeanCurvatureField extends SurfaceScalarField {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    set surface(newSurface) { this._surface = newSurface; this._geometry = new DifferentialGeometry(newSurface); }

    scalarValueAt(u, v) {
        return this._geometry.normalMeanGaussian(u, v).H;
    }
}

export class GaussianCurvatureField extends SurfaceScalarField {
    constructor(surface) {
        super(surface);
        this._geometry = new DifferentialGeometry(surface);
    }

    set surface(newSurface) { this._surface = newSurface; this._geometry = new DifferentialGeometry(newSurface); }

    scalarValueAt(u, v) {
        return this._geometry.normalMeanGaussian(u, v).K;
    }
}

export class PrincipalCurvatureField extends SurfaceScalarField {
    constructor(surface, which = 1) {
        super(surface);
        this._which = which;
    }

    set surface(newSurface) { this._surface = newSurface; this._geometry = new DifferentialGeometry(newSurface); }

    scalarValueAt(u, v) {
        const { k1, k2 } =
            this._geometry.principals(u, v);

        return this._which === 1 ? k1 : k2;
    }
}

//
// TODO WHAT FOLLOWS BELOW IS NOT OK ==> NEED TO BECOME FIELDS!!
//
export class PDESurfaceField extends SurfaceScalarField {
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
export class PDESurface extends Surface {
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