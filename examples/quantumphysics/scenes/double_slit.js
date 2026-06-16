import {BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3} from "three";
import {
    AxialSymmetricBody, Checkbox, Cylinder, RadialSymmetricBody, Range, Simulation, Slider, Sphere, Vec3,
    DiscreteScalarField, Renderable3D, WavelengthColorMapper
} from "../../../src/index.js";

const dx = 0.025;
const xMax = 4;
const posSlit1= new Vec3(-1, -3, 0);
const posSlit2= new Vec3(1, -3, 0);

const field = new DiscreteScalarField({
    nx: Math.floor(4 * xMax / dx),
    ny: Math.floor(2 * xMax / dx)
});

function updateInterferencePattern(field, wavelength) {
    const pos = new Vec3();
    for (let i = 0; i < field.nx; i++)
        for (let j = 0; j < field.nx; j++) {
            const x = (i - field.nx * .5) * dx;
            const y = (j - field.ny * .5) * dx;
            pos.set(x, y, 0);
            const r1 = pos.distanceTo(posSlit1);
            const r2 = pos.distanceTo(posSlit2);
            const pathDiff = Math.abs(r1 - r2);
            const rAverage = (r1 + r2) * 0.5;
            const envelope = 1 / (1 + 0.1 * rAverage);
            field.setValueAt(i, j, Math.pow(Math.cos(Math.PI * pathDiff / wavelength), 2) * envelope);
        }
}

const wavelengthColorMapper = new WavelengthColorMapper();

class InterferencePattern extends Renderable3D {
    constructor({
        nx = field.nx,
        ny = field.ny,
        thicknessEdge= 2,
        colorMapper = wavelengthColorMapper
    } = {}) {
        super();
        this._thicknessEdge = thicknessEdge;
        this._colorMapper = colorMapper;
        this._nx = nx;
        this._ny = ny;

        const geometry = new BoxGeometry(dx, dx, 0.02);
        const material = new MeshBasicMaterial();
        this._mesh = new InstancedMesh(geometry, material, nx * ny);
        this.add(this._mesh);

        this._matrix = new Matrix4();
        this._color = new Color();
    }

    #updatePixelAt(i, j, index) {
        const x = (i - this._nx * .5) * dx;
        const y = (j - this._ny * .5) * dx;

        let zDepth = 0.02; // Height of the screen that the particles hit
        if (y >= xMax - dx)
            zDepth = this._thicknessEdge;

        this._matrix.compose(new Vector3(x, y,0), new Quaternion(), new Vector3(1, 1, zDepth / 0.02));
        this._mesh.setMatrixAt(index, this._matrix);

        const intensity = field.valueAt(i, j);
        const brightness = this._colorMapper.map(intensity * 1e-10, this._color);
        this._mesh.setColorAt(index, this._color.multiplyScalar(brightness));
    }

    canBindTo(model) { return model.valueAt; }

    synchronizeWith(field) {
        let index = 0;
        for (let i = 0; i < this._nx; i++)
            for (let j = 0; j < this._ny; j++)
                this.#updatePixelAt(i, j, ++index);

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }
}

const slitSize = 0.5;
const slit1 = new AxialSymmetricBody({
    position: posSlit1.clone().sub(new Vec3(0, .5 * slitSize, 0)),
    axis: new Vec3(0,slitSize,0),
    radius: 0.15
});
const slit2 = new AxialSymmetricBody({
    position: posSlit2.clone().sub(new Vec3(0, .5 * slitSize, 0)),
    axis: new Vec3(0,slitSize,0),
    radius: 0.15
});

const particles = [];
const dt = 0.1;
updateInterferencePattern(field, 0.5);
const simulation = Simulation
    .with({
        htmlDivId: "doubleSlitContainer",
        cameraPosition: new Vec3(0, -9, 8)
    })
    .synchronize(slit1.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(slit2.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(field.onceWith(new InterferencePattern()))
    .onClockTick(() => {
        if (Math.random() > 0.9) spawnParticleFromSlit(slit1.position);
        if (Math.random() > 0.9) spawnParticleFromSlit(slit2.position);

        for (const particle of particles)
            if (particle.position.y  + particle.radius < xMax)
                particle.apply(new Vec3(0, 0, 0), dt);
    })
    .append(new Slider("Wavelength ")
        .withRange(new Range(380, 700, 1))
        .withValue(590)
        .addEventListener("input", event => {
            updateInterferencePattern(field, parseFloat(event.target.value) * 1e-3);
            wavelengthColorMapper.lambdaInNanos = Number(event.target.value);
        })
    )
    .start();

let spawnParticles = true;
simulation.append(new Checkbox("Particles: ")
    .checked(true)
    .addEventListener("click", (event) => spawnParticles = event.target.checked)
    .togetherWith(
    new Checkbox("↻ Rotate: ")
        .withProperty("autoRotate")
        .on(simulation)
    )
);

function spawnParticleFromSlit(slitPos) {
    if (!spawnParticles)
        return;
    
    const particle = new RadialSymmetricBody({
        position: slitPos.clone(),
        velocity: new Vec3((Math.random() - 0.5) * 0.1, 1,(Math.random() - 0.5) * 0.1),
        radius: 0.06
    });
    particles.push(particle);
    simulation.synchronize(particle.alwaysWith(new Sphere({ color: 0x00ff00})));
}
