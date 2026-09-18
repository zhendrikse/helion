import {
    Integrators, RadialSymmetricBody, G, Simulation, Vec3, Sphere, Trail, GravitationalForce, Colour} from "../../../src/index.js";

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

const gravitationalForce = new GravitationalForce();

//
// Simulation binds view to model
//
Simulation
    .with({
        htmlDivId: "threeBodyContainer",
        camera: {
            position: new Vec3(30, 30, 30),
        },
        scene: {
            scale: 1e-9
        }
    })
    .bind(bodyA.alwaysWith(new Sphere({ color: Colour.Yellow })))
    .bind(bodyA.alwaysWith(new Trail({ maxPoints: 500, color: Colour.Yellow })))
    .bind(bodyB.alwaysWith(new Sphere({ color: Colour.Cyan })))
    .bind(bodyB.alwaysWith(new Trail({ maxPoints: 500, color: Colour.Cyan })))
    .bind(bodyC.alwaysWith(new Sphere({ color: Colour.fromHex(0xff00ff) })))
    .bind(bodyC.alwaysWith(new Trail({ maxPoints: 500, color: Colour.fromHex(0xff00ff) })))
    .maxOutCpu(_ => {
        bodyA.and(bodyB).apply(gravitationalForce);
        bodyA.and(bodyC).apply(gravitationalForce);
        bodyB.and(bodyC).apply(gravitationalForce);

        bodyA.integrate(10, Integrators.symplecticEulerStep);
        bodyB.integrate(10, Integrators.symplecticEulerStep);
        bodyC.integrate(10, Integrators.symplecticEulerStep);
    }, 30, 1000)
    .withMouseClickEventListener();
