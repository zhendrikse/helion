import {
    Button, RadioGroup, Range, Simulation, Slider, Trail, Vec3, Gas, Checkbox,
    UPlotGraph, Colour, Circle, ViewsCollection
} from '../../../src/index.js';

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const BIN_COUNT = 30;
const MAX_SPEED = 10;
const AVERAGING_FRAMES = 100;

const gas = new Gas({
    containerSize: CONTAINER_SIZE,
});
const tracerTrail = new Trail({ maxPoints: 150, trailStep: 2, color: new Colour(0xBF40BF) });
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

let circles = ViewsCollection.of(Circle);
const simulation = Simulation
    .with({
        htmlDivId: 'idealGas2dContainer',
        camera: { position: new Vec3(0, 0, CONTAINER_SIZE * 1.05), orthographic: true, controls: false },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🎈 2D ideal gas</strong><br/>Maxwell velocity distribution of an ideal two-dimensional gas' +
                ' in a square container.\n $$ A=\\frac{m}{2 \\pi k_B T}$$\n $$f(\\overrightarrow{v}) d^2\\overrightarrow{v} =' +
                'e^{(-Av^2)} d^2\\overrightarrow{v}$$'
        }
    })
    .bind(gas.tracer.alwaysWith(tracerTrail))
    .runsEvery(0.01)
    .onStep((_, dt) => gas.evolve(dt))
    .appendStartStopResetUI()
    .append(new Button()
        .withText(`Add ${PARTICLES_TO_ADD}`)
        .onClick(() => {
            const newParticles = gas.addParticles(PARTICLES_TO_ADD);
            const newBindings = newParticles.alwaysWith(circles);
            simulation.bind(newBindings);
            circles.forEach((circle, index) =>
                circle.fillColor = index === 0 ? Colour.Red : index >= PARTICLE_COUNT ? Colour.Cyan : Colour.Yellow);
            newBindings._bindings.forEach(binding => gas._bindings.push(binding));
        }))
    .append(new Checkbox('Tracer particle')
        .checked(true)
        .onChange(checked => {
            circles.forEach((circle, index) => {
                if (index === 0)
                    circle.visible = checked;
            });
            tracerTrail.visible = checked;
        })
        .togetherWith(new RadioGroup()
            .add('Box', _event => {
                gas.limitToContainer = Gas.bounceWithinBox;
                reset();
            })
            .add('Sphere', _event => {
                gas.limitToContainer = Gas.bounceWithinSphere;
                reset();
            })
            .checked(0)
        ))
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
    .onReset(reset)
    .start();

function reset() {
    gas.reset(temperatureSlider.value);
    circles.reset();
    simulation.bind(gas.alwaysWith(circles));
    circles.forEach((circle, index) =>
        circle.fillColor = index === 0 ? Colour.Red : index > PARTICLE_COUNT ? Colour.Cyan : Colour.Yellow
    );
    tracerTrail.reset();
    histogramBuffer.length = 0;
}
reset();

