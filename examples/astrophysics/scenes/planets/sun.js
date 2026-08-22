import {
    Simulation, Sun, Vec3, SunView, ThreeJsScene
} from "../../../../src/index.js";

const sun = new Sun();
Simulation
    .with({
        htmlDivId: "sunContainer",
        headUpDisplay: {
            enabled: false
        },
        camera: {
            position: new Vec3(5, 7.5, 15).multiplyScalar(.3),
            fieldOfView: 45
        },
        scene: {
            background: ThreeJsScene.Background.STARS
        }
    })
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(clockTime => sun.time = clockTime)
    .start();
