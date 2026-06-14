import { Vector2 } from "three";
import {
    RadialSymmetricBody, Simulation, Sphere, Floor, Vec3, Trail, UPlotGraph, G
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
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

const ball = new BouncingBall({
    position: new Vec3(-1.5, 1.5, 1.5),
    velocity: new Vec3(.5, 0, -.4),
    radius: 0.1,
    mass: 1
});

const gravitationalForce = new Vec3(0, -9.8 * ball.mass, 0);
function ballStep(dt) {
    ball.apply(gravitationalForce, dt);
    if (ball.liesOnFloor())
        ball.bounceOffOfFloor(dt, 0.9);
}

const dt = 2.5e-3;
const subSteps = 10;
const sphere = new Sphere({ color: "cyan" });
const containerDiv = document.getElementById("bouncingBallContainer");
Simulation
    .in(containerDiv)
    .with({
        cameraPosition: new Vec3(2, 1, 0.5).multiplyScalar(2.25)
    })
    .withHud()
    .withMouseClickEventListener()
    .synchronize(ball.alwaysWith(sphere))
    .synchronize(ball.alwaysWith(new Trail({ color: sphere.color})))
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => {
        if (ball.reachedEnd())
            return;

        ballStep(dt);
    }, subSteps)
    .onAfterClockTick((clockTime, simulatedTime) => updateGraph(simulatedTime))
    .addObject3D(new Floor({
        type: Floor.Type.GRID,
        planeSizeXy: new Vector2(5, 5),
        opacity: 0.3,
        granularity: 20
    }));

//
// Graph
//
const plot = new UPlotGraph({
    plotParentDiv: containerDiv,
    dataDefinition: [
        {label: "t"}, {label: "ball1", color: "blue"},
        { label: "Y-position", color: "cyan" },
        { label: "Kinetic Energy", color: "red" },
        { label: "Potential Energy", color: "green" }
    ],
    width: containerDiv.clientWidth,
    height: containerDiv.clientHeight * .5,
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
    plot.graphData[3].push(ball.mass * G * ball.position.y);
    plot.update();
}

