import {
    Simulation, Sun, Vec3, SunView
} from "../../../../src/index.js";

const sun = new Sun();
Simulation
    .with({
        htmlDivId: "sunContainer",
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.3),
        fieldOfView: 45,
        background: Simulation.Background.STARS
    })
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(clockTime => sun.time = clockTime)
    .start();
