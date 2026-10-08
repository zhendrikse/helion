import {
    ColorMappers, Colour, DiscreteFieldSurfaceView, DiscreteScalarField,
    FixedIntervalNormalizer, Interval, Simulation, Vec3
} from '../../../src/index.js';
import { Solver } from '../../../src/model/math/numerics/solvers/solvers.js';

const NX = 110;
const NY = 100;
const CELL_SIZE = 0.01;

const DENSITY = 1000;
const DT = 1 / 60;
const GRAVITY = 0;
const ITERATIONS = 40;
const OVER_RELAXATION = 1.9;

const OBSTACLE_X = 0.4;
const OBSTACLE_Y = 0.5;
const OBSTACLE_RADIUS = 0.15;

class FluidSolver extends Solver {
    constructor({ density = DENSITY, obstacleField }) {
        super();
        this._density = density;
        this._obstacleField = obstacleField;
        this._u = new Float64Array(NX * NY);
        this._v = new Float64Array(NX * NY);
        this._newU = new Float64Array(NX * NY);
        this._newV = new Float64Array(NX * NY);
        this._smoke = new Float64Array(NX * NY);
    }

    reset(pressureField) {
        this._u.fill(0);
        this._v.fill(0);
        this._newU.fill(0);
        this._newV.fill(0);
        this._smoke.fill(1);
        pressureField.reset();

        for (let y = 0; y < NY; y++)
            for (let x = 0; x < NX; x++) {
                const i = this._index(x, y);

                if (x === 0 || y === 0 || y === NY - 1)
                    this._obstacleField.setValueAt(x, y, 1);
                else
                    this._obstacleField.setValueAt(x, y, 0);

                const dx = (x + 0.5) * CELL_SIZE - OBSTACLE_X;
                const dy = (y + 0.5) * CELL_SIZE - OBSTACLE_Y;

                if (dx * dx + dy * dy < OBSTACLE_RADIUS * OBSTACLE_RADIUS)
                    this._obstacleField.setValueAt(x, y, 1);
            }

        this._applyInflow();
        this._updateSmokeField();
        return this;
    }

    step(pressureField) {
        this._integrate();
        pressureField.reset();
        this._solveIncompressibility(pressureField);
        this._extrapolate();
        this._advectVelocity();
        this._advectSmoke();
        this._applyInflow();
        this._applyOutlet();
        this._updateSmokeField();
        return this;
    }

    _integrate() {
        // The default Wind Tunnel scene has no gravity.
    }

    _solveIncompressibility(pressureField) {
        const cp = this._density * CELL_SIZE / DT;

        for (let iteration = 0; iteration < ITERATIONS; iteration++)
            for (let x = 1; x < NX - 1; x++)
                for (let y = 1; y < NY - 1; y++) {
                    if (this._isSolid(x, y))
                        continue;

                    const sx0 = this._isFluid(x - 1, y) ? 1 : 0;
                    const sx1 = this._isFluid(x + 1, y) ? 1 : 0;
                    const sy0 = this._isFluid(x, y - 1) ? 1 : 0;
                    const sy1 = this._isFluid(x, y + 1) ? 1 : 0;
                    const sum = sx0 + sx1 + sy0 + sy1;

                    if (sum === 0)
                        continue;

                    const i = this._index(x, y);
                    const div =
                        this._u[this._index(x + 1, y)] - this._u[i] +
                        this._v[this._index(x, y + 1)] - this._v[i];

                    let correction = -div / sum;
                    correction *= OVER_RELAXATION;
                    pressureField.setValueAt(x, y, pressureField.valueAt(x, y) + cp * correction);

                    this._u[i] -= sx0 * correction;
                    this._u[this._index(x + 1, y)] += sx1 * correction;
                    this._v[i] -= sy0 * correction;
                    this._v[this._index(x, y + 1)] += sy1 * correction;
                }
    }

    _extrapolate() {
        for (let x = 0; x < NX; x++) {
            this._v[this._index(x, 0)] = this._v[this._index(x, 1)];
            this._v[this._index(x, NY - 1)] = this._v[this._index(x, NY - 2)];
        }

        for (let y = 0; y < NY; y++) {
            this._u[this._index(0, y)] = this._u[this._index(1, y)];
            this._u[this._index(NX - 1, y)] = this._u[this._index(NX - 2, y)];
        }
    }

    _advectVelocity() {
        this._newU.set(this._u);
        this._newV.set(this._v);

        for (let x = 1; x < NX; x++)
            for (let y = 1; y < NY; y++) {
                const i = this._index(x, y);

                if (this._isFluid(x, y) && this._isFluid(x - 1, y)) {
                    const px = x * CELL_SIZE;
                    const py = (y + 0.5) * CELL_SIZE;
                    const u = this._u[i];
                    const v = this._averageVelocityV(x, y);
                    this._newU[i] = this._sampleVelocity(px - DT * u, py - DT * v, true);
                }

                if (this._isFluid(x, y) && this._isFluid(x, y - 1)) {
                    const px = (x + 0.5) * CELL_SIZE;
                    const py = y * CELL_SIZE;
                    const u = this._averageVelocityU(x, y);
                    const v = this._v[i];
                    this._newV[i] = this._sampleVelocity(px - DT * u, py - DT * v, false);
                }
            }

        this._u.set(this._newU);
        this._v.set(this._newV);
    }

