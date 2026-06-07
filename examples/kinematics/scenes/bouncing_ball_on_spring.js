import {
    RadialSymmetricBody, Spring, Simulation, Canvas, Overlay, HtmlDiv,
    EventController, HtmlControl, Arrow, Sphere, ThreeJsRenderer, Floor, Helix, Vec3
} from "../../../src/index.js";

//
// Physics model
//
const netForce = new Vec3();
const floor = new Floor({
    position: new Vec3(0, -1, 0),
    type: Floor.Type.PAVING,
});

class PhysicsWorld {
    constructor(ball) {
        this._ball = ball;
        this._damping = 0;
        this._spring = new Spring({
            position: new Vec3(0, floor.level, 0),
            axis: new Vec3(0, 0.75, 0),
            radius: 0.125,
            k: 225
        });
        this._springTopAtRest = this._spring.endPosition;
    }

    _ballHitsSpring = (epsilon = 1e-2) =>
        this._springTopAtRest.clone().sub(this._ball.position).length() < epsilon;

    timeStep(dt) {
        netForce.y = -9.8 * this._ball.mass + this._spring.force.y;
        netForce.y -= this._damping * this._ball.velocity.y;
        this._ball.apply(netForce, dt);

        if (this._ballHitsSpring() || this._spring.isCompressed)
            this._spring.axis = this._spring.positionVectorTo(this._ball);
    }

    get ball() { return this._ball; }
    get spring() { return this._spring; }

    set damping(value) { this._damping = value; }
}

const world = new PhysicsWorld(new RadialSymmetricBody({
    position: new Vec3(0, 1.5, 0),
    radius: 0.15,
    mass: 1.5
}));

//
// View objects
//
const canvas = Canvas.withElementId("bouncingBallOnSpringCanvas");
const overlay = Overlay.withElementId("bouncingBallOnSpringOverlay");
const canvasWrapper = HtmlDiv.withElementId("bouncingBallOnSpringWrapper").containsBoth(canvas.and(overlay));
const renderer = ThreeJsRenderer
    .on(canvasWrapper)
    .with({
        cameraPosition: new Vec3(1, 0.4, 2).multiplyScalar(1.7)
    });

const helix = new Helix({ coils: 15, color: "yellow" });
const sphere = new Sphere({ color: "orange" });
const velocityArrow = new Arrow({
    color: "cyan",
    size: .1,
    magnitudeMap: mag => mag * .1
});
const forceArrow = new Arrow({
    color: "red",
    size: .1,
    magnitudeMap: mag => mag * 2.5e-2
});

const dt = 1.5e-3;
const subSteps = 10;
const simulation = Simulation
    .with(renderer)
    .synchronize(world.ball.alwaysWith(sphere))
    .synchronize(world.ball.velocityVector.alwaysWith(velocityArrow))
    .synchronize(world.ball.accelerationVector.alwaysWith(forceArrow))
    .synchronize(world.spring.alwaysWith(helix))
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => world.timeStep(dt), subSteps);

renderer.add(floor);

//
// Event controller
//
const eventController = new EventController(simulation);
eventController.addStartStopMouseClickEventListenerTo(canvas); // Controller passes event on to simulation and renderers

eventController.attach(HtmlControl
    .withElementId("velocityArrow")
    .forType("click")
    .to(velocityArrow)
    .withProperty("visible"));

eventController.attach(HtmlControl
    .withElementId("forceArrow")
    .forType("click")
    .to(forceArrow)
    .withProperty("visible"));

eventController.attach(HtmlControl
    .withElementId("dampingSlider")
    .forType("input")
    .to(world)
    .withProperty("damping"));

