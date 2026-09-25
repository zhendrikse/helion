import { DiscreteComplexField, DiscreteScalarField, DiscreteScalarField3D} from '../../math/fields.js';
import { SchrodingerSolver } from './schrodinger.js';
import { LanczosEigenstateSolver } from './lanczos.js';
import { WaveFunction2D } from './wavefunction.js';

/**
 * Single non-relativistic particle used by quantum potential functions.
 *
 * The Hamiltonian updates x/y while sampling a potential. Keeping this tiny
 * object separate makes the potential API read naturally:
 *
 *   particle => 0.5 * k * particle.x ** 2
 */
export class SingleParticle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
}

/**
 * Hamiltonian for a single non-relativistic particle on a Cartesian grid.
 *
 * H = -(hbar² / 2m) ∇² + V
 *
 * The public API deliberately resembles the conceptual API of qmsolve:
 *
 *   const H = new Hamiltonian({
 *       particle: SingleParticle,
 *       potential: particle => ...,
 *       spatialNdim: 2,
 *       N: 100,
 *       extent: 15
 *   });
 *
 *   const eigenstates = H.solve({ maxStates: 30 });
 *
 * A potential function is sampled once onto the Hamiltonian grid. A
 * DiscreteScalarField can also be supplied when a caller already has a
 * sampled potential.
 */
export class Hamiltonian {
    /**
     * @typedef {Object} SimulationOptions
     * @property {SingleParticle} [particle] - The particle for which the simulation is executed.
     * @property {(text:string, percent: number) => void} [progressCallback]
     * @property {(particle: SingleParticle)=> number} [potential] - The potential field.
     * @property {number} [spatialNdim] - Number of spatial dimensions.
     * @property {number} [N] - The number of lattice points per dimensiion.
     * @property {number} [extent] - The physical size of the lattice.
     * @property {number | null} [spacing] - Lattice spacing.
     * @property {number} [hbar] - Reduced Planck constant.
     * @property {number} [mass] - Particle mass.
     * @property {number} [potentialScale] - Scale factor for the potential.
     */
    constructor({
        particle = SingleParticle,
        potential = /** @type (_particle: SingleParticle) => number */ _particle => 0,
        progressCallback = (/** @type {string} */ _text, /** @type {number} */ _percent) => {},
        spatialNdim = 2,
        N = 100,
        extent = 0.15 * (N - 1),
        spacing = null,
        hbar = 1,
        mass = 1,
        potentialScale = 1
    } = {}) {
        if (spatialNdim !== 2)
            throw new RangeError('Hamiltonian currently supports spatialNdim=2. 3D remains a separate implementation.');

        if (!Number.isInteger(N) || N < 3)
            throw new RangeError('Hamiltonian N must be an integer greater than or equal to 3.');

        if (extent <= 0)
            throw new RangeError('Hamiltonian extent must be greater than zero.');

        if (mass <= 0)
            throw new RangeError('Hamiltonian mass must be greater than zero.');

        this._particleType = particle;
        this._progressCallback = progressCallback;
        this._N = N;
        this._extent = extent;
        this._spacing = spacing ?? extent / (N - 1);
        this._hbar = hbar;
        this._mass = mass;
        this._potentialScale = potentialScale;
        this._potentialFunction = typeof potential === 'function' ? potential : null;

        if (this._spacing <= 0)
            throw new RangeError('Hamiltonian spacing must be greater than zero.');

        if ((potential instanceof DiscreteScalarField) || (potential instanceof DiscreteScalarField3D)) {
            if (potential.nx !== N || potential.ny !== N)
                throw new Error('Hamiltonian potential and N must describe the same grid dimensions.');
            this._potential = potential;
        } else if (this._potentialFunction)
            this._potential = this._samplePotential(this._potentialFunction);
        else
            throw new TypeError('Hamiltonian potential must be a function or DiscreteScalarField.');

        this._evolutionSolver = null;
    }

