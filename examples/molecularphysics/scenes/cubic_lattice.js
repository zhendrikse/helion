import { Scene, Group, Color, Vector3, PerspectiveCamera, WebGLRenderer, DirectionalLight, AmbientLight }  from "three";
import { Sphere, Bond } from "../js/three-js-extensions.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";


import {AxialSymmetricBody, Vec3} from "../../../src/index.js";


console.clear( );
const scene = new Scene();

const canvas = document.getElementById('simulationCanvas');
canvas.focus();
const canvasWidth = canvas.clientWidth;
const canvasHeight = canvas.clientHeight;

const camera = new PerspectiveCamera(60, canvasWidth/canvasHeight, 0.1, 1000);
camera.position.set(1.55, 2, 2.55);
camera.updateProjectionMatrix();

const renderer = new WebGLRenderer( {antialias: true, canvas: canvas, alpha: true} );
renderer.setSize( canvasWidth, canvasHeight );
renderer.setAnimationLoop( animationLoop );

const controls = new OrbitControls( camera, canvas );
controls.enableDamping = true;

const light = new DirectionalLight(0xffffff, 1);
light.position.set(0, 4, 0);
scene.add(light);
scene.add(new AmbientLight(0xffffff, .75));

class Atom extends AxialSymmetricBody {
    constructor(x, y, z, visible) {
        super({
            radius: 0.175,
            position: new Vec3(x, y, z)
        });
        this._neighbors = [];
    }

    appendNeighbor(atom) { this._neighbors.push(atom); }

    get neighbors() { return this._neighbors; }
}

class Lattice extends Group {
    constructor(nrows=3) {
        super();
        this._atoms = [];
        this._bonds = [];

        this.#createLattice(nrows + 2);
        this.#determineNeighbors();
    }

    #createAtom(x, y, z, half) {
        const visible =
            Math.abs(x) !== half &&
            Math.abs(y) !== half &&
            Math.abs(z) !== half;

        const atom = new Atom(x, y, z, visible);
        this.add(atom);
        this._atoms.push({atom: atom, force: new Vector3(0, 0, 0)});
    }

    #createLattice(nrows) {
        const half = (nrows - 1) / 2;
        for (let z = -half; z < half; z++)
            for (let y = -half; y < half; y++)
                for (let x = -half; x < half; x++)
                    this.#createAtom(x, y, z, half);
    }

    #isNeighbor(atom, other) {
        const delta = atom.position.clone().sub(other.position);
        return delta.equals(new Vector3(1, 0, 0)) ||
            delta.equals(new Vector3(-1, 0, 0)) ||
            delta.equals(new Vector3( 0, 1, 0)) ||
            delta.equals(new Vector3(0, -1, 0)) ||
            delta.equals(new Vector3( 0, 0, 1)) ||
            delta.equals(new Vector3(0, 0, -1));
    }

    #createBond(atom, other) {
        const bond = new Bond(atom, other, {
            k: 1000,
            color: "white",
            radius: 0.175,
            coils: 25,
            type: Bond.Type.CYLINDER,
            thickness: 0.1 * 0.05 // TODO atomA.ball._sphere.radius * 0.5
        });
        this._bonds.push(bond);
        this.add(bond);
    }

    #determineNeighbors() {
        for (const atomData of this._atoms)
            for (const other of this._atoms)
                if (this.#isNeighbor(atomData.atom, other.atom)) {
                    atomData.atom.appendNeighbor(other.atom);
                    if (atomData.atom.visible && other.atom.visible)
                        this.#createBond(atomData.atom, other.atom);
                }
    }

    updateForce(atomData) {
        atomData.force.set(0, 0, 0);
        const k = 1000;
        const leq = 1;

        for (const atom of atomData.atom.neighbors) {
            const delta = atom.position.clone().sub(atomData.atom.position);
            const stretch = delta.length() - leq;
            atomData.force.add(delta.normalize().multiplyScalar(k * stretch));
        }
    }

    update(dt, time) {
        for (const atomData of this._atoms)
            this.updateForce(atomData);

        for (const atomData of this._atoms) {
            if (!atomData.atom.visible) continue;
            atomData.atom.step(atomData.force, dt);
        }

        for (const bond of this._bonds)
            bond.update(time);
    }

    changeBondType(type) {
        for (let bond of this._bonds)
            bond.changeBondType(type);
        this.update(0, 0);
    }

    moveAtom(index, displacement) {
        this._atoms[index].atom.shiftBy(displacement);
    }
}

let running = true;
const toggleButton = document.getElementById("pauseButton");
toggleButton.onclick = () => {
    running = !running;
    toggleButton.innerHTML = running ? "&nbsp;Pause&nbsp;" : "Resume";
}
let bondType = Bond.Type.CYLINDER;
const bondTypeButton = document.getElementById("bondTypeButton");
bondTypeButton.onclick = () => {
    bondType = bondType === Bond.Type.CYLINDER ? Bond.Type.SPRING : Bond.Type.CYLINDER;
    bondTypeButton.innerHTML = bondType === Bond.Type.SPRING ? "&nbsp;Bonds as rods&nbsp;" : "Bonds as springs";
    lattice.changeBondType(bondType);
}

const lattice = new Lattice(3);
scene.add(lattice);
lattice.moveAtom(3 * 3 + 1, new Vector3(0, 0, 0.1));
const dt = 0.005;
function animationLoop(time) {
    if (running)
        lattice.update(dt, time * 0.001);
    renderer.render(scene, camera);
}

