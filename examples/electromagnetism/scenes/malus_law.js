import {
    AxialSymmetricBody, Simulation, Vec3, Range, Cylinder,
    ElectromagneticWave, Slider, Colour, ModelObject, Arrow, VectorModel
} from '../../../src/index.js';

const wavelength = 1.2;
const angularFrequency = 2 * Math.PI;

class MalusWave extends ModelObject {
    constructor(amplitude = 1) {
        super();
        this.amplitude = amplitude;
        this.time = 0;
    }

    sample(x) {
        return this.amplitude * Math.cos(2 * Math.PI * x / wavelength - angularFrequency * this.time);
    }
}

// ElectromagneticWave normally draws its electric field along y. This small
// specialization rotates the E-field in the yz-plane while the wave travels
// along x, and keeps B perpendicular to both k and E.
class PolarizedElectromagneticWave extends ElectromagneticWave {
    constructor(options) {
        super(options);
        this._polarizationAngle = 0;
    }

    set polarizationAngle(angle) { this._polarizationAngle = angle; }

    _updateFieldVectorsAt(index, wave) {
        const electric = this._electricFieldVectors[index];
        const magnitude = this._scalingFunction(electric.position) *
            wave.sample(this._arrowDistance * index);

        electric.axis.set(
            0,
            magnitude * Math.cos(this._polarizationAngle),
            magnitude * Math.sin(this._polarizationAngle)
        );

        this._magneticFieldVectors[index].axis
            .copy(this._i_hat)
            .cross(electric.axis);
    }
}

const incomingWave = new MalusWave(1);
const polarizedWave = new MalusWave(1);
const transmittedWave = new MalusWave(1);

// The incoming light is modelled as unpolarized: its instantaneous linear
// polarization direction wanders continuously. The first polarizer selects
// one fixed direction; the analyzer angle is relative to that direction.
let polarizerAngle = Math.PI / 4;
let analyzerAngle = 0;
let incomingPolarizationAngle = 0;

const waveViewOptions = {
    numArrows: 35,
    arrowSize: 0.075,
    arrowDistance: 0.1,
    scalingFunction: () => 1.5
};

const incomingView = new PolarizedElectromagneticWave({
    ...waveViewOptions,
    position: new Vec3(0.5, 0, 0)
});
const polarizedView = new PolarizedElectromagneticWave({
    ...waveViewOptions,
    position: new Vec3(5.0, 0, 0)
});
const transmittedView = new PolarizedElectromagneticWave({
    ...waveViewOptions,
    position: new Vec3(9.7, 0, 0)
});

const polarizerAxis = new VectorModel(new Vec3(4.5, 0, 0), new Vec3(0, 2.25, 0));
const analyzerAxis = new VectorModel(new Vec3(9.2, 0, 0), new Vec3(0, 2.25, 0));

const polarizer = new AxialSymmetricBody({
    position: new Vec3(4.43, 0, 0),
    axis: new Vec3(0.14, 0, 0),
    radius: 1.5
});
const analyzer = new AxialSymmetricBody({
    position: new Vec3(9.13, 0, 0),
    axis: new Vec3(0.14, 0, 0),
    radius: 1.5
});

