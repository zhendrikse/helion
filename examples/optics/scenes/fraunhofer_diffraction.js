import { linspace, meshgrid } from "../../../src/math/math.js";

class PixelRaser2D {
    constructor(context, width, height, backgroundColor = null) {
        this._width = width;
        this._height = height;
        this._imageData = context.createImageData(this._width, this._height);
    }

    setColourAt(x, y, color) {
        if (x < 0 || y < 0 || x >= this.dimX() || y >= this.dimY()) return;
        let index = y * (this._width * 4) + x * 4;
        const imageData = this._imageData.data;
        if (color == null) { // 👈 Intentional use of ==, not ===
            imageData[index + 3] = 0; // completely transparant
            return;
        }

        imageData[index++] = color[0];
        imageData[index++] = color[1];
        imageData[index++] = color[2];
        imageData[index++] = (color[3] ?? 255);
    }

    dimX = () => this._width;
    dimY = () => this._height;

    clear(color = null) {
        for (let x = 0; x < this.dimX(); x++)
            for (let y = 0; y < this.dimY(); y++)
                this.setColourAt(x, y, color);
    }

    render(context, scale = true) {
        if (!scale) {
            context.putImageData(this._imageData, 0, 0);
            return;
        }

        // draw direct scaled imageData via offscreen canvas
        const off = new OffscreenCanvas(this._width, this._height);
        off.getContext("2d").putImageData(this._imageData, 0, 0);

        context.imageSmoothingEnabled = false;
        this.clear();
        context.drawImage(off, 0, 0, context.canvas.width, context.canvas.height);
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
const intensityImage = new PixelRaser2D(screenContext, resolution, resolution);

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
    }

    get intensity() { return this._intensity; }
    get maxIntensity() { return this._maxIntensity;}

    _update() {
        this._intensity = this._field.map(row => row.map(v => v * v));
        let max = 0;
        for (let i = 0; i < this._N; i++)
            for (let j = 0; j < this._N; j++)
                if (this._intensity[i][j] > max) max = this._intensity[i][j];
        this._maxIntensity = max;
    }

    recompute(aperture, lambdaInNanoMeter) {
        this._computeElectricField(aperture, lambdaInNanoMeter);
        this._update();
    }

    _computeElectricField(aperture, lambdaInNanoMeter) {
        const k = 2 * Math.PI / (lambdaInNanoMeter * 1e-9);
        for (let i = 0; i < this._N; i++)
            for (let j = 0; j < this._N; j++)
                this._field[i][j] = aperture.sumRaysAt(i, j, k) / R;
    }
}

function wavelengthColor(value) {
    const wavelength = Number(wavelengthSlider.value);
    const base = wavelengthToRGBNormalized(wavelength);

    // intensity → brightness modulation only
    return [
        base.r * 255,
        base.g * 255,
        base.b * 255,
        Math.sqrt(value) * 255
    ];
}

function drawToImage(image, electricField, useSpectralColor=true) {
    const intensityMap = electricField.intensity;
    const maxIntensity = electricField.maxIntensity;
    for (let i = 0; i < resolution; i++)
        for (let j = 0; j < resolution; j++) {
            const value = Math.pow(intensityMap[i][j] / maxIntensity, popFactor);
            image.setColourAt(i, j, useSpectralColor ? wavelengthColor(value) : [255, 255, 255, 255 * Math.sqrt(value)]);
        }
}

function wavelengthToRGBNormalized(wavelength) {
    let R = 0, G = 0, B = 0;

    if (wavelength >= 380 && wavelength < 440) {
        R = -(wavelength - 440) / (440 - 380);
        G = 0;
        B = 1;
    } else if (wavelength < 490) {
        R = 0;
        G = (wavelength - 440) / (490 - 440);
        B = 1;
    } else if (wavelength < 510) {
        R = 0;
        G = 1;
        B = -(wavelength - 510) / (510 - 490);
    } else if (wavelength < 580) {
        R = (wavelength - 510) / (580 - 510);
        G = 1;
        B = 0;
    } else if (wavelength < 645) {
        R = 1;
        G = -(wavelength - 645) / (645 - 580);
        B = 0;
    } else if (wavelength <= 700) {
        R = 1;
        G = 0;
        B = 0;
    }

    let factor = 1;
    if (wavelength < 420)
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    else if (wavelength > 645)
        factor = 0.3 + 0.7 * (700 - wavelength) / (700 - 645);

    const gamma = 0.8;

    return {
        r: Math.pow(R * factor, gamma),
        g: Math.pow(G * factor, gamma),
        b: Math.pow(B * factor, gamma)
    };
}

async function recomputeAndRender(aperture) {
    document.body.style.cursor = "wait";

    await new Promise(requestAnimationFrame);

    electricField.recompute(aperture, Number(wavelengthSlider.value));
    render();

    document.body.style.cursor = "default";
}

function render() {
    const spectralColor = document.getElementById("laserColor").checked;
    drawToImage(intensityImage, electricField, spectralColor);
    intensityImage.render(screenContext);
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
