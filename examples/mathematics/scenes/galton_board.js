import {
    Simulation, AxialSymmetricBody, ModelObjectsCollection, Cylinder, Sphere, RadialSymmetricBody, Vec3, ViewsCollection,
    Colour, Block, Box, Range, Slider, UPlotGraph, normalDistribution
} from '../../../src/index.js';
import uPlot from 'uplot';

const num_nails = 10;
const num_balls = 200;
const binCount = num_nails + 1;
const stepsPerRow = 25;
const animationSpeedDefault = 200;
const stepDistance = 0.04;
const totalPinSteps = stepsPerRow * (num_nails + 1);
const totalFallSteps = totalPinSteps + stepsPerRow * 2;

const bars = new ModelObjectsCollection()
    .add(new AxialSymmetricBody({ // Left
        position: new Vec3(-1 - num_nails, 19.75, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.2
    }))
    .add(new AxialSymmetricBody({ // Right
        position: new Vec3(num_nails + 1, 19.75, 0),
        axis: new Vec3(0, -.1825 * num_balls, 0),
        radius: 0.2
    }))
    .add(new AxialSymmetricBody({ // Bottom
        position: new Vec3(-num_nails - 1, 18.25 - .175 * num_balls, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.2
    }))
    .add(new AxialSymmetricBody({ // Top
        position: new Vec3(-num_nails - 1, 19.75, 0),
        axis: new Vec3(22, 0, 0),
        radius: 0.2
    }));

const pins = new ModelObjectsCollection();
for (let i = 0; i < num_nails; i++) {
    bars.add(new AxialSymmetricBody({
        position: new Vec3(i + .5 - num_nails / 2, 4.1, 0).multiplyScalar(2),
        axis: new Vec3(0, -.125 * num_balls, 0),
        radius: 0.2
    }));

    for (let j = -i; j < i + 1; j += 2)
        pins.add(new AxialSymmetricBody({
            position: new Vec3(j, 18.2 - i, 0),
            radius: 0.2,
            axis: new Vec3(0, 0, 0.5),
        }));
}

const bins = Array(binCount).fill(0);
const balls = /** @type {{ body: RadialSymmetricBody, steps: number, direction: number, settled: boolean }[]} */ ([]);
let spawnedBalls = 0;
let settledBalls = 0;
let simulationStep = 0;

// Plot the measured histogram and theoretical normal curve on the same axes.
const binPositions = Array.from({ length: binCount }, (_, index) => index);
const sigma = Math.sqrt(num_nails * 0.5 * 0.5);
const normalValues = binPositions.map(x => num_balls * normalDistribution(x, num_nails / 2, sigma));
const histogram = new UPlotGraph({
    dataDefinition: [
        { label: 'Bin' },
        { label: 'Observed distribution', color: new Colour(0x22aa55), fill: new Colour(0x22aa55) },
        { label: 'Normal distribution', color: new Colour(0xff4444) }
    ],
    title: 'Galton board: observed and theoretical distributions',
    xLabel: 'Bin',
    yLabel: 'Balls',
    labelColor: Colour.White
});
// Use bars for the observed counts and retain a line for the normal approximation.
histogram._uPlotOptionsArgs[6][1].paths = uPlot.paths.bars({ size: [0.7, Infinity] });
histogram.graphData[0].push(...binPositions);
histogram.graphData[1].push(...bins);
histogram.graphData[2].push(...normalValues);

const simulation = Simulation
    .with({
        htmlDivId: 'galtonBoardContainer',
        headUpDisplay: false,
        viewport: { aspectRatio: '3/4' },
        camera: { fieldOfView: 30, position: new Vec3(0, -32, 56) }
    })
    .bind(new Block({
        position: new Vec3(0, 1.5, -0.3),
        size: new Vec3(2 * (num_nails + 1.1), num_balls * .1825, .1)
    }).alwaysWith(new Box({ color: new Colour(0x855E42) })))
    .bind(bars.onceWith(ViewsCollection.of(Cylinder).with({ color: new Colour(0xDEB887) })))
    .bind(pins.onceWith(ViewsCollection.of(Cylinder).with({ color: new Colour(0xDEB887) })))
    .runsEvery(0.01)
    .onStep((_clock, _dt) => {
        simulationStep++;

        // Release balls one by one, so several balls travel through the board simultaneously.
        if (spawnedBalls < num_balls && simulationStep % 50 === 1)
            spawnBall();

        for (const ball of balls) {
            if (ball.settled)
                continue;

            ball.steps++;
            // Keep the spatial step fixed; the slider changes simulation speed, not the physics.
            ball.body.position.y -= stepDistance;
            ball.body.position.x += ball.steps > totalPinSteps ? 0 : ball.direction * stepDistance;

            // Match the original VPython sequence: decide the next direction after each 25-step row.
            if (ball.steps % stepsPerRow === 0)
                ball.direction = Math.random() < 0.5 ? -1 : 1;

            if (ball.steps >= totalFallSteps)
                settleBall(ball);
        }
    })
    .append(new Slider('Animation speed ')
        .withRange(new Range(50, 500, 10))
        .withValue(animationSpeedDefault)
        .onInput(value => simulation.atSpeed(value / animationSpeedDefault))
    )
    .addGraph(histogram)
    .start();

function spawnBall() {
    const body = new RadialSymmetricBody({
        position: new Vec3(0, 19.5, 0),
        radius: 0.3
    });
    const ball = { body, steps: 0, direction: 0, settled: false };
    balls.push(ball);
    spawnedBalls++;

    // Same dynamic model/view binding pattern as the double-slit particle demo.
    simulation.bind(body.alwaysWith(new Sphere({ color: Colour.Green })));
    simulation.setHtmlTitle(`Ball ${spawnedBalls} of ${num_balls}`)
}

function settleBall(ball) {
    ball.settled = true;
    settledBalls++;

    const outcome = Math.round((ball.body.position.x + num_nails) / 2);
    const bin = Math.max(0, Math.min(binCount - 1, outcome));
    bins[bin]++;

    // Snap the ball to its discrete outcome and stack it in that bin.
    ball.body.position.x = 2 * bin - num_nails;
    ball.body.position.y = bins[bin] / 2.5 - num_balls * .175 + 18.25;
    histogram.graphData[1][bin] = bins[bin];
    histogram.update();
}