    get potential() { return this._potential; }
    get particle() { return this._particleType; }
    get N() { return this._N; }
    get mass() { return this._mass; }

    /**
     * Apply this Hamiltonian to a real-valued grid function.
     *
     * @param {Float64Array<ArrayBuffer>} psi
     * @param {Float64Array<ArrayBuffer> | null} out
     * @returns {Float64Array<ArrayBuffer>}
     */
    apply(psi, out = null) {
        if (psi.length !== this._potential.data.length)
            throw new Error(
                `Hamiltonian and wavefunction sizes must match (${this._potential.data.length} samples expected).`
            );

        const hPsi = out ?? new Float64Array(psi.length);
        if (out) 
            hPsi.fill(0);
        
        const nx = this._potential.nx;
        const ny = this._potential.ny;
        const h2 = this._spacing * this._spacing;
        const kinetic = this._hbar * this._hbar / (2 * this._mass);

        for (let y = 1; y < ny - 1; y++)
            for (let x = 1; x < nx - 1; x++) {
                const i = y * nx + x;
                const laplacian =
                    (psi[i - 1] + psi[i + 1] + psi[i - nx] + psi[i + nx] - 4 * psi[i]) / h2;

                hPsi[i] = -kinetic * laplacian +
                    this._potentialScale * this._potential.data[i] * psi[i];
            }

        return hPsi;
    }

    /**
     * Rayleigh quotient <psi|H|psi>/<psi|psi>.
     *
     * @param {Float64Array<ArrayBuffer>} psi
     * @returns {number}
     */
    energyOf(psi) {
        const hPsi = this.apply(psi);
        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < psi.length; i++) {
            numerator += psi[i] * hPsi[i];
            denominator += psi[i] * psi[i];
        }

        if (denominator === 0)
            throw new Error('Cannot calculate Hamiltonian energy for a zero state.');

        return numerator / denominator;
    }

    /**
     * Solve for the lowest stationary states while yielding to the browser
     * between batches of iterations so progress can be rendered.
     *
     * @param {WaveFunction2D} waveFunction2D
     * @param {{
     *   maxStates?: number, 
     *   iterations?: number,
     *   calculateResiduals?: boolean, 
     * }} config
     *
     * @returns {Promise<number[]>} residuals
     */
    async solveAsync(waveFunction2D, {
        maxStates = 4,
        iterations = 100,
        calculateResiduals = false,
    } = {}) {
        const solver = new LanczosEigenstateSolver({
            hamiltonian: this,
            states: maxStates,
            iterations,
            calculateResiduals
        });

        return solver.solveAsync(waveFunction2D, this._progressCallback);
    }

    /**
     * Evolve a wavefunction according to this Hamiltonian.
     *
     * The solver is kept internally so the staggered time integration state
     * survives across simulation steps.
     *
     * @param {DiscreteComplexField} psi
     * @param {number} dt
     */
    evolve(psi, dt) {
        if (!this._evolutionSolver)
            this._evolutionSolver = new SchrodingerSolver({ hamiltonian: this });

        if (!this._evolutionSolver.initialized)
            this._evolutionSolver.initialize(psi, dt);
        else
            this._evolutionSolver.step(psi, dt);
        return psi;
    }

    resetEvolution() {
        this._evolutionSolver?.reset();
        return this;
    }

    /** @param {(particle:SingleParticle) => number} potentialFunction */
    _samplePotential(potentialFunction) {
        const field = new DiscreteScalarField({ nx: this._N, ny: this._N });
        const particle = new this._particleType();

        for (let y = 0; y < this._N; y++)
            for (let x = 0; x < this._N; x++) {
                particle.x = (x / (this._N - 1) - 0.5) * this._extent;
                particle.y = (y / (this._N - 1) - 0.5) * this._extent;
                field.setValueAt(x, y, potentialFunction(particle));
            }

        return field;
    }
}

