import {
    ThreeJsRenderer, HtmlDiv, Canvas, Simulation, Saturn, Vec3, Planets,
} from "../../../../src/index.js";
import {AmbientLight} from "three";

const saturn = Planets.saturn;

const canvas = Canvas.withElementId("saturnCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("saturnCanvasWrapper").contains(canvas))
    .with({
        cameraPosition: new Vec3(1, 1.5, 4).multiplyScalar(.8),
        fieldOfView: 45,
        background: ThreeJsRenderer.Background.STARS,
        scale: 1e-8,
        light: false
    });

renderer.add(new AmbientLight(0xb0b0b0, 1))
Simulation
    .with(renderer)
    .synchronize(saturn.onceWith(new Saturn()))
    .onClockTick()
    .start();


