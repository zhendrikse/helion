import {
    Simulation, AxialSymmetricBody, BindableCollection, Cylinder, Sphere, RadialSymmetricBody, Vec3, ViewsCollection,
    Colour, Block, Box, Range, Slider, UPlotBarGraph, UPlotGraph
} from "../../../src/index.js";

const num_nails = 10;
const num_balls = 200;
const binCount = num_nails + 1;
const stepsPerRow = 25;
const animationSpeedDefault = 200;
const stepDistance = 0.04;
const totalFallSteps = stepsPerRow * (num_nails + 1);

const bars = new BindableCollection()
    .add(new AxialSymmetricBody({ // Left
        position: new Vec3(-1 - num_nails, 18.5, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Right
        position: new Vec3(num_nails + 1, 18.5, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Bottom
        position: new Vec3(-num_nails - 1, 17 - .175 * num_balls, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.175
    }))
    .add(new AxialSymmetricBody({ // Top
        position: new Vec3(-num_nails - 1, 18.5, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.175
    }));

const pins = new BindableCollection();
for (let i = 0; i < num_nails; i++) {
    bars.add(new AxialSymmetricBody({
        position: new Vec3(i + .5 - num_nails / 2, 3.5, 0).multiplyScalar(2),
        axis: new Vec3(0, -.125 * num_balls, 0),
        radius: 0.175
    }));

    for (let j = -i; j < i + 1; j += 2)
        pins.add(new RadialSymmetricBody({
            position: new Vec3(j, 17 - i, 0),
            radius: 0.2
        }));
}

const bins = Array(binCount).fill(0);
const balls = /** @type {{ body: RadialSymmetricBody, steps: number, direction: number, settled: boolean }[]} */ ([]);
let spawnedBalls = 0;
let settledBalls = 0;
let simulationStep = 0;


const histogram = new UPlotBarGraph({
    values: bins,
    title: "Galton board: observed distribution",
    xLabel: "Bin",
    yLabel: "Balls",
    color: new Colour(0x22aa55),
    labelColor: Colour.White
});

function normalDistribution(x, mean, sigma) {
    return Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma)) /
        Math.sqrt(2 * Math.PI * sigma * sigma);
}

// For ten rows of pins, the number of right/left deflections follows B(10, 0.5).
const binPositions = Array.from({ length: binCount }, (_, index) => index);
const sigma = Math.sqrt(num_nails * 0.5 * 0.5);
const normalCurve = new UPlotGraph({
    dataDefinition: [
        { label: "Bin" },
        { label: "Normal distribution", color: new Colour(0xff4444) }
    ],
    title: "Expected normal distribution",
    xLabel: "Bin",
    yLabel: "Expected balls",
    labelColor: Colour.White
});
normalCurve.graphData[0].push(...binPositions);
normalCurve.graphData[1].push(...binPositions.map(x => num_balls * normalDistribution(x, num_nails / 2, sigma)));

const simulation = new Simulation
    .with({
        htmlDivId: 'galtonBoardContainer',
        viewport: { aspectRatio: '3/4' },
        camera: { fieldOfView: 30, position: new Vec3(0, 0, 38), orthographic: true },
        scene: { backgroundColor: new Colour(0x131313) }
    })
    .bind(new Block({
        position: new Vec3(0, 0, -0.05),
        size: new Vec3(2 * (num_nails + 1.1), num_balls * .1825, .1)
    }).alwaysWith(new Box({ color: new Colour(0x855E42) })))
    .bind(bars.onceWith(ViewsCollection.of(Cylinder).with({ color: new Colour(0xDEB887) })))
    .bind(pins.onceWith(ViewsCollection.of(Sphere).with({ color: new Colour(0xcccccc) })))
    .onStep((_clock, _dt) => {
        simulationStep++;

        // Release balls one by one, so several balls travel through the board simultaneously.
        if (spawnedBalls < num_balls && simulationStep % 5 === 1)
            spawnBall();

        for (const ball of balls) {
            if (ball.settled)
                continue;

            ball.steps++;
            // Keep the spatial step fixed; the slider changes simulation speed, not the physics.
            ball.body.position.y -= stepDistance;
            ball.body.position.x += ball.direction * stepDistance;

            // Match the original VPython sequence: decide the next direction after each 25-step row.
            if (ball.steps % stepsPerRow === 0)
                ball.direction = Math.random() < 0.5 ? -1 : 1;

            if (ball.steps >= totalFallSteps)
                settleBall(ball);
        }
    })
    .append(new Slider("Animation speed ")
        .withRange(new Range(50, 500, 10))
        .withValue(animationSpeedDefault)
        .onInput(value => simulation.atSpeed(value / animationSpeedDefault))
    )
    .addGraph(histogram)
    .addGraph(normalCurve);

function spawnBall() {
    const body = new RadialSymmetricBody({
        position: new Vec3(0, 18, 0),
        radius: 0.3
    });
    const ball = { body, steps: 0, direction: 0, settled: false };
    balls.push(ball);
    spawnedBalls++;

    // Same dynamic model/view binding pattern as the double-slit particle demo.
    simulation.bind(body.alwaysWith(new Sphere({ color: Colour.Yellow })));
}

function settleBall(ball) {
    ball.settled = true;
    settledBalls++;

    const outcome = Math.round((ball.body.position.x + num_nails) / 2);
    const bin = Math.max(0, Math.min(binCount - 1, outcome));
    bins[bin]++;

    // Snap the ball to its discrete outcome and stack it in that bin.
    ball.body.position.x = 2 * bin - num_nails;
    ball.body.position.y = bins[bin] / 2 - num_balls * .175 + 17;

    histogram.updateValues(bins);

    // Keep the count available for debugging and future status UI.
    if (settledBalls === num_balls)
        simulation.setBottomText("All 200 balls have settled");
}

simulation.start();
