import {
    AxialSymmetricBody, Checkbox, Cylinder, RadialSymmetricBody, Range, Simulation, Slider,
    DiscreteScalarField, WavelengthColorMapper, DiscreteFieldSurfaceView, DoubleSlitOperator,
    FieldEdgeIntensityPixelRaster, Colour, FixedIntervalNormalizer, Sphere, Vec3
} from '../../../src/index.js';

const resolution = 50;
const xMax = 4;
const wavelengthColorMapper = new WavelengthColorMapper({ lambdaInNanos: 525 });

const slitSize = .5;
let slitSeparation = 2; // Distance between slit centers
const slit1 = new AxialSymmetricBody({
    position: new Vec3(-slitSeparation * .5, -3 - slitSize * .5, 0).multiplyScalar(resolution),
    axis: new Vec3(0, slitSize * resolution,0),
    radius: .15 * resolution,
});
const slit2 = new AxialSymmetricBody({
    position: new Vec3( slitSeparation * .5, -3 - slitSize * .5, 0).multiplyScalar(resolution),
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

/** @type {RadialSymmetricBody[]} */
const particles = [];
const simulation = Simulation
    .with({
        htmlDivId: 'doubleSlitContainer',
        camera: { position: new Vec3(0, -9, 7).multiplyScalar(resolution) },
        viewport: { aspectRatio: '2/1' }
    })
    .bind(slit1.onceWith(new Cylinder({ color: Colour.White })))
    .bind(slit2.onceWith(new Cylinder({ color: Colour.White })))
    .bind(field.onceWith(new FieldEdgeIntensityPixelRaster({
        edgeHeight: .6 * xMax * resolution,
        colorMapper: wavelengthColorMapper
    })))
    .bind(field.onceWith(new DiscreteFieldSurfaceView({
        colorMapper: wavelengthColorMapper,
        normalizer: new FixedIntervalNormalizer()
    })))
    .withMouseClickEventListener()
    .onReset(() => particles.length = 0)
    .onStep((_) => {
        if (Math.random() > 0.9) spawnParticleFromSlit(slit1.position);
        if (Math.random() > 0.9) spawnParticleFromSlit(slit2.position);

        for (const particle of particles)
            if (particle.position.y < xMax * resolution - particle.radius * 2)
                particle.integrate(0.025);
    })
    .append(new Slider('Wavelength ')
        .withRange(new Range(380, 700, 1))
        .withValue(480)
        .onInput(value => {
            wavelengthColorMapper.lambdaInNanos = value;
            doubleSlitOperator.wavelength = value;
            field.apply(doubleSlitOperator);
        })
    )
    .append(new Slider('Slit separation ')
        .withRange(new Range(0.5, 5, 0.1))
        .withValue(slitSeparation)
        .onInput(value => {
            slitSeparation = value;
            slit1.position.x = -slitSeparation * .5 * resolution;
            slit2.position.x =  slitSeparation * .5 * resolution;
            doubleSlitOperator._positionSlit1.copy(slit1.position);
            doubleSlitOperator._positionSlit2.copy(slit2.position);
            field.apply(doubleSlitOperator);
        })
    );

let spawnParticles = true;
simulation.append(new Checkbox('Particles: ')
    .checked(true)
    .onChange(checked => spawnParticles = checked)
    .togetherWith(new Checkbox('↻ Rotate: ')
        .on(simulation)
        .withProperty('autoRotate'))
);

/** @param {Vec3} slitPos */
function spawnParticleFromSlit(slitPos) {
    if (!spawnParticles)
        return;
    
    const particle = new RadialSymmetricBody({
        position: slitPos.clone().add(new Vec3(0, 10, 0)),
        velocity: new Vec3((Math.random() - 0.5) * 0.1, 1,(Math.random() - 0.5) * 0.3).multiplyScalar(resolution),
        radius: .06 * resolution
    });
    particles.push(particle);
    simulation.bind(particle.alwaysWith(new Sphere({ color: Colour.White})));
}
