import {
    linspace, meshgrid, PixelRaster, wavelengthColor, wavelengthToRGBNormalized,
    ScalarGridField, Canvas, Canvas2DRenderer, HtmlDiv
} from "helion";

class IntensityRaster extends PixelRaster {
    constructor({
        width = 100,
        height = 100,
        scaleToCanvas = false,
        showSpectralColor = true,
        normalize = (value, max) => value / max,
        colorMapper = (lambda, intensity) => this._showSpectralColor ?
            wavelengthColor(lambda, intensity) : [255, 255, 255, 255 * Math.sqrt(intensity)]
    } = {}) {
        super({width, height, scaleToCanvas, normalize, colorMapper});
        this._showSpectralColor = showSpectralColor;
    }

    set showSpectralColor(value) { this._showSpectralColor = value; }
}

class Aperture {
    static circularAperture = (x, y, diameter) => x * x + y * y < (.5 * diameter) * (.5 * diameter);
    static squareAperture = (x, y, size) => Math.abs(x) <= size * .5 && Math.abs(y) <= size * .5;

    static circleMask = (X, Y, diameter, N) => Array.from({length: N}, (_, i) =>
        Array.from({length: N}, (_, j) => Aperture.circularAperture(X[i][j], Y[i][j], diameter)));
    static squareMask = (X, Y, diameter, N) => Array.from({length: N}, (_, i) =>
        Array.from({length: N}, (_, j) => Aperture.squareAperture(X[i][j], Y[i][j], diameter)));

    constructor(diameterInMicroMeter, N) {
        this._isCircular = true;
        this._N = N;
        this.setDiameter(diameterInMicroMeter, N);

        const side = linspace(-0.01 * Math.PI, 0.01 * Math.PI, N);
        const [x, y] = meshgrid(side, side);
        this._kX = x;
        this._kY = y;
    }

    setDiameter(diameterInMicroMeter, N) {
        this._diameterInMicroMeter = diameterInMicroMeter;
        const diameter = this._diameterInMicroMeter * 1e-6;

        const dx = diameter / N;
        const dy = diameter / N;
        this._dx_dy = dx * dy;

        const side_ap = linspace(-diameter *.5, diameter *.5, N);
        const [X, Y] = meshgrid(side_ap, side_ap);
        this._X = X;
        this._Y = Y;

        const mask = this._isCircular ?
            Aperture.circleMask(X, Y, diameter, N) :
            Aperture.squareMask(X, Y, diameter, N);

        this._aperture = [];
        for (let m = 0; m < N; m++)
            for (let n = 0; n < N; n++)
                if (mask[m][n]) this._aperture.push([m, n]);
    }

    set isCircular(circularBoolean) {
        this._isCircular = circularBoolean;
        this.setDiameter(this._diameterInMicroMeter, this._N);
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

class ElectricFieldIntensityGrid extends ScalarGridField {
    constructor(N) {
        super(N, N, N, N);

        this._maxIntensity = 0;
        this._lambdaInNanos = null;
    }

    get maxIntensity() { return this._maxIntensity; }
    get lambdaInNanos() { return this._lambdaInNanos; }

    recompute(aperture, lambdaInNanoMeter) {
        this._lambdaInNanos = lambdaInNanoMeter;
        this._computeElectricFieldIntensityGrid(aperture);
    }

    _computeElectricFieldIntensityGrid(aperture) {
        let max = 0;
        const k = 2 * Math.PI / (this._lambdaInNanos * 1e-9);
        for (let i = 0; i < this._nx; i++)
            for (let j = 0; j < this._ny; j++) {
                const field = aperture.sumRaysAt(i, j, k) / R;
                const intensity = field * field;
                super.setValueAt(i, j, intensity);
                if (intensity > max)
                    max = intensity;
            }
        this._maxIntensity = max;
    }
}

const diameterSlider = document.getElementById("diameterSlider");
const diameterLabel = document.getElementById("diameterValue");
const wavelengthSlider = document.getElementById("wavelengthSlider");
const wavelengthValue = document.getElementById("wavelengthValue");
const wavelengthProbe = document.getElementById("wavelengthProbe");
const screenContext = document.getElementById("fraunhoferCanvas").getContext("2d");

//
// Event listeners
//
document.getElementById("laserColor").addEventListener("change", render);

document.getElementById("squareButton").addEventListener("click", () => {
    aperture.isCircular = false;
    recomputeAndRender(aperture);
});

document.getElementById("circleButton").addEventListener("click", () => {
    aperture.isCircular = true;
    recomputeAndRender(aperture);
});

function updateWavelengthUI() {
    const wavelength = Number(wavelengthSlider.value);
    const color = wavelengthToRGBNormalized(wavelength);

    const intensity = 1;

    wavelengthProbe.style.backgroundColor =
        `rgb(${color.r * intensity * 255},
             ${color.g * intensity * 255},
             ${color.b * intensity * 255})`;

    wavelengthValue.textContent = `${wavelength} nm`;
}
wavelengthSlider.addEventListener("input", updateWavelengthUI);
wavelengthSlider.addEventListener("change", () => recomputeAndRender(aperture));

diameterSlider.addEventListener("change", () => {
    const diameter = Number(diameterSlider.value);
    diameterLabel.textContent = `${diameter} µm`;
    aperture.setDiameter(diameter, resolution);
    recomputeAndRender(aperture);
});


//
// View for 2D canvas
//
const canvas2d = Canvas.withElementId("fraunhoferCanvas");
const renderer2d = Canvas2DRenderer.on(HtmlDiv.withElementId("fraunhoferCanvasWrapper").contains(canvas2d));

const resolution = 100;
const R = 1.0;
const aperture = new Aperture(Number(diameterSlider.value), resolution);
const electricField = new ElectricFieldIntensityGrid(resolution);
const intensityPixelRaster = new IntensityRaster({
    width: resolution,
    height: resolution,
    scaleToCanvas: true
});
renderer2d.synchronize(electricField.alwaysWith(intensityPixelRaster));

function recomputeAndRender(aperture) {
    electricField.recompute(aperture, Number(wavelengthSlider.value));
    render();
}

function render() {
    intensityPixelRaster.showSpectralColor = document.getElementById("laserColor").checked;
    intensityPixelRaster.render(screenContext);
}

updateWavelengthUI();
recomputeAndRender(aperture);
