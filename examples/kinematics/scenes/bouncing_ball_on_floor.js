import {EventController, HtmlDiv, UPlotGraph} from "../js/simulation.js";
import { Vector3, Vector2 } from "three";
import { RadialSymmetricBody } from "../js/phys/physics.js";
import { Simulation, Canvas, Overlay } from "../js/simulation.js";
import { Sphere, Floor, ThreeJsRenderOptions, ThreeJsRenderer, Trail } from "../js/renderers/three/threesim.js";

class BouncingBall extends RadialSymmetricBody {
    constructor({position, velocity, radius, mass}) {
        super({position, velocity, radius, mass});
    }

    reachedEnd = () => this.position.x > 2.5;

    liesOnFloor({ floorLevel = 0, epsilon = 1e-1 } = {}) {
        return this.position.y - this.radius <= epsilon + floorLevel;
    }

    bounceOffOfFloor(dt, elasticity=1, epsilon=1e-1) {
        this.velocity.y *= -elasticity;
        this.position.addScaledVector(this.velocity, dt);

        // if the velocity is too slow, stay on the ground
        if (this.velocity.y <= epsilon)
            this.velocity.y = this.radius + this.radius * epsilon;
    }
}

//
// Physics model
//
const ball = new BouncingBall({
    position: new Vector3(-1.5, 1.5, 1.5),
    velocity: new Vector3(.5, 0, -.4),
    radius: 0.1,
    mass: 1
});

const gravitationalForce = new Vector3(0, -9.8 * ball.mass, 0);
function ballStep(dt) {
    ball.apply(gravitationalForce, dt);
    if (ball.liesOnFloor())
        ball.bounceOffOfFloor(dt, 0.9);
}

//
// Attach view models
//
const canvas = Canvas.withElementId("bouncingBallOnFloorCanvas");
const overlay = Overlay.withElementId("bouncingBallOnFloorOverlayText");
const canvasWrapper = HtmlDiv.withElementId("bouncingBallOnFloorWrapper").containsBoth(canvas.and(overlay));
const renderer = ThreeJsRenderer
    .on(canvasWrapper)
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vector3(2, 1, 0.5).multiplyScalar(2.25)
    }));

const sphere = new Sphere({ color: "cyan" });
renderer.add(ball.to(sphere));
renderer.add(ball.to(new Trail({ color: sphere.color})));

renderer.addPlainObject(new Floor({
    type: Floor.Type.GRID,
    planeSizeXy: new Vector2(5, 5),
    opacity: 0.3,
    granularity: 20
}));

//
// Graph
//
const plot = new UPlotGraph({
    plotDiv: document.getElementById("chart"),
    dataDefinition: [
        {label: "t"}, {label: "ball1", color: "blue"},
        { label: "Y-position", color: "cyan" },
        { label: "Kinetic Energy", color: "red" },
        { label: "Potential Energy", color: "green" }
    ],
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    title: "Bouncing ball",
    xLabel: "Simulation time",
    yLabel: "Displacement"
});

function updateGraph(simulatedTime) {
    if (ball.reachedEnd())
        return;
    plot.graphData[0].push(simulatedTime);
    plot.graphData[1].push(ball.position.y);
    plot.graphData[2].push(ball.kineticEnergy);
    plot.graphData[3].push(ball.potentialEnergy);
    plot.update();
}

const dt = 2.5e-3;
const subSteps = 10;
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .run((clockTime, simulatedTime) => {
        if (ball.reachedEnd())
            return;

        ballStep(dt);
    }, subSteps);

// Update graph not inside simulation loop, as we do not want to update it with every physics update substep
simulation.onAfterPhysicsUpdate((clockTime, simulatedTime) => updateGraph(simulatedTime));

//
// Event controller
//
const eventController = new EventController(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas); // Controller passes event on to simulation and renderers
