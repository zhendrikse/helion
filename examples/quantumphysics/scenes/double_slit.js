import {
    AxialSymmetricBody, Checkbox, Cylinder, RadialSymmetricBody, Range, Simulation, Slider, Sphere, Vec3,
    DiscreteScalarField, WavelengthColorMapper, ScalarFieldIntensityPixelRaster, DoubleSlitOperator,
    FieldEdgeIntensityPixelRaster
} from "../../../src/index.js";

const resolution = 50;
const xMax = 4;
const wavelengthColorMapper = new WavelengthColorMapper(525);

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

const doubleSlitOperator = new DoubleSlitOperator({
    positionSlit1: slit1.position,
    positionSlit2: slit2.position
});

const field = new DiscreteScalarField({
    nx: Math.floor(4 * xMax * resolution),
    ny: Math.floor(2 * xMax * resolution),
});
field.apply(doubleSlitOperator);

const particles = [];
const simulation = Simulation
    .with({
        htmlDivId: "doubleSlitContainer",
        cameraPosition: new Vec3(0, -9, 7).multiplyScalar(resolution),
        headUpDisplay: true
    })
    .synchronize(slit1.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(slit2.onceWith(new Cylinder({ color: 0xffffff })))
    .synchronize(field.onceWith(new FieldEdgeIntensityPixelRaster({
        nx: field.nx,
        ny: field.ny,
        edgeHeight: .6 * xMax * resolution,
        colorMapper: wavelengthColorMapper
    })))
    .synchronize(field.onceWith(new ScalarFieldIntensityPixelRaster({
        width: field.nx,
        height: field.ny,
        colorMapper: wavelengthColorMapper
    })))
    .withMouseClickEventListener()
    .onReset(() => particles.length = 0)
    .onStep((_) => {
        if (Math.random() > 0.9) spawnParticleFromSlit(slit1.position);
        if (Math.random() > 0.9) spawnParticleFromSlit(slit2.position);

        for (const particle of particles)
            if (particle.position.y < xMax * resolution - particle.radius * 2)
                particle.apply(new Vec3(0, 0, 0), 0.1); // Apply zero force ==> velocity stays the same
    })
    .append(new Slider("Wavelength ")
        .withRange(new Range(380, 700, 1))
        .withValue(480)
        .addEventListener("input", event => {
            wavelengthColorMapper.lambdaInNanos = Number(event.target.value);
            doubleSlitOperator.wavelength = Number(event.target.value);
            field.apply(doubleSlitOperator);
        })
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
        radius: .06 * resolution
    });
    particles.push(particle);
    simulation.synchronize(particle.alwaysWith(new Sphere({ color: 0xffffff})));
}
