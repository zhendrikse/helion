import { Vector2 } from "three";
import {
    EventController, HtmlDiv, UPlotGraph, RadialSymmetricBody, Vec3, HarmonicOscillator,
    Simulation, Canvas, Overlay, Sphere, ThreeJsRenderer, Helix, Floor
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
function createBallsAndSprings(numBalls = 5, k = 300) {
    const balls = [];
    const springs = [];

    for (let i = 0; i < numBalls; i++) {
        balls.push(new RadialSymmetricBody({
            position: new Vec3(i * 10 - 30, 3, 0),
            radius: 1,
            mass: 1.5
        }));
        if (i !== 0)
            springs.push(HarmonicOscillator.between(balls[i - 1].and(balls[i]), k, 0.5));
    }

    return { balls, springs };
}

function initialDisturbance(displacement = 5) {
    balls[0].position.add(new Vec3(displacement, 0, 0));
    springs[0].bond.position.copy(balls[0].position);
}

const { balls, springs } = createBallsAndSprings();
initialDisturbance(7);

//
// Renderer & simulation
//
const canvas = Canvas.withElementId("oscillatorCanvas");
const overlay = Overlay.withElementId("oscillatorOverlay");
const renderer = ThreeJsRenderer.on(
    HtmlDiv.withElementId("oscillatorCanvasWrapper")
        .containsBoth(canvas.and(overlay)))
    .with({
        cameraPosition: new Vec3(17, 6, 17),
        light: true,
        shadowsEnabled: true,
        fieldOfView: 45,
        background: ThreeJsRenderer.Background.FOG
    });


const dt = 1e-3;
const subSteps = 10;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, _) => {
        for (let i = 0; i < balls.length - 1; i++)
            springs[i].oscillate(dt);

        plot.graphData[0].push(clockTime * 0.001);
        for (let i = 0; i < balls.length; i++)
            plot.graphData[i + 1].push(balls[i].position.x);
    }, subSteps);
simulation.onAfterClockTick((clockTime, simulatedTime) => plot.update());
simulation.onReset(() => {
    plot.graphData[0] = [0];
    for (let i = 0; i < balls.length; i++)
        plot.graphData[i + 1] = [balls[i].position.x];
});

//
// View
//
renderer.add(new Floor({
    type: Floor.Type.WOOD_WICKER,
    planeSizeXy: new Vector2(200, 200),
    granularity: 5
}));

// Attach spheres and helices to balls and springs
for (let i = 0; i < balls.length; i++) {
    const color = i === 0 || i === balls.length - 1 ? 0x3333ff : 0xff0000;
    const sphere = new Sphere({ color, castShadow: true });
    simulation.synchronize(balls[i].alwaysWith(sphere));
    if (i === 0)
        continue;

    const helix = new Helix({
        thickness: 0.075,
        coils: 30,
        color: 0xffff4d,
        castShadow: true
    });
    simulation.synchronize(springs[i - 1].alwaysWith(helix));
}

//
// Graph
//
const plot = new UPlotGraph({
    plotDiv: document.getElementById("oscillatorPlot"),
    dataDefinition: [
        { label: "t" }, { label: "ball1", color: "blue" },
        { label: "ball2", color: "red" },
        { label: "ball3", color: "red" },
        { label: "ball4", color: "red" },
        { label: "ball5", color: "blue" },
    ],
    width: canvas.clientWidth,
    height: canvas.clientHeight * 1.5,
    title: "Kinetic Energy vs Time",
    xLabel: "Time [s]",
    yLabel: "Displacement"
});

const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas);
