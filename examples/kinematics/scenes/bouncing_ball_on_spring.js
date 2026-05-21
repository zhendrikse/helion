import { Vector3 } from "three";
import { RadialSymmetricBody, Spring , Simulation, Canvas, Overlay, HtmlDiv,
    EventController, HtmlControl, Arrow, Sphere, ThreeJsRenderOptions,
    ThreeJsRenderer, Floor, Helix, Vec3 } from "helion";

//
// Physics model
//
const floor = new Floor({
    position: new Vec3(0, -1, 0),
    type: Floor.Type.PAVING,
});
const spring = new Spring({
    position: new Vec3(0, floor.level, 0),
    axis: new Vec3(0, 0.75, 0),
    radius: 0.125,
    k: 225
});
const springTopAtRest = spring.endPosition;

const ball = new RadialSymmetricBody({
    position: new Vec3(0, 1.5, 0),
    radius: 0.15,
    mass: 1.5
});

const ballHitsSpring = (epsilon=1e-2) => springTopAtRest.clone().sub(ball.position).length() < epsilon;
const gravitationalForce = new Vec3(0, -9.8 * ball.mass, 0);
const netForce = new Vec3();

class PhysicsWorld {
    constructor(ball) {
        this._ball = ball;
        this._damping = 0;
    }

    timeStep(dt) {
        netForce.y = spring.force.y + gravitationalForce.y;
        netForce.y -= this._damping * ball.velocity.y;
        ball.apply(netForce, dt);

        if (ballHitsSpring() || spring.isCompressed)
            spring.axis = spring.positionVectorTo(ball);
    }

    set damping(value) { this._damping = value; }
}

//
// View objects
//
const canvas = Canvas.withElementId("bouncingBallOnSpringCanvas");
const overlay = Overlay.withElementId("bouncingBallOnSpringOverlay");
const canvasWrapper = HtmlDiv.withElementId("bouncingBallOnSpringWrapper").containsBoth(canvas.and(overlay));
const renderer = ThreeJsRenderer
    .on(canvasWrapper)
    .with(new ThreeJsRenderOptions({
    cameraPosition: new Vector3(1, 0.4, 2).multiplyScalar(1.7)
}));

const helix = new Helix({ coils: 15, color: "yellow" });
const sphere = new Sphere({ color: "orange" });
const velocityArrow = new Arrow({ color: "cyan", size: .125 });
const forceArrow = new Arrow({ color: "red", size: .03 });
renderer.synchronize(ball.alwaysWith(sphere));
renderer.synchronize(ball.velocityVector.alwaysWith(velocityArrow));
renderer.synchronize(ball.accelerationVector.alwaysWith(forceArrow));
renderer.synchronize(spring.alwaysWith(helix));
renderer.addObject3D(floor);

const dt = 1.5e-3;
const subSteps = 10;
const world = new PhysicsWorld(ball);
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick((clockTime, simulatedTime) => world.timeStep(dt), subSteps);

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

