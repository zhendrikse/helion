import {Simulation, Saturn, Vec3, Planets, ThreeJsScene} from "../../../../src/index.js";
import {AmbientLight} from "three";

Simulation
    .with({
        htmlDivId: "saturnContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(.8)
        },
        scene: {
            background: ThreeJsScene.Background.STARS,
            scale: 1e-8
        },
        lighting: {
            light: false
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .addObject3D(new AmbientLight(0xb0b0b0, 1))
    .bind(Planets.saturn.onceWith(new Saturn()))
    .start();


