import { MathPhysicsModelBehavior } from '../../core/helion.js';
import { DiscreteScalarField } from '../math/fields.js';

const DX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const DY = [0, 0, 1, 0, -1, 1, 1, -1, -1];

/**
 * Small educational D2Q9 lattice-Boltzmann fluid.
 *
 * The model deliberately keeps the first implementation simple:
 * - maintained left-to-right inflow,
 * - bounce-back top/bottom walls and an internal barrier,
 * - open right-hand outlet,
 * - BGK collision,
 * - an exposed scalar field containing the 2D vorticity (curl).
 *
 * It is intended for qualitative visualization rather than quantitative CFD.
 */
export class LatticeBoltzmannFluid2D extends MathPhysicsModelBehavior {
    constructor({
        nx = 120,
        ny = 60,
        viscosity = 0.02,
        flowSpeed = 0.10,
        barrierX = Math.floor(nx * 0.5),
        barrierHalfHeight = Math.floor(ny * 0.14)
    } = {}) {
        super();

        this._nx = nx;
        this._ny = ny;
        this._viscosity = viscosity;
        this._flowSpeed = flowSpeed;

        this._barrier = new Uint8Array(nx * ny);
        for (let y = Math.max(1, Math.floor(ny * 0.5) - barrierHalfHeight);
             y <= Math.min(ny - 2, Math.floor(ny * 0.5) + barrierHalfHeight);
             y++)
            this._barrier[this.index(barrierX, y)] = 1;

        this._f = Array.from({ length: 9 }, () => new Float64Array(nx * ny));
        this._next = Array.from({ length: 9 }, () => new Float64Array(nx * ny));

        this._curl = new DiscreteScalarField({ nx, ny });
        this._barrierField = new DiscreteScalarField({ nx, ny });
        this._eq = new Float64Array(9);

        this._updateBarrierField();
        this.reset();
    }

    get nx() { return this._nx; }
    get ny() { return this._ny; }
    get curlField() { return this._curl; }
    get barrierField() { return this._barrierField; }

    /**
     * @param {number} x
     * @param {number} y
     */
    isBarrier(x, y) {
        return this._barrier[this.index(x, y)] !== 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    index(x, y) {
        return y * this._nx + x;
    }

    reset() {
        for (let y = 0; y < this._ny; y++)
            for (let x = 0; x < this._nx; x++) {
                const i = this.index(x, y);
                this._equilibrium(1, this._flowSpeed, 0, this._eq);

                for (let k = 0; k < 9; k++)
                    this._f[k][i] = this._eq[k];
            }

        this._curl.reset();
        this._updateBarrierField();
        this._updateCurl();
        return this;
    }

    evolve() {
        this.step();
        return this;
    }

    step() {
        this._stream();
        this._collide();
        this._applyInflow();
        this._applyOutlet();
        this._updateCurl();
        return this;
    }

    _stream() {
        const nx = this._nx;
        const ny = this._ny;

        for (let k = 0; k < 9; k++)
            this._next[k].fill(0);

        for (let y = 0; y < ny; y++)
            for (let x = 0; x < nx; x++) {
                const sourceIndex = this.index(x, y);

                for (let k = 0; k < 9; k++) {
                    const tx = x + DX[k];
                    const ty = y + DY[k];

                    if (ty < 0 || ty >= ny || this.isBarrier(tx, ty)) {
                        this._next[OPPOSITE[k]][sourceIndex] += this._f[k][sourceIndex];
                        continue;
                    }

                    // Populations leaving through the left/right boundary are
                    // handled by the inflow/outlet boundary conditions.
                    if (tx < 0 || tx >= nx)
                        continue;

                    this._next[k][this.index(tx, ty)] += this._f[k][sourceIndex];
                }
            }

        [this._f, this._next] = [this._next, this._f];
    }

    _collide() {
        const omega = 1 / (0.5 + 3 * this._viscosity);

        for (let y = 1; y < this._ny - 1; y++)
            for (let x = 0; x < this._nx; x++) {
                if (this.isBarrier(x, y)) 
                    continue;
                const i = this.index(x, y);

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
                // Ma cap voorkomt negatieve populaties / blow-up
                ux = Math.max(-0.3, Math.min(0.3, ux));
                uy = Math.max(-0.3, Math.min(0.3, uy));

                this._equilibrium(rho, ux, uy, this._eq);

                for (let k = 0; k < 9; k++)
                    this._f[k][i] += omega * (this._eq[k] - this._f[k][i]);
            }
    }

    _applyInflow() {
        for (let y = 1; y < this._ny - 1; y++) {
            const i = this.index(0, y);
            this._equilibrium(1, this._flowSpeed, 0, this._eq);

            for (let k = 0; k < 9; k++)
                this._f[k][i] = this._eq[k];
        }
    }

    _applyOutlet() {
        for (let y = 1; y < this._ny - 1; y++) {
            const outlet = this.index(this._nx - 1, y);
            const interior = this.index(this._nx - 2, y);

            for (let k = 0; k < 9; k++)
                this._f[k][outlet] = this._f[k][interior];
        }
    }

    _updateBarrierField() {
        for (let y = 0; y < this._ny; y++)
            for (let x = 0; x < this._nx; x++)
                this._barrierField.setValueAt(x, y, this._barrier[this.index(x, y)]);
    }

    /**
     * @param {number} rho
     * @param {number} ux
     * @param {number} uy
     * @param {number[] | Float64Array<ArrayBuffer>} target
     */
    _equilibrium(rho, ux, uy, target) {
        const speedSquared = ux * ux + uy * uy;

        for (let k = 0; k < 9; k++) {
            const eu = EX[k] * ux + EY[k] * uy;
            target[k] = WEIGHT[k] * rho * (
                1 + 3 * eu + 4.5 * eu * eu - 1.5 * speedSquared
            );
        }
    }

    _updateCurl() {
        for (let y = 1; y < this._ny - 1; y++)
            for (let x = 1; x < this._nx - 1; x++) {
                if (this.isBarrier(x, y)) {
                    this._curl.setValueAt(x, y, 0);
                    continue;
                }
                const uxLeft = this._velocityX(x - 1, y);
                const uxRight = this._velocityX(x + 1, y);
                const uyDown = this._velocityY(x, y - 1);
                const uyUp = this._velocityY(x, y + 1);

                let curl = 0.5 * ((uyUp - uyDown) - (uxRight - uxLeft));
                if (!isFinite(curl)) curl = 0;
                this._curl.setValueAt(x, y, curl);
            }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    _velocityX(x, y) {
        const i = this.index(x, y);
        let rho = 0;
        let momentum = 0;

        for (let k = 0; k < 9; k++) {
            const value = this._f[k][i];
            rho += value;
            momentum += value * EX[k];
        }

        if (rho < 1e-8 || !isFinite(rho)) return 0;
        const v = momentum / rho;
        return isFinite(v) ? v : 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    _velocityY(x, y) {
        const i = this.index(x, y);
        let rho = 0;
        let momentum = 0;

        for (let k = 0; k < 9; k++) {
            const value = this._f[k][i];
            rho += value;
            momentum += value * EY[k];
        }

        if (rho < 1e-8 || !isFinite(rho)) return 0;
        const v = momentum / rho;
        return isFinite(v) ? v : 0;
    }
}

const EX = DX;
const EY = DY;
const OPPOSITE = [0, 3, 4, 1, 2, 7, 8, 5, 6];
const WEIGHT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
