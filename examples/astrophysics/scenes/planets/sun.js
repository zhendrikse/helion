import {
    ThreeJsRenderer, Simulation, RadialSymmetricBody, Sun, Vec3
} from "../../../../src/index.js";

const sun = new RadialSymmetricBody({
    radius: 1
});

const container = document.getElementById("sunContainer");
const renderer = ThreeJsRenderer
    .in(container)
    .with({
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.3),
        fieldOfView: 45,
        background: ThreeJsRenderer.Background.STARS
    });

Simulation
    .with(renderer)
    .synchronize(sun.alwaysWith(new Sun()))
    .onClockTick()
    .start();


