import {
    RadialSymmetricBody, Spring, Simulation, Vec3, Checkbox, Arrow, Sphere,
    EventController, ThreeJsRenderer, Floor, Helix, Slider, Range
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
const container = document.getElementById("bouncingBallOnSpringContainer");
const renderer = new ThreeJsRenderer(container)
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

const eventController = new EventController(simulation);
eventController.addStartStopMouseClickEventListener();

const velocityArrowCheckbox = new Checkbox(container)
    .on(velocityArrow)
    .withProperty("visible")
    .withLabel("🚀 Velocity: ")
    .checked(true);

Checkbox.togetherWith(velocityArrowCheckbox)
    .on(forceArrow)
    .withProperty("visible")
    .withLabel("💪🏻 Force: ")
    .checked(true);

new Slider(container)
    .withRange(new Range(0, 1, 0.01))
    .withValue(0.2)
    .on(world)
    .withProperty("damping")
    .withLabel("🍃 Air resistance: ");

//
// Event controller
//
//
// eventController.attach(HtmlControl
//     .withElementId("dampingSlider")
//     .forType("input")
//     .to(world)
//     .withProperty("damping"));

