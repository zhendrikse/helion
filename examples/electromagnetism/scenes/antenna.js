import { Vector3, Color } from "three";
import { AxialSymmetricBody, OneDimensionalPlaneWave, Simulation, Canvas, HtmlDiv,
    EventController, HtmlControl, Cylinder, ElectromagneticWave, ThreeJsRenderOptions,
    ThreeJsRenderer, Vec3
} from "helion";

//
// Physics model
//
const lambda = 2.0;  // 1e-10

const range = [];
for (let theta = 0; theta < 2 * Math.PI; theta += Math.PI / 3)
    range.push(new Vec3(Math.cos(theta), 0, Math.sin(theta)).multiplyScalar(lambda));

const planeWaves = [];
for (let position of range)
    planeWaves.push(new OneDimensionalPlaneWave({
        position,
        lambda,
        amplitude: 7.5
    }));

//
// View
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vector3(-1, 4, -9).multiplyScalar(2.5),
    fieldOfView: 25
});
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("antennaCanvasWrapper").contains(Canvas.withElementId("antennaCanvas")))
    .with(threeJsRendererOptions);

const slit = new Vec3(0, 0, lambda)
for (let wave of planeWaves)
    renderer.synchronize(wave.alwaysWith(new ElectromagneticWave({
        numArrows: 120,
        arrowSize: 0.5,
        scalingFunction: position => 1 / (position.clone().sub(slit).length() + lambda / 10)
    })));

const antenna = new AxialSymmetricBody({
    position: new Vec3(0, -lambda, 0),
    axis: new Vec3(0, 2 * lambda, 0),
    radius: 0.5
});
renderer.synchronize(antenna.onceWith(new Cylinder({color: new Color(0.7, 0.7, 0.7)})));

//
// Event controller
//
const eventController = new EventController();
for (let wave of planeWaves)
    eventController.attach(HtmlControl
        .withElementId("antennaFieldStrengthSlider")
        .forType("input")
        .withValueSpanId("antennaFieldStrengthSliderValue")
        .to(wave)
        .withProperty("amplitude"));

Simulation
    .with(renderer)
    .incrementsTimeBy(lambda / OneDimensionalPlaneWave.c / 100.0)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => {
        for (let wave of planeWaves)
            wave.propagate(simulatedTime);
    }, 2)
    .start();

// Only needed for development with Vite //
export function createAntennaScene() {
    return { run() {}, stop() { } };
}
//////////////////////////////////////////
