import {BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3} from "three";
import {
    AxialSymmetricBody, Checkbox, Cylinder, RadialSymmetricBody, Range, Simulation, Slider, Sphere, Vec3,
    DiscreteScalarField, Renderable3D, WavelengthColorMapper, ScalarFieldPixelRaster
} from "../../../src/index.js";

const resolution = 50;
const xMax = 4;
const wavelengthColorMapper = new WavelengthColorMapper();
const field = new DiscreteScalarField({
    nx: Math.floor(4 * xMax * resolution),
    ny: Math.floor(2 * xMax * resolution),
});

const slitSize = .5;
const slit1 = new AxialSymmetricBody({
    position: new Vec3(-1, -3 - slitSize * .5, 0).multiplyScalar(resolution),
    axis: new Vec3(0, slitSize * resolution,0),
    radius: .15 * resolution,
});
const slit2 = new AxialSymmetricBody({
    position: new Vec3( 1, -3 - slitSize * .5, 0).multiplyScalar(resolution),
    axis: new Vec3(0, slitSize * resolution,0),
    radius: .15 * resolution,
});

function updateInterferencePattern(field, wavelength=480) {
    wavelengthColorMapper.lambdaInNanos = wavelength;
    const pos = new Vec3();
    for (let i = 0; i < field.nx; i++)
        for (let j = 0; j < field.nx; j++) {
            const x = (i - field.nx * .5) / resolution;
            const y = (j - field.ny * .5) / resolution;
            pos.set(x, y, 0);
            const r1 = pos.distanceTo(slit1.position.clone().divideScalar(resolution));
            const r2 = pos.distanceTo(slit2.position.clone().divideScalar(resolution));
            const pathDiff = Math.abs(r1 - r2);
            const rAverage = (r1 + r2) * 0.5;
            const envelope = 1 / (1 + 0.1 * rAverage);
            field.setValueAt(i, j, Math.pow(Math.cos(Math.PI * pathDiff * 1e3 / wavelength), 2) * envelope);
        }
}

class InterferenceScreen extends Renderable3D {
    constructor({
        nx = field.nx,
        ny = field.ny,
        edgeHeight= 60 * resolution,
        colorMapper = wavelengthColorMapper
    } = {}) {
        super();
        this._edgeHeight = edgeHeight;
        this._colorMapper = colorMapper;
        this._nx = nx;
        this._ny = ny;

        const geometry = new BoxGeometry(1, 1, 0.02);
        const material = new MeshBasicMaterial();
        this._mesh = new InstancedMesh(geometry, material, nx * ny);
        this.add(this._mesh);

        this._matrix = new Matrix4();
        this._color = new Color();
    }

    canBindTo(model) { return model.valueAt; }

    synchronizeWith(field) {
        let index = 0;
        for (let i = 0; i < this._nx; i++) {
            const j = this._ny - 1; // fixed, we only need the last row!
            const x = i - this._nx * .5;
            const y = j - this._ny * .5;
            const intensity = field.valueAt(i, this._ny - 1);
            const brightness = this._colorMapper.map(intensity * 1e-10, this._color);

            index++;
            this._matrix.compose(new Vector3(x, y,0), new Quaternion(), new Vector3(1, 1, this._edgeHeight));
            this._mesh.setMatrixAt(index, this._matrix);
            this._mesh.setColorAt(index, this._color.multiplyScalar(brightness));
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }
}

const particles = [];
updateInterferencePattern(field);
const simulation = Simulation
    .with({
        htmlDivId: "doubleSlitContainer",
        cameraPosition: new Vec3(0, -9, 7).multiplyScalar(resolution),
        headUpDisplay: true
    })
    .synchronize(slit1.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(slit2.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(field.onceWith(new InterferenceScreen()))
    .synchronize(field.onceWith(new ScalarFieldPixelRaster({
        width: field.nx,
        height: field.ny,
        colorMapper: wavelengthColorMapper
    })))
    .withMouseClickEventListener()
    .onReset(() => particles.length = 0)
    .onClockTick(() => {
        if (Math.random() > 0.9) spawnParticleFromSlit(slit1.position);
        if (Math.random() > 0.9) spawnParticleFromSlit(slit2.position);

        for (const particle of particles)
            if (particle.position.y < xMax * resolution - particle.radius * 2)
                particle.apply(new Vec3(0, 0, 0), 0.1); // Apply zero force ==> velocity stays the same
    })
    .append(new Slider("Wavelength ")
        .withRange(new Range(380, 700, 1))
        .withValue(480)
        .addEventListener("input", event => updateInterferencePattern(field, Number(event.target.value)))
    );

let spawnParticles = true;
simulation.append(new Checkbox("Particles: ")
    .checked(true)
    .addEventListener("click", (event) => spawnParticles = event.target.checked)
    .togetherWith(new Checkbox("↻ Rotate: ")
        .withProperty("autoRotate")
        .on(simulation))
);

function spawnParticleFromSlit(slitPos) {
    if (!spawnParticles)
        return;
    
    const particle = new RadialSymmetricBody({
        position: slitPos.clone().add(new Vec3(0, 10, 0)),
        velocity: new Vec3((Math.random() - 0.5) * 0.1, 1,(Math.random() - 0.5) * 0.1).multiplyScalar(resolution),
        radius: .075 * resolution
    });
    particles.push(particle);
    simulation.synchronize(particle.alwaysWith(new Sphere({ color: 0xffffff})));
}
