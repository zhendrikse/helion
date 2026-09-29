import { Solver } from '../../math/numerics/solvers/solvers.js';
import { Hamiltonian } from './hamiltonian.js';
import { WaveFunction2D } from './wavefunction.js';
import { VecN } from '../../math/math.js';

export class RelaxationEigenstateSolver extends Solver {
    constructor({
        hamiltonian,
        states = 4,
        iterations = 10000,
        stepSize = 1e-4,
        tolerance = 1e-10,
        calculateResiduals = false
    } = {}) {
        super();
        if (!hamiltonian)
            throw new TypeError('RelaxationEigenstateSolver requires a Hamiltonian.');
        if (!Number.isInteger(states) || states < 1)
            throw new RangeError('RelaxationEigenstateSolver states must be a positive integer.');
        if (!Number.isInteger(iterations) || iterations < 1)
            throw new RangeError('RelaxationEigenstateSolver iterations must be a positive integer.');
        if (!(stepSize > 0))
            throw new RangeError('RelaxationEigenstateSolver stepSize must be greater than zero.');
        if (!(tolerance > 0))
            throw new RangeError('RelaxationEigenstateSolver tolerance must be greater than zero.');

        this._hamiltonian = hamiltonian;
        this._states = states;
        this._iterations = iterations;
        this._stepSize = stepSize;
        this._tolerance = tolerance;
        this._calculateResiduals = calculateResiduals;
    }

    /** @param {WaveFunction2D} waveFunction2D @param {(text:string, percent:number)=>void} [progressCallback] */
    async solveAsync(waveFunction2D, progressCallback) {
        const size = this._hamiltonian.N * this._hamiltonian.N;
        const count = Math.min(this._states, size);
        const residuals = new Array(count);
        /** @type {Float64Array<ArrayBuffer>[]} */
        const states = [];

        for (let state = 0; state < count; state++) {
            const psi = this._initialVector(size, state);
            await this._relax(psi, states, progressCallback, state, count);
            const energy = this._hamiltonian.energyOf(psi);

            this._removeComponents(psi, states);
            VecN.normalize(psi);
            states.push(psi);

            if (this._calculateResiduals)
                residuals[state] = this._residual(psi, energy);

            waveFunction2D.addEigenstate(psi, new Float64Array(size), energy);
            progressCallback?.(`Relaxing eigenstate ${state + 1}/${count}`, 100 * (state + 1) / count);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        return residuals;
    }

    async _relax(psi, previousStates, progressCallback, state, stateCount) {
        const hPsi = new Float64Array(psi.length);
        const gradient = new Float64Array(psi.length);
        const work = new Float64Array(psi.length);
        let energy = this._hamiltonian.energyOf(psi);

        for (let iteration = 0; iteration < this._iterations; iteration++) {
            this._hamiltonian.apply(psi, hPsi);
            for (let i = 0; i < psi.length; i++)
                gradient[i] = hPsi[i] - energy * psi[i];

            this._removeComponents(gradient, previousStates);
            const gradientNorm = VecN.norm(gradient);
            if (gradientNorm < this._tolerance)
                return iteration + 1;

            for (let i = 0; i < psi.length; i++)
                work[i] = psi[i] - this._stepSize * gradient[i];

            this._removeComponents(work, previousStates);
            VecN.normalize(work);
            psi.set(work);
            energy = this._hamiltonian.energyOf(psi);

            if (iteration % 50 === 0) {
                const completed = (state * this._iterations + iteration + 1) /
                    (stateCount * this._iterations);
                progressCallback?.('Relaxing Hamiltonian', 100 * completed);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        return this._iterations;
    }

    _removeComponents(vector, states) {
        for (const state of states) {
            const projection = VecN.dot(vector, state);
            for (let i = 0; i < vector.length; i++)
                vector[i] -= projection * state[i];
        }
    }

    _initialVector(size, state) {
        const psi = new Float64Array(size);
        let seed = (0x12345678 + state * 0x9e3779b9) >>> 0;
        for (let i = 0; i < size; i++) {
            seed = (1664525 * seed + 1013904223) >>> 0;
            psi[i] = seed / 0x100000000 - 0.5;
        }

        const n = this._hamiltonian.N;
        for (let x = 0; x < n; x++) {
            psi[x] = 0;
            psi[(n - 1) * n + x] = 0;
            psi[x * n] = 0;
            psi[x * n + n - 1] = 0;
        }
        VecN.normalize(psi);
        return psi;
    }

    _residual(psi, energy) {
        const hPsi = this._hamiltonian.apply(psi);
        let squared = 0;
        for (let i = 0; i < psi.length; i++) {
            const residual = hPsi[i] - energy * psi[i];
            squared += residual * residual;
        }
        return Math.sqrt(squared);
    }
}
