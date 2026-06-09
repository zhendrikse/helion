import {
    ThreeJsRenderer, HtmlDiv, Canvas, Simulation, RadialSymmetricBody, Saturn, Vec3, Planets,
} from "../../../../src/index.js";

const saturn = Planets.saturn;

const canvas = Canvas.withElementId("saturnCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("saturnCanvasWrapper").contains(canvas))
    .with({
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.25),
        fieldOfView: 45,
        background: ThreeJsRenderer.Background.STARS,
        scale: 1e-8
    });

Simulation
    .with(renderer)
    .synchronize(saturn.onceWith(new Saturn()))
    .onClockTick()
    .start();


