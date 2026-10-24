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

    set polarizationAngle(angle) {
        this._polarizationAngle = angle;
    }

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
let analyzerAngle = 0;

const waveViewOptions = {
    numArrows: 35,
    arrowSize: 0.075,
    arrowDistance: 0.1,
    scalingFunction: () => 1
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

const polarizerAxis = new VectorModel(new Vec3(4.5, 0, 0), new Vec3(0, 1.0, 0));
const analyzerAxis = new VectorModel(new Vec3(9.2, 0, 0), new Vec3(0, 1.0, 0));

const polarizer = new AxialSymmetricBody({
    position: new Vec3(4.43, 0, 0),
    axis: new Vec3(0.14, 0, 0),
    radius: 1.35
});
const analyzer = new AxialSymmetricBody({
    position: new Vec3(9.13, 0, 0),
    axis: new Vec3(0.14, 0, 0),
    radius: 1.35
});

const simulation = Simulation
    .with({
        htmlDivId: 'malusLawContainer',
        camera: {
            position: new Vec3(6.8, 4.2, 18),
            target: new Vec3(6.8, 0, 0),
            fieldOfView: 34
        },
        viewport: {
            aspectRatio: '16 / 9',
            parameterMenuCollapsed: false
        },
        scene: {
            backgroundColor: new Colour(0x101722)
        },
        infoPanel: {
            text: 'The transmitted intensity follows Malus\' law.'
        }
    })
    .withMouseClickEventListener()
    .runsEvery(1e-2)
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
        color: new Colour(0xffffff),
        size: 0.06,
        magnitudeMap: magnitude => magnitude
    })))
    .bind(analyzerAxis.alwaysWith(new Arrow({
        color: new Colour(0xffffff),
        size: 0.06,
        magnitudeMap: magnitude => magnitude
    })))
    .append(new Slider('Analyzer angle θ: ')
        .withValue(0)
        .withUnits('°')
        .withRange(new Range(0, 90, 1))
        .onInput(degrees => {
            analyzerAngle = degrees * Math.PI / 180;
            transmittedWave.amplitude = Math.cos(analyzerAngle);
            transmittedView.polarizationAngle = analyzerAngle;
            analyzerAxis.axis.set(0, Math.cos(analyzerAngle), Math.sin(analyzerAngle));
            updateReadout();
        })
    )
    .onStep(clock => {
        incomingWave.time = clock.simulatedTime;
        polarizedWave.time = clock.simulatedTime;
        transmittedWave.time = clock.simulatedTime;
    });

function updateReadout() {
    const degrees = analyzerAngle * 180 / Math.PI;
    const intensity = Math.cos(analyzerAngle) ** 2;
    simulation.setHtmlTitle(
        `Malus' law: I/I₀ = cos²θ = cos²(${degrees.toFixed(0)}°) = ${(100 * intensity).toFixed(1)}%`
    );
}

transmittedView.polarizationAngle = analyzerAngle;
analyzerAxis.axis.set(0, Math.cos(analyzerAngle), Math.sin(analyzerAngle));
updateReadout();
