import {
    Integrators, RadialSymmetricBody, G, Simulation, Vec3, Sphere, Trail, Gravity
} from "../../../src/index.js";

//
// Physics model
//
const astronomical_unit = 1.49e11;
const mass = 1e30;
const radiusA = 0.1 * astronomical_unit;
const radiusB = radiusA / 0.8;
const velocityA = Math.sqrt(G * 0.8 * mass * radiusA) / (radiusA + radiusB);

const radius = 1.9e9;
const bodyA = new RadialSymmetricBody({
    position: new Vec3(radiusA, 0, 0),
    velocity: new Vec3(0, velocityA, 0),
    radius,
    mass
});

const bodyB = new RadialSymmetricBody({
    position: new Vec3(-radiusB, 0, 0),
    velocity: new Vec3(0, -velocityA / 0.8, 0),
    radius,
    mass: mass * 0.8
});

const bodyC = new RadialSymmetricBody({
    position: new Vec3(0, 0, radiusA),
    velocity: new Vec3(0, 0, 0),
    radius,
    mass: mass * 0.5
});

const gravity = new Gravity();

//
// Simulation binds view to model
//
Simulation
    .with({
        htmlDivId: "threeBodyContainer",
        cameraPosition: new Vec3(30, 30, 30),
        scale: 1e-9,
        headUpDisplay: true
    })
    .bind(bodyA.alwaysWith(new Sphere({ color: "yellow" })))
    .bind(bodyA.alwaysWith(new Trail({ maxPoints: 500, color: "yellow" })))
    .bind(bodyB.alwaysWith(new Sphere({ color: "cyan" })))
    .bind(bodyB.alwaysWith(new Trail({ maxPoints: 500, color: "cyan" })))
    .bind(bodyC.alwaysWith(new Sphere({ color: "magenta" })))
    .bind(bodyC.alwaysWith(new Trail({ maxPoints: 500, color: "magenta" })))
    .maxOutCpu(_ => {
        bodyA.and(bodyB).apply(gravity);
        bodyA.and(bodyC).apply(gravity);
        bodyB.and(bodyC).apply(gravity);

        bodyA.integrate(10, Integrators.symplecticEulerStep);
        bodyB.integrate(10, Integrators.symplecticEulerStep);
        bodyC.integrate(10, Integrators.symplecticEulerStep);
    }, 30, 1000)
    .withMouseClickEventListener();
