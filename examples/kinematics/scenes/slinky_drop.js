import {
    RadialSymmetricBody, Simulation, Vec3, Sphere, Spring, Helix, Cylinder, Bond, Floor, Vec2, AxialSymmetricBody
} from "../../../src/index.js";

const g = new Vec3(0, -9.8, 0);
const L0 = 2;
const k = 100;
const shiftUp = 3.5;

//
// Physics model
//
const ball1 = new RadialSymmetricBody({
    position: new Vec3(0, shiftUp + L0 / 2, 0),
    mass: 5,
    radius: 0.3
});
const ball2 = new RadialSymmetricBody({
    position: new Vec3(0, shiftUp + L0 / 2 - L0 - ball1.mass * g.length() / k, 0),
    mass: 5,
    radius: 0.3
});
const ball3 = new RadialSymmetricBody({
    position: ball2.position.clone().add(new Vec3(L0, 0, 0)),
    mass: 5,
    radius: 0.3
});

const bond = Bond.between(ball1.and(ball2), k, 0.2);
bond.restLength = L0;

// Pole + stick
const stick1 = new AxialSymmetricBody({
    position: ball2.position.clone().sub(new Vec3(L0, 2.75 * L0, 0)),
    axis: new Vec3(0, 3 * L0, 0),
    radius: L0 / 15
});
const stick2 = new AxialSymmetricBody({
    position: ball2.position.clone().sub(new Vec3(L0, 0, 0)),
    axis: new Vec3(L0/2, 0, 0),
    radius: L0 / 15
});
////////////////

const onFloor = (ball, floorLevel, epsilon = 2e-2) =>
    ball.position.y - ball.radius <= shiftUp + floorLevel - epsilon;
Simulation
    .with({
        htmlDivId: "slinkyContainer",
        cameraPosition: new Vec3(4, 2, 10).multiplyScalar(1.15),
        headUpDisplay: true,
        fov: 50
    })
    .bind(stick1.onceWith(new Cylinder({ color: 0xbbbbbb})))
    .bind(stick2.onceWith(new Cylinder({ color: 0xbbbbbb})))
    .bind(ball1.alwaysWith(new Sphere({ color: "red" })))
    .bind(ball2.alwaysWith(new Sphere({ color: "green" })))
    .bind(ball3.alwaysWith(new Sphere({ color: "yellow" })))
    .bind(bond.alwaysWith(new Helix({
        color: 0xffff00,
        thickness: 0.015
    })))
    .addObject3D(new Floor({
        position: new Vec3(.5 * L0, -3.5 * L0 + shiftUp, 0),
        planeSizeXy: new Vec2(L0 * 5 , L0 * 3),
        type: Floor.Type.PAVING
    }))
    .runsEvery(0.01)
    .atSpeed(0.25)
    .onStep((_, dt) => {
        if (onFloor(ball2, -3.5 * L0) || onFloor(ball3, -3.5 * L0))
            return;

        const forceOnBall1 = g.clone().multiplyScalar(ball1.mass).sub(bond.force);
        const forceOnBall2 = g.clone().multiplyScalar(ball2.mass).add(bond.force);
        const forceOnBall3 = g.clone().multiplyScalar(ball3.mass);
        ball1.apply(forceOnBall1, dt);
        ball2.apply(forceOnBall2, dt);
        ball3.apply(forceOnBall3, dt);
        bond.synchronize();
    })
    .withMouseClickEventListener();
