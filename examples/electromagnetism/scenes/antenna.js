import {
    AxialSymmetricBody, Simulation, Vec3, Range, Cylinder, ElectromagneticWave, Slider, Colour, PlaneWave1D
} from '../../../src/index.js';

//
// Physics model
//
const lambda = 2.0;  // 1e-10
const c = 3e8;

/** @type {Vec3[]} */
const range = [];
/** @type {PlaneWave1D[]} */
const planeWaves = [];
for (let theta = 0; theta < 2 * Math.PI; theta += Math.PI / 3) {
    range.push(new Vec3(Math.cos(theta), 0, Math.sin(theta)).multiplyScalar(lambda));
    planeWaves.push(new PlaneWave1D(7.5, lambda, 2 * Math.PI * c / lambda));
}

const antenna = new AxialSymmetricBody({
    position: new Vec3(0, -lambda, 0),
    axis: new Vec3(0, 2 * lambda, 0),
    radius: 0.5
});

const simulation = Simulation
    .with({
        htmlDivId: 'antennaContainer',
        camera: {
            position: new Vec3(-1, 4, -10).multiplyScalar(5),
            fieldOfView: 25
        }
    })
    .withMouseClickEventListener()
    .runsEvery(1e-2)
    .advancesBy(lambda / c / 100.0)
    .bind(antenna.onceWith(new Cylinder({color: new Colour(0xcccc77) })))
    .onStep((clock, _) => {
        for (let wave of planeWaves)
            wave.time = clock.simulatedTime;
    })
    .append(new Slider('🧲 Field strength: ')
        .withValue(10)
        .withRange(new Range(1, 20, .1))
        .onInput(event => {
            for (let wave of planeWaves)
                // @ts-ignore
                wave.amplitude = event.target.value;
        })
    );

const slit = new Vec3(0, 0, lambda);
planeWaves.forEach((wave, index) =>
    simulation.bind(wave.alwaysWith(new ElectromagneticWave({
        position: range[index],
        numArrows: 120,
        arrowSize: 0.125,
        arrowDistance: lambda * 0.1,
        scalingFunction: position => 1 / (position.clone().sub(slit).length() + lambda * .1)
    }))));
