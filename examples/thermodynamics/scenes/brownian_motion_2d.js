import {
    Button, RadioGroup, Range, Simulation, Slider, Trail, Vec3, Gas, ParticleView2D, Checkbox
} from "../../../src/index.js";

const CONTAINER_SIZE = 10;
const PARTICLE_COUNT = 200;
const PARTICLES_TO_ADD = 50;
const BIN_COUNT = 30;
const MAX_SPEED = 10;
const AVERAGING_FRAMES = 100;

const gas = new Gas({
    container: CONTAINER_SIZE,
    tracerMass: 50,
    tracerRadius: 0.3
});
const particleViews = [];
const tracerTrail = new Trail({ maxPoints: 500, trailStep: 5, color: 0xBF40BF });
const histogramBuffer = [];
const speedAxis = Array.from({ length: BIN_COUNT }, (_, i) => (i + 0.5) * MAX_SPEED / BIN_COUNT);

const temperatureSlider = new Slider("Temperature")
    .withRange(new Range(0.1, MAX_SPEED * .5, 0.1))
    .withValue(gas.temperature)
    .onInput(event => gas.temperature = Number(event.target.value));

const simulation = Simulation
    .with({
        htmlDivId: "brownianMotionContainer",
        camera: { position: new Vec3(0, 0, CONTAINER_SIZE * 1.05), orthographic: true, controls: false },
        lighting: { enabled: false },
        infoPanel: {
            text: "<strong>🚶🏻‍➡️️ Random walk / Brownian motion</strong><br/>"
        }
    })
    .runsEvery(0.01)
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
    .append(new Checkbox("Gas particles")
        .addEventListener("change", event => particleViews.slice(1).forEach(view => view.visible = event.target.checked))
        .checked(true)
        .togetherWith(new RadioGroup()
        .add("Box", event => {
            gas.limitToContainer = Gas.bounceWithinBox;
            gas.reset();
            tracerTrail.reset();
        })
        .add("Sphere", event => {
            gas.limitToContainer = Gas.bounceWithinSphere;
            gas.reset();
            tracerTrail.reset();
        }).checked(0)))
    .append(temperatureSlider)
    .setupGraphWith({
        dataDefinition: [
            {},
            { label: "Simulation", color: "cyan", fill: "rgba(0, 255, 255, 0.2)" },
            { label: "Maxwell (2D)", color: "orange" }
        ],
        height: 250,
        title: "Speed Distribution (averaged)",
        xLabel: "Speed",
        yLabel: "Particles"
    })
    .onFrame(() => {
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

        const graphData = simulation._plot.graphData;
        graphData[0].length = 0;
        graphData[1].length = 0;
        graphData[2].length = 0;
        for (let i = 0; i < BIN_COUNT; i++) {
            graphData[0].push(speedAxis[i]);
            graphData[1].push(averaged[i]);
            graphData[2].push(theory[i]);
        }
        simulation._plot.update();
    })
    .onReset(() => {
        gas.reset(temperatureSlider.value);
        particleViews.slice(PARTICLE_COUNT).forEach(view => view.visible = false);
        particleViews.slice(0, PARTICLE_COUNT).forEach(view => view.visible = true);
        tracerTrail.reset();
        histogramBuffer.length = 0;
    })
    .start();

function bindParticle(particle, index) {
    const particleView = new ParticleView2D({
        color: index === 0 ? 0xff0000 : particleColor,
        segments: index === 0 ? 32 : 16
    });
    particleViews.push(particleView);
    simulation.bind(particle.alwaysWith(particleView));
    if (index === 0)
        simulation.bind(particle.alwaysWith(tracerTrail));
}

let particleColor = 0xffff00;
Array.from(gas).forEach(bindParticle);
particleColor = 0x00ffff;
