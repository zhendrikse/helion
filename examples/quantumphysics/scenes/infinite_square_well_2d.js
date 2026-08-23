import { Mesh, MeshPhongMaterial, CylinderGeometry} from "three";
import {
    Complex, DiscreteComplexField, Renderable3D, Simulation, Vec3, WaveFunctionEigenStateSolver
} from "../../../src/index.js";

class DiscreteComplexFieldCylinderView extends Renderable3D {
    constructor({
        size = 20,
        spacing = 10,
        cylinderScale = 20
    } = {}) {
        super();
        this._x = [];
        this._y = [];
        this._spacing = spacing;
        this._size = size;
        this._cylinderScale = cylinderScale;

        for (let i = 0; i < size; i++) {
            this._x[i] = [];
            this._y[i] = [];

            for (let j = 0; j < size; j++) {
                this._x[i][j] = spacing * i / (size - 1);
                this._y[i][j] = spacing * j / (size - 1);
            }
        }

        this._cylinders = this._createCylinders(size, spacing);
        this._complexNumber = new Complex();
    }

    canBindTo(model) {
        if (!model.valueAt)
            throw new Error("Arrow can only bind to models with a complex value.");
        return true;
    }

    synchronizeWith(psi) {
        for (let i = 0; i < this._size; i++)
            for (let j = 0; j < this._size; j++)
                this._updateCylinder(psi, i, j);
    }

    _updateCylinder(psi, i, j) {
        psi.valueAt(i, j, this._complexNumber);
        this._complexNumber.multiplyScalar(this._cylinderScale);
        const mesh = this._cylinders[i][j];
        const height = this._complexNumber.re;
        const mag = this._complexNumber.abs;
        const radius = Math.max(0.05 * mag, Math.abs(this._complexNumber.im) / 6);
        const phase = this._complexNumber.phase;

        mesh.scale.set(radius, Math.abs(height), radius);
        mesh.position.y = height / 2;
        mesh.material.color.setHSL(phase, 1, 0.5);
    }

    _createCylinders(size, spacing) {
        const cylinders = [];
        const geometry = new CylinderGeometry(1, 1, 1, 12);

        for (let i = 0; i < size; i++) {
            cylinders[i] = [];
            for (let j = 0; j < size; j++) {
                const mesh = this._createCylinder(i, j, spacing, geometry);
                this.add(mesh);
                cylinders[i][j] = mesh;
            }
        }

        return cylinders;
    }

    _createCylinder(i, j, spacing, geometry) {
        const material = new MeshPhongMaterial({ color: 0xff0000 });
        const mesh = new Mesh(geometry, material);
        mesh.position.set(this._x[i][j] - spacing / 2, 0, this._y[i][j] - spacing / 2,);
        return mesh;
    }
}

const waveFunctionView = new DiscreteComplexFieldCylinderView({ size: 20, spacing: 10 });
const waveFunctionPsi = new DiscreteComplexField({ nx: 20, ny: 20 });
const solver = new WaveFunctionEigenStateSolver();
waveFunctionPsi.evolve(solver, 0.01);

Simulation.with({
        htmlDivId: "infiniteSquareWell2D",
        camera: {
            position: new Vec3(12, 8, 8).multiplyScalar(0.7)
        },
        viewport: {
            aspectRatio: "19/12"
        },
        infoPanel: {
            text: "<strong>Particle in a 2D box</strong><ul>" +
                "<li>Cylinders $\\propto \\|\\Psi\\|$</li>" +
                "<li>Height $\\propto Re(\\Psi)$</li>" +
                "<li>Radius $\\propto Im(\\Psi)$</li>" +
                "<li>Color represents the value of the phase factor</li>" +
                "<li>System evolves by summing the Fourier coefficients times the eigenstates</li></ul>"
        }
    })
    .bind(waveFunctionPsi.alwaysWith(waveFunctionView))
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_, dt) => waveFunctionPsi.evolve(solver, dt));

