---
title: "🚀 Getting started"
---

Any simulation is structured as follows:

##### A physics model with properties that have physical meaning only:

```text
Body
 ├── position
 ├── velocity
 ├── acceleration
 ├── mass
 ├── charge
 ├── force
 └── fixed

Block
 ├── size
 └── orientation

RadialSymmetricBody
 └── radius
```

##### Generic view objects visualize model properties:

```text
Sphere          → radius + position
Box             → size + position + orientation
VectorView      → willekeurige Vec3
ConditionalView → zichtbaarheid op basis van model state
BondView        → BodyPair
```

##### Simulations combine model and generic view objects:

```js
simulation.bind(ball.alwaysWith(new Sphere(...)));

simulation.bind(ball.alwaysWith(new VectorView({
    vector: body => body.velocity,
    color: "cyan"
})));

simulation.bind(ball.alwaysWith(new VectorView({
    vector: body => body.force,
    color: "red"
})));
```

## My first simulation
<div class="header_line"></div>

As an example, let's code the three-body problem. First, we start by coding the physics involved:

```js
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

function updateForces(dt) {
    bodyA.and(bodyB).apply(gravitationalForce);
    bodyA.and(bodyC).apply(gravitationalForce);
    bodyB.and(bodyC).apply(gravitationalForce);

    bodyA.integrate(10, Integrators.symplecticEulerStep);
    bodyB.integrate(10, Integrators.symplecticEulerStep);
    bodyC.integrate(10, Integrators.symplecticEulerStep);
}
```

In the simulation, we synchronize the bodies with the view: spheres that leave a trail behind:

```js
const dt = 5000;
const subSteps = 50;
Simulation
    .with({
        htmlDivId: "threeBodyContainer",
        cameraPosition: new Vec3(30, 30, 30),
        scale: 1e-9,
        headUpDisplay: true
    })
    .bind(bodyA.alwaysWith(new Sphere({color: "yellow"})))
    .bind(bodyA.alwaysWith(new Trail({maxPoints: 500, color: "yellow"})))
    .bind(bodyB.alwaysWith(new Sphere({color: "cyan"})))
    .bind(bodyB.alwaysWith(new Trail({maxPoints: 500, color: "cyan"})))
    .bind(bodyC.alwaysWith(new Sphere({color: "magenta"})))
    .bind(bodyC.alwaysWith(new Trail({maxPoints: 500, color: "magenta"})))
    .runsEvery(dt / subSteps)
    .onClockTick((clockTime, simulatedTime) => updateForces(dt), subSteps)
    .withMouseClickEventListener();
```