const simulation = Simulation
    .with({
        htmlDivId: 'malusLawContainer',
        camera: {
            position: new Vec3(25, 5, 20).multiplyScalar(0.55),
            target: new Vec3(8, 0, 0),
            fieldOfView: 34
        },
        viewport: {
            aspectRatio: '19 / 12',
            parameterMenuCollapsed: false
        }
    })
    .withMouseClickEventListener()
    .runsEvery(2e-2)
    .advancesBy(0.025)
    .bind(incomingWave.alwaysWith(incomingView))
    .bind(polarizedWave.alwaysWith(polarizedView))
    .bind(transmittedWave.alwaysWith(transmittedView))
    .bind(polarizer.onceWith(new Cylinder({
        color: new Colour(0x44aaff),
        opacity: 0.32
    })))
    .bind(analyzer.onceWith(new Cylinder({
        color: new Colour(0xffaa44),
        opacity: 0.32
    })))
    .bind(polarizerAxis.alwaysWith(new Arrow({
        color: Colour.White,
        size: 0.2,
        round: true
    })))
    .bind(analyzerAxis.alwaysWith(new Arrow({
        color: Colour.White,
        size: 0.2
    })))
    .append(new Slider('First polarizer angle α: ')
        .withUnits('°')
        .withValue(45)
        .withRange(new Range(0, 90, 1))
        .onInput(degrees => {
            polarizerAngle = degrees * Math.PI / 180;
            updateWavesAndAxes();
            updateReadout();
        })
    )
    .append(new Slider('Analyzer angle θ (relative): ')
        .withUnits('°')
        .withValue(0)
        .withRange(new Range(0, 90, 1))
        .onInput(degrees => {
            analyzerAngle = degrees * Math.PI / 180;
            updateWavesAndAxes();
            updateReadout();
        })
    )
    .onStep(clock => {
        const time = clock.simulatedTime;

        incomingWave.time = time;
        polarizedWave.time = time;
        transmittedWave.time = time;

        // Smoothly wander between pseudo-random field directions. Sampling
        // directions uniformly gives an approximately 1/2 mean of
        // cos²(phi - alpha), as expected for unpolarized input. This is a
        // visual approximation, not a microscopic coherence model.
        const interval = 1.1;
        const segment = Math.floor(time / interval);
        const fraction = (time / interval) - segment;
        const smoothFraction = fraction * fraction * (3 - 2 * fraction);
        const angleA = randomAngle(segment);
        const angleB = randomAngle(segment + 1);
        const angleDifference = Math.atan2(
            Math.sin(angleB - angleA),
            Math.cos(angleB - angleA)
        );
        incomingPolarizationAngle = angleA + smoothFraction * angleDifference;

        incomingView.polarizationAngle = incomingPolarizationAngle;

        // Project the instantaneous electric field onto the first axis.
        // Its time-averaged intensity is 1/2 for an unpolarized source.
        const projectedAmplitude = Math.cos(incomingPolarizationAngle - polarizerAngle);
        polarizedWave.amplitude = projectedAmplitude;
        transmittedWave.amplitude = projectedAmplitude * Math.cos(analyzerAngle);
    });

function randomAngle(seed) {
    // Deterministic pseudo-random angle in [0, 2π), stable across frames.
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return 2 * Math.PI * (value - Math.floor(value));
}

function updateWavesAndAxes() {
    // After the first polarizer, the transmitted field has the polarizer's
    // fixed direction, even though its instantaneous amplitude fluctuates.
    polarizedView.polarizationAngle = polarizerAngle;

    // The analyzer transmits the component along its own axis.
    transmittedView.polarizationAngle = polarizerAngle + analyzerAngle;

    polarizerAxis.axis.set(
        0,
        2.25 * Math.cos(polarizerAngle),
        2.25 * Math.sin(polarizerAngle)
    );
    analyzerAxis.axis.set(
        0,
        2.25 * Math.cos(polarizerAngle + analyzerAngle),
        2.25 * Math.sin(polarizerAngle + analyzerAngle)
    );
}

function updateReadout() {
    const alphaDegrees = polarizerAngle * 180 / Math.PI;
    const thetaDegrees = analyzerAngle * 180 / Math.PI;
    // Mean intensities for unpolarized input. The first ideal polarizer
    // always transmits half the incident intensity, independent of alpha.
    const afterFirst = 0.5;
    const afterSecond = afterFirst * Math.cos(analyzerAngle) ** 2;

    simulation.setHtmlTitle(
        `Mean after first filter: ${(100 * afterFirst).toFixed(1)}% | Mean after second: ${(100 * afterSecond).toFixed(1)}% ` +
        `(½ × cos²${thetaDegrees.toFixed(0)}°; first axis α = ${alphaDegrees.toFixed(0)}°)`
    );
}

updateWavesAndAxes();
updateReadout();
