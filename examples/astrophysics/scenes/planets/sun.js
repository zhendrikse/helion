import {
    Simulation, RadialSymmetricBody, Sun, Vec3
} from "../../../../src/index.js";

const sun = new RadialSymmetricBody({
    radius: 1
});

Simulation
    .inHtmlDiv("sunContainer")
    .with({
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.3),
        fieldOfView: 45,
        background: Simulation.Background.STARS
    })
    .synchronize(sun.alwaysWith(new Sun()))
    .onClockTick()
    .start();
