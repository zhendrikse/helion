import {
    Button, RadioGroup, Range, Simulation, Slider, Trail, Vec3, Gas, Checkbox,
    UPlotGraph, Colour, SphereSegmentsView, Aquarium, RadialSymmetricBody, Sphere
} from '../../../src/index.js';

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const BIN_COUNT = 30;
const MAX_SPEED = 10;
const AVERAGING_FRAMES = 100;

const gas = new Gas({
    particleCount: PARTICLE_COUNT,
    containerSize: CONTAINER_SIZE,
    tracerMass: 50,
    tracerRadius: 0.3,
    dimensions: 3
});
const tracerTrail = new Trail({ maxPoints: 250, trailStep: 3, color: new Colour(0xBF40BF) });
const spheresView = new SphereSegmentsView({
    colorMapper: (particle, index, color) => color.setHex(index === 0 ? 0xff4040 : 0xffd45a)
});
/** @type {number[][]} */
const histogramBuffer = [];
const speedAxis = Array.from({ length: BIN_COUNT }, (_, i) => (i + 0.5) * MAX_SPEED / BIN_COUNT);

const temperatureSlider = new Slider('Temperature')
    .withRange(new Range(0.1, MAX_SPEED * 0.5, 0.1))
    .withValue(gas.temperature)
    .onInput(value => gas.temperature = value);

const tracerMassSlider = new Slider('Tracer mass')
    .withRange(new Range(1, 100, 1))
    .withValue(gas.tracerMass)
    .on(gas)
    .withProperty('tracerMass');

const graph = new UPlotGraph({
    dataDefinition: [
        {},
        { label: 'Simulation', color: Colour.Cyan, fill: 'rgba(0, 255, 255, 0.2)' },
        { label: 'Maxwell (3D)', color: Colour.Orange }
    ],
    height: 250,
    title: 'Speed Distribution (averaged)',
    xLabel: 'Speed',
    yLabel: 'Particles'
});

const aquarium = new Aquarium({
    opacity: 0.1,
    size: new Vec3(CONTAINER_SIZE, CONTAINER_SIZE, CONTAINER_SIZE)
});
const bowl = new RadialSymmetricBody({ radius: CONTAINER_SIZE * 0.5 });
const bowlView = new Sphere({ opacity: 0.2, visible: false });

const simulation = Simulation
    .with({
        htmlDivId: 'brownianMotion3dContainer',
        camera: { position: new Vec3(26, 14, 30), fieldOfView: 20 },
        lighting: { enabled: true },
        infoPanel: {
            text: '<strong>🚶🏻‍➡️ 3D Brownian motion</strong><br/>A heavy tracer particle undergoes random motion through collisions with the particles of a three-dimensional ideal gas.' +
                '$$f(v)=4\\pi\\left(\\frac{m}{2\\pi k_B T}\\right)^{3/2}v^2 e^{-mv^2/(2k_B T)}$$' +
                '$$v_{\\mathrm{rms}}=\\sqrt{\\frac{3k_B T}{m}}$$'
        }
    })
    .bind(gas.spheres.alwaysWith(spheresView))
    .bind(gas.tracer.alwaysWith(tracerTrail))
    .bind(bowl.onceWith(bowlView))
    .runsEvery(0.01)
    .onStep((_, dt) => gas.evolve(dt))
    .appendStartStopResetUI()
    .append(new Button()
        .withText(`Add ${PARTICLES_TO_ADD}`)
        .onClick(() => gas.addParticles(PARTICLES_TO_ADD)))
    .append(new Checkbox('Tracer trail')
        .checked(true)
        .onChange(checked => tracerTrail.visible = checked)
        .togetherWith(new RadioGroup()
            .add('Cube', () => changeContainerTo(Gas.bounceWithinBox))
            .add('Sphere', () => changeContainerTo(Gas.bounceWithinSphere))
            .checked(0)))
    .append(tracerMassSlider)
    .append(temperatureSlider)
    .addGraph(graph)
    .addObject3D(aquarium)
    .onFrame(() => {
        const { bins, theory } = gas.speedDistribution(BIN_COUNT, MAX_SPEED);
        histogramBuffer.push(bins);
        if (histogramBuffer.length > AVERAGING_FRAMES)
            histogramBuffer.shift();

        const averaged = new Array(BIN_COUNT).fill(0);
        for (const frame of histogramBuffer)
            for (let i = 0; i < BIN_COUNT; i++)
                averaged[i] += frame[i];
        for (let i = 0; i < BIN_COUNT; i++)
            averaged[i] /= histogramBuffer.length;

        const graphData = graph.graphData;
        graphData[0].length = 0;
        graphData[1].length = 0;
        graphData[2].length = 0;
        for (let i = 0; i < BIN_COUNT; i++) {
            graphData[0].push(speedAxis[i]);
            graphData[1].push(averaged[i]);
            graphData[2].push(theory[i]);
        }
        graph.update();
    })
    .onReset(reset)
    .start();

function changeContainerTo(type) {
    gas.limitToContainer = type;
    bowlView.visible = type === Gas.bounceWithinSphere;
    aquarium.visible = type === Gas.bounceWithinBox;
    reset();
}

function reset() {
    gas.reset(temperatureSlider.value);
    tracerTrail.reset();
    histogramBuffer.length = 0;
}
reset();
