import { linspace, meshgrid, PixelRaster, wavelengthColor, wavelengthToRGBNormalized } from "helion";

export class IntensityRaser extends PixelRaster {
    constructor({
        context,
        width = 100,
        height = 100,
        scaleToCanvas = false
    } = {}) {
        super({context, width, height, scaleToCanvas});
    }

    render(electricField, showSpectralColor= true) {
        const intensityMap = electricField.intensity;
        const maxIntensity = electricField.maxIntensity;
        const lambda = electricField.lambdaInNanos;
        for (let i = 0; i < resolution; i++)
            for (let j = 0; j < resolution; j++) {
                const intensity = Math.pow(intensityMap[i][j] / maxIntensity, popFactor);
                const color = showSpectralColor ?
                    wavelengthColor(lambda, intensity) :
                    [255, 255, 255, 255 * Math.sqrt(intensity)];
                this.setColourAt(i, j, color);
            }
        super.render();
    }
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

class ElectricField {
    constructor(N) {
        this._field = Array.from({length:N}, () => Array(N).fill(0));
        this._N = N;
        this._intensity = null;
        this._maxIntensity = 0;
        this._update();
        this._lambdaInNanos = null;
    }

    get intensity() { return this._intensity; }
    get maxIntensity() { return this._maxIntensity;}
    get lambdaInNanos() { return this._lambdaInNanos; }

    _update() {
        this._intensity = this._field.map(row => row.map(v => v * v));
        let max = 0;
        for (let i = 0; i < this._N; i++)
            for (let j = 0; j < this._N; j++)
                if (this._intensity[i][j] > max) max = this._intensity[i][j];
        this._maxIntensity = max;
    }

    recompute(aperture, lambdaInNanoMeter) {
        this._lambdaInNanos = lambdaInNanoMeter;
        this._computeElectricField(aperture);
        this._update();
    }

    _computeElectricField(aperture) {
        const k = 2 * Math.PI / (this._lambdaInNanos * 1e-9);
        for (let i = 0; i < this._N; i++)
            for (let j = 0; j < this._N; j++)
                this._field[i][j] = aperture.sumRaysAt(i, j, k) / R;
    }
}

const diameterSlider = document.getElementById("diameterSlider");
const diameterLabel = document.getElementById("diameterValue");
const popFactorSlider = document.getElementById("popFactorSlider");
const wavelengthSlider = document.getElementById("wavelengthSlider");
const wavelengthValue = document.getElementById("wavelengthValue");
const wavelengthProbe = document.getElementById("wavelengthProbe");
const screenContext = document.getElementById("fraunhoferCanvas").getContext("2d");

const resolution = 100;
const R = 1.0;

let popFactor = 1;
const intensityImage = new IntensityRaser({
    context: screenContext,
    width: resolution,
    height: resolution,
    scaleToCanvas: true
});

async function recomputeAndRender(aperture) {
    document.body.style.cursor = "wait";

    await new Promise(requestAnimationFrame);

    electricField.recompute(aperture, Number(wavelengthSlider.value));
    render();

    document.body.style.cursor = "default";
}

function render() {
    const showSpectralColor = document.getElementById("laserColor").checked;
    intensityImage.render(electricField, showSpectralColor);
}

//
// Event listeners
//
document.getElementById("laserColor").addEventListener("change", render);

document.getElementById("squareButton").addEventListener("click", () => {
    aperture.isCircular = false;
    recomputeAndRender(aperture).then();
});

document.getElementById("circleButton").addEventListener("click", () => {
    aperture.isCircular = true;
    recomputeAndRender(aperture).then();
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
    recomputeAndRender(aperture).then();
});

popFactorSlider.addEventListener("input", () => {
    popFactor = Number(1 - popFactorSlider.value + .3);
    render();
})

const aperture = new Aperture(Number(diameterSlider.value), resolution);
const electricField = new ElectricField(resolution);
updateWavelengthUI();
recomputeAndRender(aperture).then();
