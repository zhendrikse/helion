import {
    Simulation, OneDimensionalComplexPlaneWave, OneDimensionalComplexPlaneWave3D,
    Vec3, Button, Slider, Range
} from "../../../src/index.js";

//
// Physics model
//
const planeWave = new OneDimensionalComplexPlaneWave({
    position: new Vec3(-100, 0, 0),
    amplitude: 10,
    omega: 1.5 * Math.PI,
    lambda: 15 * Math.PI
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
Simulation
    .with({
        htmlDivId: "planeWaveContainer3d",
        camera: {
            position: new Vec3(100, 100, 200),
            fieldOfView: 20
        },
        headUpDisplay: {
            enabled: false
        },
        viewport: {
            aspectRatio: "2/1"
        },
        infoPanel: {
            text: "<strong>Complex plane wave Ψ</strong><br/>" +
                "Each arrow represents the complex value of the wave function at a fixed position $x$.<br/>" +
                "The arrow rotates in the complex plane as time evolves:<br/>" +
                "- <b>z-direction</b>: $Re(\\psi)$<br/>" +
                "- <b>y-direction</b>: $Im(\\psi)$<br/>" +
                "- <b>color</b>: $\\text{phase}(\\psi)$<br/>" +
                "The <b>arrow length is constant</b>, as $|\\psi|$ does not depend on $t$"
        }
    })
    // .synchronize(planeWave.alwaysWith(waveView2d))
    .bind(planeWave.alwaysWith(new OneDimensionalComplexPlaneWave3D({ numArrows: 100 })))
    .runsEvery(0.01)
    .onStep((clock, _) => planeWave.propagate(clock.simulatedTime))
    .append(new Slider("Amplitude: ")
        .on(planeWave)
        .withProperty("amplitude")
        .withValue(10)
        .withRange(new Range(0.5, 20, .1)))
    .append(new Slider("Omega: ")
        .on(planeWave)
        .withProperty("omega")
        .withValue(1.5)
        .withRange(new Range(0, 4, .01)))
    .append(new Slider("Wave number: ")
        .on(planeWave)
        .withProperty("k")
        .withRange(new Range(-.2, .2, .01))
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




