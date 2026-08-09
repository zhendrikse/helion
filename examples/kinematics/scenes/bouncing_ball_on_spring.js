import {
    RadialSymmetricBody, Simulation, Vec3, Checkbox, Arrow, Sphere, Floor, Helix,
    Slider, Range, UniformGravitationalForce, BondForce, DragForce
} from "../../../src/index.js";

//
// Physics model
//
const floor = new Floor({
    position: new Vec3(0, -1, 0),
    type: Floor.Type.PAVING,
});

const springRestLength = 0.75;
const gravity = new UniformGravitationalForce();
const bondForce = new BondForce({
    restLength: springRestLength,
    k: 225
});
const dragForce = new DragForce(-.1);

const ball = new RadialSymmetricBody({
    position: new Vec3(0, 1.5, 0),
    radius: 0.15,
    mass: 1.5
});

const springBottom = new RadialSymmetricBody({
    fixed: true,
    position: floor.position,
    radius: 0.10
});
const springTop = new RadialSymmetricBody({
    position: floor.position.clone().add(new Vec3(0, springRestLength, 0)),
    radius: 0.10
});
const spring = springBottom.and(springTop);


const hitsSpring = (ball) => ball.position.y < floor.position.y + springRestLength;

const helix = new Helix({
    coils: 15,
    thickness: 0.075,
    color: "yellow"
});
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

Simulation
    .with({
        htmlDivId: "bouncingBallOnSpringContainer",
        cameraPosition: new Vec3(1, 0.4, 2).multiplyScalar(1.7),
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .bind(ball.alwaysWith(sphere))
    .bind(ball.velocityVector.alwaysWith(velocityArrow))
    .bind(ball.accelerationVector.alwaysWith(forceArrow))
    .bind(spring.alwaysWith(helix))
    .runsEvery(1.5e-3)
    .onStep((_, dt) => {
        if (hitsSpring(ball)) {
            springTop.state.position.y = ball.position.y;
            ball.and(springBottom).apply(bondForce);
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
        .withValue(0)
        .on(dragForce)
        .withProperty("dragCoefficient"));



