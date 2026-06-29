import {
    Simulation, RadialSymmetricBody, Sun, Vec3
} from "../../../../src/index.js";

const sun = new RadialSymmetricBody({
    radius: 1
});

Simulation
    .with({
        htmlDivId: "sunContainer",
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.3),
        fieldOfView: 45,
        background: Simulation.Background.STARS
    })
    .bind(sun.alwaysWith(new Sun()))
    .start();