    _advectSmoke() {
        const next = new Float64Array(this._smoke);

        for (let x = 1; x < NX - 1; x++)
            for (let y = 1; y < NY - 1; y++) {
                if (this._isSolid(x, y))
                    continue;

                const i = this._index(x, y);
                const u = (this._u[i] + this._u[this._index(x + 1, y)]) * 0.5;
                const v = (this._v[i] + this._v[this._index(x, y + 1)]) * 0.5;

                const px = (x + 0.5) * CELL_SIZE - DT * u;
                const py = (y + 0.5) * CELL_SIZE - DT * v;

                next[i] = this._sampleSmoke(px, py);
            }

        this._smoke.set(next);
    }

    _applyInflow() {
        for (let y = 1; y < NY - 1; y++) {
            const i = this._index(1, y);
            this._u[i] = 2;
            this._u[this._index(0, y)] = 2;
        }
    }

    _applyOutlet() {
        for (let y = 1; y < NY - 1; y++) {
            const outlet = this._index(NX - 1, y);
            const interior = this._index(NX - 2, y);
            this._u[outlet] = this._u[interior];
            this._v[outlet] = this._v[interior];
            this._smoke[outlet] = this._smoke[interior];
        }
    }

    _updateSmokeField() {
        for (let x = 0; x < NX; x++)
            for (let y = 0; y < NY; y++)
                this._smokeField?.setValueAt(x, y, this._smoke[this._index(x, y)]);
    }

    setSmokeField(smokeField) {
        this._smokeField = smokeField;
        return this;
    }

    _averageVelocityU(x, y) {
        return (
            this._u[this._index(x, y - 1)] +
            this._u[this._index(x, y)] +
            this._u[this._index(x + 1, y - 1)] +
            this._u[this._index(x + 1, y)]
        ) * 0.25;
    }

    _averageVelocityV(x, y) {
        return (
            this._v[this._index(x - 1, y)] +
            this._v[this._index(x, y)] +
            this._v[this._index(x - 1, y + 1)] +
            this._v[this._index(x, y + 1)]
        ) * 0.25;
    }

    _sampleVelocity(x, y, horizontal) {
        const maxX = (NX - 1) * CELL_SIZE;
        const maxY = (NY - 1) * CELL_SIZE;
        x = Math.max(CELL_SIZE, Math.min(x, maxX));
        y = Math.max(CELL_SIZE, Math.min(y, maxY));

        const fx = x / CELL_SIZE;
        const fy = y / CELL_SIZE;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(x0 + 1, NX - 1);
        const y1 = Math.min(y0 + 1, NY - 1);
        const tx = fx - x0;
        const ty = fy - y0;

        const value = (ix, iy) => horizontal
            ? this._u[this._index(ix, iy)]
            : this._v[this._index(ix, iy)];

        return (1 - tx) * (1 - ty) * value(x0, y0) +
            tx * (1 - ty) * value(x1, y0) +
            tx * ty * value(x1, y1) +
            (1 - tx) * ty * value(x0, y1);
    }

    _sampleSmoke(x, y) {
        const fx = Math.max(0, Math.min(NX - 1, x / CELL_SIZE - 0.5));
        const fy = Math.max(0, Math.min(NY - 1, y / CELL_SIZE - 0.5));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(x0 + 1, NX - 1);
        const y1 = Math.min(y0 + 1, NY - 1);
        const tx = fx - x0;
        const ty = fy - y0;

        return (1 - tx) * (1 - ty) * this._smoke[this._index(x0, y0)] +
            tx * (1 - ty) * this._smoke[this._index(x1, y0)] +
            tx * ty * this._smoke[this._index(x1, y1)] +
            (1 - tx) * ty * this._smoke[this._index(x0, y1)];
    }

    _isSolid(x, y) {
        return this._obstacleField.valueAt(x, y) !== 0;
    }

    _isFluid(x, y) {
        return !this._isSolid(x, y);
    }

    _index(x, y) {
        return x * NY + y;
    }
}

const pressureField = new DiscreteScalarField({ nx: NX, ny: NY });
const smokeField = new DiscreteScalarField({ nx: NX, ny: NY });
const obstacleField = new DiscreteScalarField({ nx: NX, ny: NY });

const solver = new FluidSolver({ obstacleField })
    .setSmokeField(smokeField);

const pressureView = new DiscreteFieldSurfaceView({
    scale: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Inferno),
    normalizer: new FixedIntervalNormalizer(new Interval(-100, 100))
});

const smokeView = new DiscreteFieldSurfaceView({
    scale: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Uniform, {
        color: Colour.Black.asHexValue()
    }),
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => value
});

const obstacleView = new DiscreteFieldSurfaceView({
    scale: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Uniform, {
        color: Colour.Black.asHexValue()
    }),
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => value
});

solver.reset(pressureField);

Simulation
    .with({
        htmlDivId: 'fluid2dContainer',
        viewport: { aspectRatio: '11/10', parameterMenuCollapsed: true },
        camera: {
            position: new Vec3(0, 0, 1),
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌊 Fluid dynamics</strong><br/>' +
                'Incompressible fluid flowing through a wind tunnel around a circular obstacle.'
        }
    })
    .maxOutCpu(() => pressureField.evolve(solver), 20, 30)
    .bind(pressureField.alwaysWith(pressureView))
    .bind(obstacleField.onceWith(obstacleView))
    .start();
