import {
    Complex,
    ComplexFunctionSample, Cylinder, DiscreteComplexField, Renderable3D, Simulation, Vec3, WaveFunctionEigenStateSolver
} from "../../../src/index.js";

class DiscreteComplexFieldCylinderView extends Renderable3D {
    constructor({
        spacing = 10,
        cylinderScale = 20
    } = {}) {
        super();
        this._spacing = spacing;
        this._cylinderScale = cylinderScale;
        this._cylinders = [];
        this._sample = new ComplexFunctionSample();
    }

    canBindTo(model) {
        if (!model.valueAt)
            throw new Error("Arrow can only bind to models with a complex value.");
        return true;
    }

    synchronizeWith(psi) {
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++)
                this._updateCylinder(psi, i, j);
    }

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

    initialize(psi) {
        for (let i = 0; i < psi.nx; i++)
            for (let j = 0; j < psi.ny; j++) {
                this._cylinders[psi.index(i, j)] = new Cylinder();
                this.add(this._cylinders[psi.index(i, j)]);
            }
    }
}

const waveFunctionView = new DiscreteComplexFieldCylinderView({ spacing: 10 });
const waveFunctionPsi = new DiscreteComplexField({ nx: 20, ny: 20 });
const solver = new WaveFunctionEigenStateSolver();
waveFunctionPsi.evolve(solver, 0.01);

Simulation.with({
        htmlDivId: "infiniteSquareWell2D",
        camera: {
            position: new Vec3(12, 4, 2).multiplyScalar(0.8)
        },
        viewport: {
            aspectRatio: "19/12"
        },
        infoPanel: {
            text: "<strong>Particle in a 2D box 📦</strong><br/>" +
                "- Cylinders $\\propto \\|\\Psi\\|$<br/>" +
                "- Height $\\propto Re(\\Psi)$<br/>" +
                "- Radius $\\propto Im(\\Psi)$<br/>" +
                "- Color represents the value of the phase factor<br/>" +
                "- System evolves by summing the Fourier coefficients times the eigenstates."
        }
    })
    .bind(waveFunctionPsi.alwaysWith(waveFunctionView))
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_, dt) => waveFunctionPsi.evolve(solver, dt));
