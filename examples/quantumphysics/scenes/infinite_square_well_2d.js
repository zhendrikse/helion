import {
    Group, Mesh, MeshPhongMaterial, CylinderGeometry
} from "three";
import {Complex, Simulation, Vec3} from "../../../src/index.js";

/* physics parameters */
const hbar = 1;
const m = 1;

const NX = [1, 2, 3, 5, 6, 7, 9, 10];
const NY = [1, 2, 3, 5, 6, 7, 9, 10];

class Lattice extends Group {
    constructor(size = 20, spacing = 10, cylinderScale = 20) {
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
    }

    get spacing() { return this._spacing; }
    get size() { return this._size; }

    updateCylinder(psi, i, j) {
        const complexNumber = new Complex(psi.re, psi.im);
        complexNumber.multiplyScalar(this._cylinderScale);
        const mesh = this._cylinders[i][j];
        const height = complexNumber.re;
        const mag = complexNumber.abs;
        const radius = Math.max(0.05 * mag, Math.abs(complexNumber.im) / 6);
        const phase = complexNumber.phase;

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

        mesh.position.set(
            this._x[i][j] - spacing / 2,
            0,
            this._y[i][j] - spacing / 2,
        );
        return mesh;
    }
}

class EigenStates {
    constructor(lattice) {
        this._eigenstates = {};
        this._coefs = {}
        this._omegas = {}

        const size = lattice.size;
        const NA2 = Math.floor(size / 2);
        this._computeEigenstates(size);
        this._computeCoefficients(this._computePsi0(size, NA2), NA2, lattice.spacing);
    }

    _computePsi0(size, NA2) {
        const psi0 = [];
        let norm0 = 0;

        for (let i = 0; i < size; i++) {
            psi0[i] = []

            for (let j = 0; j < size; j++) {
                const val = (i < NA2 && j < NA2) ? 1 : 0;
                psi0[i][j] = val;
                norm0 += val * val;
            }
        }

        norm0 = Math.sqrt(norm0)
        for (let i = 0; i < size; i++)
            for (let j = 0; j < size; j++)
                psi0[i][j] /= norm0;

        return psi0;
    }

    _computeCoefficients(psi0, NA2, spacing) {
        const omega0 = hbar * Math.PI * Math.PI / (2 * m * spacing * spacing);
        for (let key in this._eigenstates) {
            const [nx, ny] = key.split(",").map(Number)
            const basis = this._eigenstates[key]

            let c = 0
            for (let i = 0; i < NA2; i++)
                for (let j = 0; j < NA2; j++)
                    c += psi0[i][j] * basis[i][j];

            this._coefs[key] = c;
            this._omegas[key] = omega0 * (nx * nx + ny * ny);
        }
    }

    _computeEigenstate(nx, ny, lattice, size) {
        const psi = [];
        let norm = 0;
        for (let i = 0; i < size; i++) {
            psi[i] = [];

            for (let j = 0; j < size; j++) {
                const val =
                    Math.sin(nx * Math.PI * lattice._x[i][j] / lattice.spacing) *
                    Math.sin(ny * Math.PI * lattice._y[i][j] / lattice.spacing)

                psi[i][j] = val
                norm += val * val
            }
        }

        norm = Math.sqrt(norm);
        for (let i = 0; i < size; i++)
            for (let j = 0; j < size; j++)
                psi[i][j] /= norm;

        return psi;
    }

    _computeEigenstates(size) {
        for (let nx of NX)
            for (let ny of NY)
                this._eigenstates[nx + "," + ny] = this._computeEigenstate(nx, ny, lattice, size);
    }
}

// scene.add(new DirectionalLight(0xffffff, 1));
// scene.add(new AmbientLight(0x404040));
const lattice = new Lattice();
const eigenstates = new EigenStates(lattice);

let t = 0;
const size = lattice.size;

function step(i, j, t) {
    let psi = new Complex(0, 0);
    for (let key in eigenstates._eigenstates) {
        const basis = eigenstates._eigenstates[key][i][j]
        const term = Complex.fromPhase(eigenstates._omegas[key] * t);
        term.multiply(new Complex(eigenstates._coefs[key] * basis, 0));
        psi.add(term);
    }

    lattice.updateCylinder(psi, i, j);
}

function update(clockTime) {
    for (let i = 0; i < lattice.size; i++)
        for (let j = 0; j < size; j++)
            step(i, j, clockTime);
}
update(0);

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
                "<li>Cylinders \\propto \\|\\Psi\\|</li>" +
                "<li>Height \\propto Re(\\Psi), radius \\propto Im(\\Psi)</li>" +
                "<li>Color represents the value of the phase factor</li>" +
                "<li>System evolves by summing the Fourier coefficients times the eigenstates</li></ul>"
        }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .addObject3D(lattice)
    .onStep((clock, dt) => update(clock.simulatedTime));

