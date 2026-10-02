import {
    ComplexFunctionSample, Cylinder, DiscreteComplexField, WaveFunction, 
    Renderable3D, Simulation, Vec3, VecN
} from '../../../src/index.js';

const PI = Math.PI;

class DiscreteComplexFieldCylinderView extends Renderable3D {
    constructor({
        spacing = 10,
        cylinderScale = 20
    } = {}) {
        super();
        this._spacing = spacing;
        this._cylinderScale = cylinderScale;
        /** @type {Cylinder[]} */
        this._cylinders = [];
        this._sample = new ComplexFunctionSample();
    }

    /** @param {DiscreteComplexField} model */
    canBindTo(model) {
        if (!model.valueAt)
            throw new Error('Arrow can only bind to models with a complex value.');
        return true;
    }

    /** @param {DiscreteComplexField} psi */
    synchronizeWith(psi) {
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++)
                this._updateCylinder(psi, i, j);
    }

    /**
     * @param {DiscreteComplexField} psi 
     * @param {number} i 
     * @param {number} j 
     */
    _updateCylinder(psi, i, j) {
        psi.valueAt(i, j, this._sample);
        const output = this._sample.output;
        output.multiplyScalar(this._cylinderScale);
        const height = output.re;
        const mag = output.abs;
        const radius = Math.max(0.05 * mag, Math.abs(output.im) / 6);
        const hue = output.phase;

        const cylinder = this._cylinders[psi.index(i, j)];
        const x = this._spacing * i / (psi.nx - 1);
        const y = this._spacing * j / (psi.ny - 1)
        cylinder._mesh.position.set(x - this._spacing / 2, height/2, y - this._spacing / 2);
        cylinder._mesh.scale.set(radius, Math.abs(height), radius);
        cylinder._mesh.material.color.setHSL(hue, 1, 0.5);
    }

    /** @param {DiscreteComplexField} psi */
    initialize(psi) {
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++) {
                this._cylinders[psi.index(i, j)] = new Cylinder();
                this.add(this._cylinders[psi.index(i, j)]);
            }
    }
}

const nx = 20,
    ny = 20,
    width = 10,
    height = 10,
    maxMode = 5,
    initialState = (x, y) => (x < width/2 && y < height/2) ? 1 : 0;

/**
 * Analytic time evolution for a particle in a two-dimensional infinite square well.
 *
 * The well is represented by the stationary basis
 *
 *   psi(n,m) = sin(n*pi*x/Lx) sin(m*pi*y/Ly)
 *
 * and the wavefunction evolves by applying the corresponding phase factors.
 */
function initializePsi() {
    const psi = new WaveFunction({ nx, ny });
    const index = (x, y) => y * nx + x;

    // Generate eigenstates
    for (let mx = 1; mx <= maxMode; mx++) {
        for (let my = 1; my <= maxMode; my++) {
            const real = new Float64Array(nx * ny);
            const imag = new Float64Array(nx * ny);

            for (let j = 0; j < ny; j++) {
                const y = height * j / (ny - 1);
                for (let i = 0; i < nx; i++) {
                    const x = width * i / (nx - 1);
                    real[index(i, j)] = Math.sin(mx * PI * x / width) * Math.sin(my * PI * y / height);
                }
            }

            VecN.normalize(real);
            const energy = (PI * PI / 2) * (mx * mx / (width * width) + my * my / (height * height));
            psi.addEigenstate(real, imag, energy);
        }
    }

    // Project initial state onto eigenstates
    const initial = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
        const y = height * j / (ny - 1);
        for (let i = 0; i < nx; i++) {
            const x = width * i / (nx - 1);
            initial[index(i, j)] = initialState(x, y);
        }
    }
    VecN.normalize(initial);

    const components = [];
    for (let state = 0; state < psi._eigenstates.length; state++) {
        const eigenstate = psi._eigenstates[state];
        let coeff = 0;
        for (let i = 0; i < nx * ny; i++)
            coeff += initial[i] * eigenstate.real[i];
        if (Math.abs(coeff) > 1e-12) 
            components.push({ eigenstate: state, coefficient: WaveFunction.realCoefficient(coeff) });
    }

    psi.setSuperposition(components);
    return psi;
}


const waveFunctionView = new DiscreteComplexFieldCylinderView({ spacing: 10 });
const waveFunctionPsi = initializePsi({
    nx: 20, ny: 20, width: 10, height: 10, maxMode: 5
});

Simulation.with({
        htmlDivId: 'infiniteSquareWell2D',
        camera: { position: new Vec3(12, 4, 2).multiplyScalar(0.8) },
        viewport: { aspectRatio: '19/12' },
        infoPanel: {
            text: '<strong>Particle in a 2D box 📦</strong><br/>' +
                '- Cylinders $\\propto \\|\\Psi\\|$<br/>' +
                '- Height $\\propto Re(\\Psi)$<br/>' +
                '- Radius $\\propto Im(\\Psi)$<br/>' +
                '- Color represents the value of the phase factor<br/>' +
                '- System evolves by summing the Fourier coefficients times the eigenstates.'
        }
    })
    .bind(waveFunctionPsi.alwaysWith(waveFunctionView))
    .withMouseClickEventListener()
    .runsEvery(5e-3)
    .advancesBy(0.02)
    .onStep((clock, _) => waveFunctionPsi.time = clock.simulatedTime);