import {
    AdaptiveSymmetricNormalizer, ColorMappers, Colour, DropdownMenu, FixedIntervalNormalizer,
    Interval, ShapeConfiguration, ShapeMask, Simulation, TiledPlane, Vec3, DiscreteScalarField
} from '../../../src/index.js';
import { Solver } from '../../../src/model/math/numerics/solvers/solvers.js';

const NX = 160;
const NY = 80;
const CELL_SIZE = 0.08;

const DX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const DY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const EX = DX;
const EY = DY;
const OPPOSITE = [0, 3, 4, 1, 2, 7, 8, 5, 6];
const WEIGHT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];

class LatticeBoltzmannSolver extends Solver {
    constructor({ barrierField = new DiscreteScalarField(), viscosity = 0.02, flowSpeed = 0.10 } = {}) {
        super();
        this._barrierField = barrierField;
        this._viscosity = viscosity;
        this._flowSpeed = flowSpeed;
        this._f = Array.from({ length: 9 }, () => new Float64Array(0));
        this._next = Array.from({ length: 9 }, () => new Float64Array(0));
        this._eq = new Float64Array(9);
    }

    reset(field) {
        this._f = Array.from({ length: 9 }, () => new Float64Array(field.nx * field.ny));
        this._next = Array.from({ length: 9 }, () => new Float64Array(field.nx * field.ny));
        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const i = field.index(x, y);
                this._equilibrium(1, this._flowSpeed, 0, this._eq);
                for (let k = 0; k < 9; k++)
                    this._f[k][i] = this._eq[k];
            }

        field.reset();
        this._updateCurl(field);
        return this;
    }

    step(field) {
        this._stream(field);
        this._collide(field);
        this._applyInflow(field);
        this._applyOutlet(field);
        this._updateCurl(field);
        return this;
    }

    _stream(field) {
        const nx = field.nx;
        const ny = field.ny;

        for (let k = 0; k < 9; k++)
            this._next[k].fill(0);

        for (let y = 0; y < ny; y++)
            for (let x = 0; x < nx; x++) {
                const sourceIndex = field.index(x, y);

                for (let k = 0; k < 9; k++) {
                    const tx = x + DX[k];
                    const ty = y + DY[k];

                    if (ty < 0 || ty >= ny || this._barrierField.valueAt(tx, ty) !== 0) {
                        this._next[OPPOSITE[k]][sourceIndex] += this._f[k][sourceIndex];
                        continue;
                    }

                    if (tx < 0 || tx >= nx)
                        continue;

                    this._next[k][field.index(tx, ty)] += this._f[k][sourceIndex];
                }
            }

        [this._f, this._next] = [this._next, this._f];
    }

    _collide(field) {
        const omega = 1 / (0.5 + 3 * this._viscosity);

        for (let y = 1; y < field.ny - 1; y++)
            for (let x = 0; x < field.nx; x++) {
                if (this._barrierField.valueAt(x, y) !== 0)
                    continue;

                const i = field.index(x, y);
                let rho = 0;
                let ux = 0;
                let uy = 0;

                for (let k = 0; k < 9; k++) {
                    const value = this._f[k][i];
                    rho += value;
                    ux += value * EX[k];
                    uy += value * EY[k];
                }

                if (rho < 1e-8) continue;

                ux /= rho;
                uy /= rho;
                ux = Math.max(-0.3, Math.min(0.3, ux));
                uy = Math.max(-0.3, Math.min(0.3, uy));

                this._equilibrium(rho, ux, uy, this._eq);

                for (let k = 0; k < 9; k++)
                    this._f[k][i] += omega * (this._eq[k] - this._f[k][i]);
            }
    }

    _applyInflow(field) {
        for (let y = 1; y < field.ny - 1; y++) {
            const i = field.index(0, y);
            this._equilibrium(1, this._flowSpeed, 0, this._eq);

            for (let k = 0; k < 9; k++)
                this._f[k][i] = this._eq[k];
        }
    }

    _applyOutlet(field) {
        for (let y = 1; y < field.ny - 1; y++) {
            const outlet = field.index(field.nx - 1, y);
            const interior = field.index(field.nx - 2, y);

            for (let k = 0; k < 9; k++)
                this._f[k][outlet] = this._f[k][interior];
        }
    }

    _equilibrium(rho, ux, uy, target) {
        const speedSquared = ux * ux + uy * uy;

        for (let k = 0; k < 9; k++) {
            const eu = EX[k] * ux + EY[k] * uy;
            target[k] = WEIGHT[k] * rho * (
                1 + 3 * eu + 4.5 * eu * eu - 1.5 * speedSquared
            );
        }
    }

    _updateCurl(field) {
        for (let y = 1; y < field.ny - 1; y++)
            for (let x = 1; x < field.nx - 1; x++) {
                if (this._barrierField.valueAt(x, y) !== 0) {
                    field.setValueAt(x, y, 0);
                    continue;
                }

                const uxLeft = this._velocityX(field.index(x - 1, y));
                const uxRight = this._velocityX(field.index(x + 1, y));
                const uyDown = this._velocityY(field.index(x, y - 1));
                const uyUp = this._velocityY(field.index(x, y + 1));

                let curl = 0.5 * ((uyUp - uyDown) - (uxRight - uxLeft));
                if (!isFinite(curl)) curl = 0;
                field.setValueAt(x, y, curl);
            }
    }

    _velocityX(index) {
        let rho = 0;
        let momentum = 0;

        for (let k = 0; k < 9; k++) {
            const value = this._f[k][index];
            rho += value;
            momentum += value * EX[k];
        }

        if (rho < 1e-8 || !isFinite(rho)) return 0;
        const v = momentum / rho;
        return isFinite(v) ? v : 0;
    }

    _velocityY(index) {
        let rho = 0;
        let momentum = 0;

        for (let k = 0; k < 9; k++) {
            const value = this._f[k][index];
            rho += value;
            momentum += value * EY[k];
        }

        if (rho < 1e-8 || !isFinite(rho)) return 0;
        const v = momentum / rho;
        return isFinite(v) ? v : 0;
    }
}

