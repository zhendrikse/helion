import {
    Simulation, CompositeRenderer, Canvas2DRenderer, OneDimensionalComplexPlaneWave2D,
    OneDimensionalComplexPlaneWave, OneDimensionalComplexPlaneWave3D, ThreeJsRenderer, Vec3
} from "../../../src/index.js";

//
// Physics model
//
const planeWave = new OneDimensionalComplexPlaneWave({
    position: new Vec3(-100, 0, 0),
    amplitude: 10,
    omega: -3 * Math.PI,
    lambda: 10 * Math.PI
});

//
// View for 2D canvas
//
const htmlDiv2d = document.getElementById("planeWaveContainer2d");
const renderer2d = Canvas2DRenderer.in(htmlDiv2d);
const waveView2d = new OneDimensionalComplexPlaneWave2D({
    scaleY: 10,
    width: htmlDiv2d.clientWidth,
    height: htmlDiv2d.clientHeight
});

//
// View for 3D canvas
//
const htmlDiv3d = document.getElementById("planeWaveContainer3d");
const renderer3d = ThreeJsRenderer
    .in(htmlDiv3d)
    .with({
        cameraPosition: new Vec3(100, 100, 200),
        fieldOfView: 20
    });

const simulation = Simulation
    .with(new CompositeRenderer([renderer2d, renderer3d]))
    .synchronize(planeWave.alwaysWith(waveView2d))
    .synchronize(planeWave.alwaysWith(new OneDimensionalComplexPlaneWave3D({ numArrows: 100 })))
    .incrementsTimeBy(0.01)
    .onClockTick((clockTime, simulatedTime) => planeWave.propagate(simulatedTime));

//
// Event controller
//
const eventController = new EventController();

const startStopCallback = new CallbackFunction((event) => {
    if (simulation.isRunning) simulation.stop(); else simulation.start();
    event.target.innerText = event.target.innerText === "Pause" ? "Resume" : "Pause";
});
eventController.add(startStopCallback.to(HtmlControl.withElementId("pauseButton").forType("click")));

eventController.attach(HtmlControl
    .withElementId("amplitudeSlider")
    .forType("input")
    .to(planeWave).withProperty("amplitude"));

eventController.attach(HtmlControl
    .withElementId("omegaSlider")
    .forType("input")
    .to(planeWave).withProperty("omega"));

eventController.attach(HtmlControl
    .withElementId("waveNumberSlider")
    .forType("input")
    .to(planeWave).withProperty("k"));

eventController.attach(HtmlControl
    .withElementId("densityPhaseButton")
    .forType("click")
    .to(waveView2d).withProperty("mode"));

eventController.attach(HtmlControl
    .withElementId("realImagButton")
    .forType("click")
    .to(waveView2d).withProperty("mode"));

simulation.start();



