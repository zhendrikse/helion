import {
    linspace, meshgrid, ScalarRaster, wavelengthColor, wavelengthToRGBNormalized,
    ScalarGridField, Canvas, Canvas2DRenderer, HtmlDiv, Simulation, EventController, HtmlControl
} from "helion";

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

class ElectricFieldIntensityGrid extends ScalarGridField {
    constructor(N) {
        super(N, N, N, N);
        this._resolution = N;
        this._maxIntensity = 0;
    }

    get resolution() { return this._resolution; }
    get maxIntensity() { return this._maxIntensity; }
    set maxIntensity(maxIntensity) { this._maxIntensity = maxIntensity; }
}

//
// Physics
//
class FraunhoferSimulation {
    constructor(aperture, electricField) {
        this._aperture = aperture;
        this._electricField = electricField;
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
        let max = 0;
        const k = 2 * Math.PI / (this._lambdaInNanos * 1e-9);
        for (let i = 0; i < this._electricField.resolution; i++)
            for (let j = 0; j < this._electricField.resolution; j++) {
                const field = this._aperture.sumRaysAt(i, j, k) / R;
                const intensity = field * field;
                this._electricField.setValueAt(i, j, intensity);
                if (intensity > max)
                    max = intensity;
            }
        this._electricField.maxIntensity = max;
    }

    get colorMapper() { return this._colorMapper; }
}

const resolution = 100;
const R = 1.0;
const aperture = new Aperture(200, resolution);
const electricField = new ElectricFieldIntensityGrid(resolution);
const fraunhoferSimulation = new FraunhoferSimulation(aperture, electricField);

//
// View for 2D canvas
//
const canvas2d = Canvas.withElementId("fraunhoferCanvas");
const renderer2d = Canvas2DRenderer.on(HtmlDiv.withElementId("fraunhoferCanvasWrapper").contains(canvas2d));

const intensityPixelRaster = new ScalarRaster({
    width: resolution,
    height: resolution,
    normalize: (intensity) => intensity / electricField.maxIntensity,
    colorMapper: fraunhoferSimulation.colorMapper,
    scaleToCanvas: true
});
renderer2d.synchronize(electricField.alwaysWith(intensityPixelRaster));

const simulation = Simulation.with(renderer2d).onClockTick();

const eventController = new EventController(simulation);
eventController.attach(HtmlControl
    .withElementId("wavelengthSlider")
    .forType("change")
    .withValueSpanId("wavelengthValue")
    .to(fraunhoferSimulation).withProperty("lambdaInNanos"));

eventController.attach(HtmlControl
    .withElementId("diameterSlider")
    .forType("change")
    .withValueSpanId("diameterValue")
    .to(fraunhoferSimulation).withProperty("diameterInMicroMeter"));

eventController.attach(HtmlControl
    .withElementId("circleButton")
    .forType("click")
    .to(fraunhoferSimulation).withProperty("apertureType"));

eventController.attach(HtmlControl
    .withElementId("squareButton")
    .forType("click")
    .to(fraunhoferSimulation).withProperty("apertureType"));

eventController.attach(HtmlControl
    .withElementId("laserColor")
    .forType("click")
    .to(fraunhoferSimulation).withProperty("showSpectralColor"));


// Custom wavelength -> color renderer
const wavelengthSlider = document.getElementById("wavelengthSlider");
const wavelengthProbe = document.getElementById("wavelengthProbe");
document.getElementById("wavelengthSlider").addEventListener("input", e => {
    const wavelength = Number(wavelengthSlider.value);
    const color = wavelengthToRGBNormalized(wavelength);
    const intensity = 1;
    wavelengthProbe.style.backgroundColor =
        `rgb(${color.r * intensity * 255},
             ${color.g * intensity * 255},
             ${color.b * intensity * 255})`;

})

fraunhoferSimulation.lambdaInNanos = 500;
simulation.start();