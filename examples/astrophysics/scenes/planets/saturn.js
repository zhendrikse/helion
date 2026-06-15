import { Simulation, Saturn, Vec3, Planets } from "../../../../src/index.js";
import {AmbientLight} from "three";

Simulation
    .with({
        htmlDivId: "saturnContainer",
        cameraPosition: new Vec3(1, 1.5, 4).multiplyScalar(.8),
        fieldOfView: 45,
        background: Simulation.Background.STARS,
        scale: 1e-8,
        light: false
    })
    .addObject3D(new AmbientLight(0xb0b0b0, 1))
    .synchronize(Planets.saturn.onceWith(new Saturn()))
    .onClockTick()
    .start();


