import {
    ThreeJsRenderer, HtmlDiv, Canvas, Simulation, RadialSymmetricBody, Sun, Vec3
} from "../../../src/index.js";

const sun = new RadialSymmetricBody({
    radius: 1
});

const canvas = Canvas.withElementId("planetsCanvas");
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("planetsCanvasWrapper").contains(canvas))
    .with({
        cameraPosition: new Vec3(5, 7.5, 15).multiplyScalar(.3),
        fieldOfView: 45,
        background: ThreeJsRenderer.Background.STARS
    });

const simulation = Simulation
    .with(renderer)
    .synchronize(sun.alwaysWith(new Sun()))
    .onClockTick()
    .start();


