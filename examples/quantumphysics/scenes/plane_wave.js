import {
    Simulation, OneDimensionalComplexPlaneWave, OneDimensionalComplexPlaneWave3D,
    Vec3, Button, Slider, RadioButton, Range
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
// const htmlDiv2d = document.getElementById("planeWaveContainer2d");
// const renderer2d = Canvas2DRenderer.in(htmlDiv2d);
// const waveView2d = new OneDimensionalComplexPlaneWave2D({
//     scaleY: 10,
//     width: htmlDiv2d.clientWidth,
//     height: htmlDiv2d.clientHeight
// });

//
// View for 3D canvas
//
const simulation = Simulation
    .inHtmlDiv("planeWaveContainer3d")
    .with({
        cameraPosition: new Vec3(100, 100, 200),
        fieldOfView: 20
    })
    // .synchronize(planeWave.alwaysWith(waveView2d))
    .synchronize(planeWave.alwaysWith(new OneDimensionalComplexPlaneWave3D({ numArrows: 100 })))
    .incrementsTimeBy(0.01)
    .onClockTick((clockTime, simulatedTime) => planeWave.propagate(simulatedTime))
    .append(new Slider("Amplitude: ")
        .on(planeWave)
        .withProperty("amplitude")
        .withValue(10)
        .withRange(new Range(0.5, 20, .1)))
    .append(new Slider("Omega: ")
        .on(planeWave)
        .withProperty("omega")
        .withValue(3.2)
        .withRange(new Range(0, 25, .1)))
    .append(new Slider("Wave number: ")
        .on(planeWave)
        .withProperty("k")
        .withRange(new Range(-.1, .1, .01))
        .withValue(0.1))
    .start();

// const startStopButton = new Button(htmlDiv2d)
//     .withText("Stop")
//     .addEventListener("click", (event) => {
//         if (simulation.isRunning)
//             simulation.stop();
//         else
//             simulation.start();
//
//         event.target.innerText = event.target.innerText === "Pause" ? "Resume" : "Pause";
//     })
//
// RadioButton.togetherWith(startStopButton)
//     .on(waveView2d)
//     .withProperty("mode")
//     .withLabel("Real/imag ")
//     .withValue("realImag")
//     .checked(true);
//
// RadioButton.togetherWith(startStopButton)
//     .on(waveView2d)
//     .withProperty("mode")
//     .withLabel("Density/phase ")
//     .withValue("densityPhase");




