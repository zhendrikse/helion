import {
    RadialSymmetricBody, Simulation, Vec3, Sphere, Spring, Trail
} from "../../../src/index.js";


const g = new Vec3(0, -9.8, 0);
const L0 = 2;
const k = 100;

//
// Physics model
//
const ball1 = new RadialSymmetricBody({
    position: new Vec3(0, L0 / 2, 0),
    mass: 5,
    radius: 0.3
});
const ball2 = new RadialSymmetricBody({
    position: new Vec3(0, L0 / 2 - L0 - ball1.mass * g.length() / k, 0),
    mass: 5,
    radius: 0.3
});
const ball3 = new RadialSymmetricBody({
    position: ball2.position.clone().add(new Vec3(L0, 0, 0)),
    mass: 5,
    radius: 0.3
});

const spring = new Spring({
    position: ball1.position,
    axis: ball1.positionVectorTo(ball2),
    k,
    radius: 0.2
});

const onFloor = (ball, floorLevel = 0, epsilon = 1e-1) =>
    ball.position.y - ball.radius <= epsilon + floorLevel;
function iterate(dt) {
    if (onFloor(ball2, -3.5 * L0) || onFloor(ball3, -3.5 * L0))
        return;

    const springLength = ball1.positionVectorTo(ball2);
    const springForce = springLength.clone().normalize().multiplyScalar(-k * (springLength.length() - L0));
    const forceOnBall1 = g.clone().multiplyScalar(ball1.mass).sub(springForce);
    const forceOnBall2 = g.clone().multiplyScalar(ball2.mass).add(springForce);

    ball1.apply(forceOnBall1, dt);
    ball2.apply(forceOnBall2, dt);
    ball3.apply(g.clone().multiplyScalar(ball3.mass), dt);

    spring.position.copy(ball1.position);
    spring.axis.copy(ball1.positionVectorTo(ball2));
}




//
// View
//
const dt = 5000;
const subSteps = 50;
Simulation
    .inHtmlDiv("threeBodyContainer")
    .with({
        cameraPosition: new Vec3(30, 30, 30),
        scale: 1e-9,
        headUpDisplay: true
    })
    .synchronize(bodyA.alwaysWith(new Sphere({ color: "yellow" })))
    .synchronize(bodyA.alwaysWith(new Trail({ maxPoints: 500, color: "yellow" })))
    .synchronize(bodyB.alwaysWith(new Sphere({ color: "cyan" })))
    .synchronize(bodyB.alwaysWith(new Trail({ maxPoints: 500, color: "cyan" })))
    .synchronize(bodyC.alwaysWith(new Sphere({ color: "magenta" })))
    .synchronize(bodyC.alwaysWith(new Trail({ maxPoints: 500, color: "magenta" })))
    .incrementsTimeBy(dt / subSteps)
    .onClockTick((clock) => updateForces(clock.fixedDt), subSteps)
    .withMouseClickEventListener();
