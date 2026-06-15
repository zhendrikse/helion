import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3} from "three";
import { Cylinder, Simulation, Vec3 } from "../../../src/index.js";

class Particle {
    constructor(group, {
        position=new Vector3(0, 0, 0),
        velocity=new Vector3(0, 1, 0),
        radius=0.06,
        color=0x00ff00 } = {}) {
        this._sphere = new Sphere({
            position: position.clone(),
            radius,
            color
        });
        group.add(this._sphere);
        this.velocity = velocity.clone();
        this.alive = true;
    }

    update(dt, yMax) {
        if (!this.alive) return;
        const newPos = this._sphere.position.clone().addScaledVector(this.velocity, dt);
        if (newPos.y >= yMax) {
            newPos.copy(new Vector3(newPos.x, yMax, newPos.z));
            this.alive = false;
        }
        this._sphere.moveTo(newPos);
    }
}

class InterferencePattern extends Group {
    constructor({
        wavelength=0.5,
        dx=0.025,
        xMax=4,
        slit1=new Vector3(-1, -3, 0),
        slit2=new Vector3(1, -3, 0),
        thicknessEdge=2
    } = {}) {
        super();
        this._wavelength = wavelength;
        this._dx = dx;
        this._slit1 = slit1;
        this._slit2 = slit2;
        this._thicknessEdge = thicknessEdge;
        this._xStart = -2*xMax;
        this._xEnd = 2*xMax;
        this._yStart = -xMax;
        this._yEnd = xMax;

        const geometry = new BoxGeometry(dx, dx, 0.02);
        const material = new MeshBasicMaterial();

        const nx = Math.floor((this._xEnd - this._xStart) / dx);
        const ny = Math.floor((this._yEnd - this._yStart) / dx);
        const count = nx * ny;

        this._mesh = new InstancedMesh(geometry, material, count);
        this.add(this._mesh);

        this._matrix = new Matrix4();
        this._color = new Color();
        this._pos = new Vector3();

        this._addSlits();
        this.updatePattern();
    }

    _addSlits() {
        const axisVec = new Vector3(0,0.5,0); // cylinder axis in XY-plane
        this._slit1Cyl = new Cylinder({
            position: this._slit1.clone(),
            axis: axisVec.clone(),
            radius: 0.15,
            color: 0xffffff
        });
        this._slit2Cyl = new Cylinder({
            position: this._slit2.clone(),
            axis: axisVec.clone(),
            radius: 0.15,
            color: 0xffffff
        });
        this.add(this._slit1Cyl, this._slit2Cyl);
    }

    #updatePixelAt(x, y, index) {
        let zDepth = 0.02;
        if (y >= this._yEnd - this._dx) zDepth = this._thicknessEdge;

        this._matrix.compose(
            new Vector3(x ,y, 0),
            new Quaternion(),
            new Vector3(1, 1, zDepth / 0.02)
        );
        this._mesh.setMatrixAt(index, this._matrix);

        this._pos.set(x, y, 0);
        const r1 = this._pos.distanceTo(this._slit1);
        const r2 = this._pos.distanceTo(this._slit2);
        const pathDiff = Math.abs(r1 - r2);
        const rAverage = (r1 + r2) * 0.5;
        const envelope = 1 / (1 + 0.1 * rAverage);

        const brightness = Math.pow(Math.cos(Math.PI * pathDiff / this._wavelength),2) * envelope;
        this._color.setRGB(brightness, brightness, 0);
        this._mesh.setColorAt(index, this._color);
    }

    updatePattern() {
        let index = 0;
        for (let x = this._xStart; x < this._xEnd; x += this._dx)
            for (let y = this._yStart; y < this._yEnd; y += this._dx)
                this.#updatePixelAt(x, y, ++index);
        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }

    setWavelength(value) {
        this._wavelength = value;
        this.updatePattern();
    }
}

const doubleSlitGroup = new Group();
const pattern = new InterferencePattern();
doubleSlitGroup.add(pattern);
doubleSlitGroup.rotation.x = Math.PI/2;
doubleSlitGroup.position.y = 2;

// --- Particles ---
const particles = [];
const dt = 0.1;

function spawnParticleFromSlit(slitPos) {
    const randX = (Math.random() - 0.5) * 0.1;
    const randZ = (Math.random() - 0.5) * 0.1;
    const pos = slitPos.clone();
    const velocity = new Vector3(randX, 1, randZ);
    particles.push(new Particle(doubleSlitGroup, {
        position: pos,
        velocity: velocity
    }));
}

// TODO
// const wavelengthSlider = document.getElementById("wavelengthSlider");
// const wavelengthValue = document.getElementById("wavelengthValue");
//
// wavelengthSlider.addEventListener("input", (event) => {
//     const value = parseFloat(event.target.value);
//     pattern.setWavelength(value);
//     wavelengthValue.textContent = value.toFixed(2);
// });
//
// function animate() {
//     if (Math.random() > 0.9) spawnParticleFromSlit(pattern._slit1);
//     if (Math.random() > 0.9) spawnParticleFromSlit(pattern._slit2);
//
//     for (const particle of particles)
//         particle.update(dt, pattern._yEnd-pattern._dx);
//
//     renderer.render(scene, camera);
// }

Simulation
    .with({
        htmlDivId: "doubleSlitContainer",
        cameraPosition: new Vec3(0, 10, -8)
    })
    .addObject3D(doubleSlitGroup);