const curlField = new DiscreteScalarField({ nx: NX, ny: NY });
const barrierField = new DiscreteScalarField({ nx: NX, ny: NY });

const configuration = new ShapeConfiguration({
    defaultPosition: { x: -45, y: 0 }
});
const solver = new LatticeBoltzmannSolver({
    barrierField,
    viscosity: 0.02,
    flowSpeed: 0.10,
});

function reset() {
    barrierField
        .reset()
        .apply(new ShapeMask(configuration));

    solver.reset(curlField);
}

configuration.onChangeEventListener = reset;
reset();

const curlView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Inferno),
    normalizer: new AdaptiveSymmetricNormalizer(0.06),
});

const barrierView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: Colour.Black.asHexValue() }),
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => value
});

barrierView.position.z = 0.01;

Simulation.with({
    htmlDivId: 'latticeBoltzmann2dContainer',
    viewport: { aspectRatio: '19/12' },
    camera: {
        position: new Vec3(0, 0, 9),
        orthographic: true,
        controls: false
    },
    headUpDisplay: true,
    lighting: { enabled: false },
    infoPanel: {
        text:
            '<strong>🫗 Lattice Boltzmann</strong><br/>' +
            'A simple D2Q9 fluid flowing around a configurable obstacle. ' +
            'The background shows vorticity (curl).'
    }
})
    .maxOutCpu(() => curlField.evolve(solver), 20, 30)
    .appendStartStopResetUI()
    .bind(curlField.alwaysWith(curlView))
    .bind(barrierField.onceWith(barrierView))
    .onReset(reset)
    .append(configuration.ui())
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Inferno)
        // @ts-ignore
        .onChange(event => curlView._colorMapper = ColorMappers.get(event.target.value)));
