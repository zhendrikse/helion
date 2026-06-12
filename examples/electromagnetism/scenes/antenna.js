import { AxialSymmetricBody, OneDimensionalPlaneWave, Simulation, Vec3, Range,
    Cylinder, ElectromagneticWave, ThreeJsRenderer, Slider
} from "../../../src/index.js";

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

const antenna = new AxialSymmetricBody({
    position: new Vec3(0, -lambda, 0),
    axis: new Vec3(0, 2 * lambda, 0),
    radius: 0.5
});

const container= document.getElementById("antennaContainer");
const simulation = Simulation
    .in(container)
    .with(new ThreeJsRenderer({
        cameraPosition: new Vec3(-1, 4, -10).multiplyScalar(5),
        fieldOfView: 25
    }))
    .withHud()
    .withMouseClickEventListener()
    .synchronize(antenna.onceWith(new Cylinder({color: 0xcccc77})))
    .incrementsTimeBy(lambda / OneDimensionalPlaneWave.c / 100.0)
    .onClockTick((clockTime, simulatedTime) => {
        for (let wave of planeWaves)
            wave.propagate(simulatedTime);
    }, 2);

const slit = new Vec3(0, 0, lambda)
for (let wave of planeWaves)
    simulation.synchronize(wave.alwaysWith(new ElectromagneticWave({
        numArrows: 120,
        arrowSize: 0.2,
        scalingFunction: position => 1 / (position.clone().sub(slit).length() + lambda / 10)
    })));

new Slider(container)
    .withLabel("🧲 Field strength: ")
    .addEventListener(event => {
        for (let wave of planeWaves)
            wave.amplitude = event.target.value;
    })
    .withValue(10)
    .withRange(new Range(1, 20, .1));
