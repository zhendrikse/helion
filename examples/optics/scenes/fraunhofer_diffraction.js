import {
    linspace, meshgrid, ScalarFieldRaster, wavelengthColor, wavelengthToRGBNormalized,
    DiscreteScalarField, Canvas2DRenderer, Simulation, RadioButton, Slider, Checkbox, Range
} from "../../../src/index.js";

class ColorMapper {
    constructor(lambdaInNanos = 500, showSpectralColor = true) {
        this._showSpectralColor = showSpectralColor;
        this._lambdaInNanos = lambdaInNanos;
    }

    mapToColor(intensity) {
        return this._showSpectralColor ?
            wavelengthColor(this._lambdaInNanos, intensity) : [255, 255, 255, 255 * Math.sqrt(intensity)]

    }

    set showSpectralColor(value) { this._showSpectralColor = value; }
    set lambdaInNanos(value) { this._lambdaInNanos = value; }
}

class Aperture {
    static Type = Object.freeze({
        CIRCULAR: "circular",
        SQUARE: "square"
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

    //
    // De facto, this amounts to a numerical version of the Fraunhofer diffraction integral
    //
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
    constructor(aperture, intensityField) {
        this._aperture = aperture;
        this._intensityField = intensityField;
        this._colorMapper = new ColorMapper();
        this.recompute();
    }

    set diameterInMicroMeter(diameterInMicroMeter) {
        this._aperture.diameterInMicroMeter = diameterInMicroMeter;
        this.recompute();
    }

    set lambdaInNanos(value) {
        this._lambdaInNanos = value;
        this._colorMapper.lambdaInNanos = value;
        this.recompute();
    }

    set apertureType(type) {
        this._aperture.type = type;
        this.recompute();
    }

    set showSpectralColor(value) {
        this._colorMapper.showSpectralColor = value;
        this.recompute();
    }

    recompute() {
        const k = 2 * Math.PI / (this._lambdaInNanos * 1e-9);
        for (let i = 0; i < this._intensityField.nx; i++)
            for (let j = 0; j < this._intensityField.ny; j++) {
                const field = this._aperture.sumRaysAt(i, j, k) / R;
                this._intensityField.setValueAt(i, j, field * field);
            }
    }

    get colorMapper() { return this._colorMapper; }
}

const resolution = 100;
const R = 1.0;
const aperture = new Aperture(200, resolution);
const intensityField = new DiscreteScalarField({nx: resolution, ny: resolution});
const fraunhoferSimulation = new FraunhoferSimulation(aperture, intensityField);
fraunhoferSimulation.lambdaInNanos = 500;

//
// View for 2D canvas
//
const htmlDiv = document.getElementById("fraunhoferContainer");
const renderer2d = Canvas2DRenderer.in(htmlDiv);

const intensityPixelRaster = new ScalarFieldRaster({
    width: resolution,
    height: resolution,
    colorMapper: fraunhoferSimulation.colorMapper
});

Simulation
    .with(renderer2d)
    .synchronize(intensityField.alwaysWith(intensityPixelRaster))
    .onClockTick()
    .start();

const radioButton = new RadioButton(htmlDiv)
    .on(fraunhoferSimulation)
    .withProperty("apertureType")
    .withValue("square")
    .withLabel("🟩 Square");

RadioButton.togetherWith(radioButton)
    .on(fraunhoferSimulation)
    .withProperty("apertureType")
    .checked(true)
    .withValue("circle")
    .withLabel("🟢 Circle");

new Slider(htmlDiv)
    .on(fraunhoferSimulation)
    .withProperty("diameterInMicroMeter")
    .withLabel("Size: ")
    .withValue(200)
    .withRange(new Range(20, 200, 1));

const slider = new Slider(htmlDiv)
    .withLabel("Color: ")
    .withValue(500)
    .withRange(new Range(380, 700, 1))
    .addEventListener("input", (event) => {
        const wavelength = Number(event.target.value);
        const color = wavelengthToRGBNormalized(wavelength);
        const intensity = 1;
        wavelengthProbe.style.backgroundColor =
            `rgb(${color.r * intensity * 255},
             ${color.g * intensity * 255},
             ${color.b * intensity * 255})`;
    })
    .addEventListener("change", (event) => {
        fraunhoferSimulation.lambdaInNanos = Number(event.target.value);
    });

Checkbox
    .togetherWith(slider)
    .on(fraunhoferSimulation)
    .withProperty("showSpectralColor")
    .withLabel("🎨 ")
    .checked(true);

