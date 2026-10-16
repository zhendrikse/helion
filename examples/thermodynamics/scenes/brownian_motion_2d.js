import {
    Button, RadioGroup, Range, Simulation, Slider, Trail, Vec3, Gas, Checkbox,
    RadialSymmetricBody, UPlotGraph, Colour, Circle
} from '../../../src/index.js';

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const BIN_COUNT = 30;
const MAX_SPEED = 10;
const AVERAGING_FRAMES = 100;

const gas = new Gas({
    containerSize: CONTAINER_SIZE,
    tracerMass: 50,
    tracerRadius: 0.3
});
/** @type {Circle[]} */
const particleViews = [];
const tracerTrail = new Trail({ maxPoints: 500, trailStep: 5, color: new Colour(0xBF40BF) });
/** @type {number[][]} */
const histogramBuffer = [];
const speedAxis = Array.from({ length: BIN_COUNT }, (_, i) => (i + 0.5) * MAX_SPEED / BIN_COUNT);

const temperatureSlider = new Slider('Temperature')
    .withRange(new Range(0.1, MAX_SPEED * .5, 0.1))
    .withValue(gas.temperature)
    .onInput(value => gas.temperature = value);

const graph = new UPlotGraph({
    dataDefinition: [
        {},
        { label: 'Simulation', color: Colour.Cyan, fill: 'rgba(0, 255, 255, 0.2)' },
        { label: 'Maxwell (2D)', color: Colour.Orange }
    ],
    height: 250,
    title: 'Speed Distribution (averaged)',
    xLabel: 'Speed',
    yLabel: 'Particles'
});

for (let i = 0; i < gas.particleCount; i++)
    particleViews.push(new Circle({
        fillColor: i === 0 ? Colour.Red : i > PARTICLE_COUNT ? Colour.Cyan : Colour.Yellow,
        segments: i === 0 ? 32 : 16
    }));

const simulation = Simulation
    .with({
        htmlDivId: 'brownianMotionContainer',
        camera: { position: new Vec3(0, 0, CONTAINER_SIZE * 1.05), orthographic: true, controls: false },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🚶🏻‍➡️️ Random walk / Brownian motion</strong><br/>Maxwell velocity distribution of an ideal two-dimensional gas' +
            ' in a square container.\n $$ A=\\frac{m}{2 \\pi k_B T}$$\n $$f(\\overrightarrow{v}) d^2\\overrightarrow{v} =' +
            'e^{(-Av^2)} d^2\\overrightarrow{v}$$'
        }
    })
    .runsEvery(0.01)
    .bind(gas.alwaysWith(particleViews))
    .bind(gas.tracer.alwaysWith(tracerTrail))
    .onStep((_, dt) => gas.evolve(dt))
    .appendStartStopResetUI()
    .append(new Button()
        .withText(`Add ${PARTICLES_TO_ADD}`)
        .onClick(() => {
            const startIndex = gas.particleCount;
            gas.addParticles(PARTICLES_TO_ADD);
            for (const [index, particle] of gas.entries())
                if (index >= startIndex)
                    bindParticle(particle, index);
        }))
    .append(new Checkbox('Gas particles')
        .checked(true)
        .onChange(checked => particleViews.slice(1).forEach(view => view.visible = checked))
        .togetherWith(new RadioGroup()
            .add('Box', _event => {
                gas.limitToContainer = Gas.bounceWithinBox;
                gas.reset();
                tracerTrail.reset();
            })
            .add('Sphere', _event => {
                gas.limitToContainer = Gas.bounceWithinSphere;
                gas.reset();
                tracerTrail.reset();
            }).checked(0)))
    .append(new Slider('Tracer mass')
        .withRange(new Range(1, 100, 1))
        .withValue(50)
        .on(gas)
        .withProperty('tracerMass'))
    .append(temperatureSlider)
    .addGraph(graph)
    .onFrame((_) => {
        const { bins, theory } = gas.speedDistribution();
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
    .onReset(() => {
        gas.reset(temperatureSlider.value);
        particleViews.slice(PARTICLE_COUNT).forEach(view => view.visible = false);
        particleViews.slice(0, PARTICLE_COUNT).forEach(view => view.visible = true);
        tracerTrail.reset();
        histogramBuffer.length = 0;
    })
    .start();

/**
 * @param {RadialSymmetricBody} particle 
 * @param {number} index 
 */
function bindParticle(particle, index) {
    const particleView = new Circle({
        fillColor: index === 0 ? Colour.Red : index > PARTICLE_COUNT ? Colour.Cyan : Colour.Yellow
    });
    particleViews.push(particleView);
    simulation.bind(particle.alwaysWith(particleView));
}

