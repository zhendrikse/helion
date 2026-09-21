import {
    linspace, meshgrid, DiscreteFieldSurfaceView, WavelengthColorMapper, Vec3, FixedIntervalNormalizer,
    DiscreteScalarField, Simulation, Slider, Checkbox, Range, RadioGroup, SurfaceResolution
} from '../../../src/index.js';

const initialLambda = 550;

class Aperture {
    static Type = Object.freeze({
        CIRCULAR: 'circular',
        SQUARE: 'square'
    });
    static circularAperture = (x, y, diameter) => x * x + y * y < (.5 * diameter) * (.5 * diameter);
    static squareAperture = (x, y, size) => Math.abs(x) <= size * .5 && Math.abs(y) <= size * .5;

    static circleMask = (X, Y, diameter, N) => Array.from({length: N}, (_, i) =>
        Array.from({length: N}, (_, j) => Aperture.circularAperture(X[i][j], Y[i][j], diameter)));
    static squareMask = (X, Y, diameter, N) => Array.from({length: N}, (_, i) =>
        Array.from({length: N}, (_, j) => Aperture.squareAperture(X[i][j], Y[i][j], diameter)));

    constructor(diameterInMicroMeter, N) {
        this._apertureType = Aperture.Type.CIRCULAR;
        this._N = N;

        const side = linspace(-0.01 * Math.PI, 0.01 * Math.PI, N);
        const [x, y] = meshgrid(side, side);
        this._kX = x;
        this._kY = y;
        this.diameterInMicroMeter = diameterInMicroMeter;
    }

    set diameterInMicroMeter(diameterInMicroMeter) {
        this._diameterInMicroMeter = diameterInMicroMeter;
        const diameter = this._diameterInMicroMeter * 1e-6;

        const dx = diameter / this._N;
        const dy = diameter / this._N;
        this._dx_dy = dx * dy;

        const side_ap = linspace(-diameter *.5, diameter *.5, this._N);
        const [X, Y] = meshgrid(side_ap, side_ap);
        this._X = X;
        this._Y = Y;

        const mask = this._apertureType === Aperture.Type.CIRCULAR ?
            Aperture.circleMask(X, Y, diameter, this._N) :
            Aperture.squareMask(X, Y, diameter, this._N);

        this._aperture = [];
        for (let m = 0; m < this._N; m++)
            for (let n = 0; n < this._N; n++)
                if (mask[m][n]) this._aperture.push([m, n]);
    }

    set type(type) {
        this._apertureType = type;
        this.diameterInMicroMeter = this._diameterInMicroMeter; // Force update of mask!!
    }

    // De facto, this amounts to a numerical version of the Fraunhofer diffraction integral
    sumRaysAt(i, j, k) {
        let field = 0;
        const kx = k * this._kX[i][j];
        const ky = k * this._kY[i][j];

        for (const [m, n] of this._aperture)
            field += Math.cos(kx * this._X[m][n] + ky * this._Y[m][n]) * this._dx_dy;

        return field;
    }
}

//
// Physics
//
class FraunhoferSimulation {
    constructor(simulation, aperture, intensityField) {
        this._aperture = aperture;
        this._intensityField = intensityField;
        this._colorMapper = new WavelengthColorMapper();
        this._simulation = simulation;
    }

    set diameterInMicroMeter(diameterInMicroMeter) {
        this._aperture.diameterInMicroMeter = diameterInMicroMeter;
    }

    set lambdaInNanos(value) {
        this._lambdaInNanos = value;
        this._colorMapper.lambdaInNanos = value;
    }

    set apertureType(type) {
        this._aperture.type = type;
    }

    set showSpectralColor(value) {
        this._colorMapper.showSpectralColor = value;
    }

    async recompute() {
        const k = 2 * Math.PI / (this._lambdaInNanos * 1e-9);
        const nx = this._intensityField.nx;
        const ny = this._intensityField.ny;
        for (let i = 0; i < nx; i++) {
            await new Promise(resolve => setTimeout(resolve, 0));
            this._simulation.showHud(`Calculating diffraction: ${Math.round(i * 100 / nx)}%`);
            for (let j = 0; j < ny; j++) {
                const field = this._aperture.sumRaysAt(i, j, k) / R;
                this._intensityField.setValueAt(i, j, field * field);
            }
        }
    }

    get colorMapper() { return this._colorMapper; }
}

const simulation = Simulation
    .with({
        htmlDivId: 'fraunhoferContainer',
        camera: { position: new Vec3(2, .5, .75).multiplyScalar(50) }
    });
const resolution = 128;
const R = 1.0;
const aperture = new Aperture(200, resolution);
const intensityField = new DiscreteScalarField({nx: resolution, ny: resolution});
const fraunhoferSimulation = new FraunhoferSimulation(simulation, aperture, intensityField);
fraunhoferSimulation.lambdaInNanos = initialLambda;
fraunhoferSimulation.recompute().then(_ => simulation.hideHud());

//
// View for 2D canvas
//
const intensityPixelRaster = new DiscreteFieldSurfaceView({
    resolution: new SurfaceResolution(resolution, resolution),
    colorMapper: fraunhoferSimulation.colorMapper,
    normalizer: new FixedIntervalNormalizer()
});

simulation
    .bind(intensityField.alwaysWith(intensityPixelRaster))
    .append(new RadioGroup()
        .add('🟩 Square', () => {
            fraunhoferSimulation.apertureType = Aperture.Type.SQUARE;
            fraunhoferSimulation.recompute().then(r => simulation.hideHud());
        })
        .add('🟢 Circle', () => {
            fraunhoferSimulation.apertureType = Aperture.Type.CIRCULAR;
            fraunhoferSimulation.recompute().then(r => simulation.hideHud());
        })
        .checked(1))
    .append(new Slider('Size: ')
        .withValue(200)
        .withRange(new Range(50, 300, 1))
        .onChange(event => {
            fraunhoferSimulation.diameterInMicroMeter = event.target.value;
            fraunhoferSimulation.recompute().then(_ => simulation.hideHud());
        }))
    .append(new Slider('Color: ')
        .withValue(initialLambda)
        .withRange(new Range(380, 700, 1))
        // .addEventListener('input', (event) => {
        //     const wavelength = Number(event.target.value);
        //     const color = wavelengthToRGBNormalized(wavelength);
        //     const intensity = 1;
        //     wavelengthProbe.style.backgroundColor =
        //         `rgb(${color.r * intensity * 255},
        //          ${color.g * intensity * 255},
        //          ${color.b * intensity * 255})`;
        // })
        .onChange(event => {
            fraunhoferSimulation.lambdaInNanos = event.target.value;
            fraunhoferSimulation.recompute().then(r => simulation.hideHud());
        })
        .togetherWith(new Checkbox('🎨 ')
            .on(fraunhoferSimulation)
            .withProperty('showSpectralColor')
            .checked(true))
    );
