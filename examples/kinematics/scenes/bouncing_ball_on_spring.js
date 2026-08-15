import {
    RadialSymmetricBody, Simulation, Vec3, Checkbox, Arrow, Sphere, Floor, Helix,
    Slider, Range, UniformGravitationalForce, SpringForce, DragForce, Body, BodyPair, VectorView
} from "../../../src/index.js";
import {MathPhysicsModelBehavior} from "../../../src/core/helion.js";

//
// Physics model
//
const floor = new Floor({
    position: new Vec3(0, -1, 0),
    type: Floor.Type.PAVING,
});

const springRestLength = 0.75;
const gravity = new UniformGravitationalForce();
const dragForce = new DragForce(-.1);

const ball = new RadialSymmetricBody({
    position: new Vec3(0, 1.5, 0),
    radius: 0.15,
    mass: 1.5
});

class Spring extends BodyPair {
    constructor({
        position = new Vec3(),
        axis = new Vec3(0, 1, 0)
    } = {}) {
        super(
            new Body({ position: position.clone() }),
            new Body({ position: position.clone().add(axis) })
        );
        this._bondForce = new SpringForce({
            restLength: axis.length(),
            k: 225
        });
    }

    get force() { return this._bondForce; }
}

const hitsSpring = (ball) => ball.position.y < floor.position.y + springRestLength;
const spring = new Spring({
    position: floor.position,
    axis: new Vec3(0, springRestLength, 0),
});

const helix = new Helix({
    coils: 15,
    thickness: 0.075,
    color: "yellow",
    radiusFunction: () => 0.1
});
const sphere = new Sphere({ color: "orange" });
const velocityArrow = new Arrow({
    color: "cyan",
    size: .1,
    magnitudeMap: mag => mag * .1
});

const velocityView = new VectorView({
    vectorProperty: body => body.velocity,
    color: "cyan",
    size: 0.1,
    magnitudeMap: mag => mag * 0.15
});

const forceArrow = new VectorView({
    vectorProperty: body => body.acceleration,
    color: "red",
    size: 0.1,
    magnitudeMap: mag => mag * .025
});

Simulation
    .with({
        htmlDivId: "bouncingBallOnSpringContainer",
        cameraPosition: new Vec3(1, 0.4, 2).multiplyScalar(1.7),
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .bind(ball.alwaysWith(sphere))
    .bind(ball.alwaysWith(velocityView))
    .bind(ball.alwaysWith(forceArrow))
    .bind(spring.alwaysWith(helix))
    .runsEvery(2e-3)
    .substeps(2)
    .advancesBy(1e-3)
    .onStep((_, dt) => {
        if (hitsSpring(ball)) {
            spring.body2.state.position.y = ball.position.y;
            ball.and(spring.body1).apply(spring.force);
        }
        ball.apply(gravity);
        ball.apply(dragForce);
        ball.integrate(dt);
    })
    .addObject3D(floor)
    .append(new Checkbox("🚀 Velocity: ")
        .on(velocityArrow)
        .withProperty("visible")
        .checked(true)
        .togetherWith(new Checkbox("💪🏻 Force: ")
            .on(forceArrow)
            .withProperty("visible")
            .checked(true)))
    .append(new Slider("🍃 Air resistance: ")
        .withRange(new Range(-1, 0, 0.01))
        .withValue(dragForce.dragCoefficient)
        .on(dragForce)
        .withProperty("dragCoefficient"));



