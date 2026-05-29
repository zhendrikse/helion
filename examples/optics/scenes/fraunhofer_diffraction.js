import {
    linspace, meshgrid, PixelRaster, wavelengthColor, wavelengthToRGBNormalized,
    ScalarGridField, Canvas, Canvas2DRenderer, HtmlDiv, Simulation, EventController, HtmlControl
} from "helion";

class IntensityRaster extends PixelRaster {
    constructor({
        width = 100,
        height = 100,
        scaleToCanvas = false,
        showSpectralColor = true,
        normalize = (intensity, max) => intensity / max,
        colorMapper = (lambda, intensity) => this._showSpectralColor ?
            wavelengthColor(lambda, intensity) : [255, 255, 255, 255 * Math.sqrt(intensity)]
    } = {}) {
        super({width, height, scaleToCanvas, normalize, colorMapper});
        this._showSpectralColor = showSpectralColor;
    }

    set showSpectralColor(value) { this._showSpectralColor = value; }
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

        this._maxIntensity = 0;
        this._lambdaInNanos = null;
    }

    get maxIntensity() { return this._maxIntensity; }
    get lambdaInNanos() { return this._lambdaInNanos; }
    set lambdaInNanos(value) { this._lambdaInNanos = value; }

    recompute(aperture) {
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

class UiControls {
    constructor(aperture, electricField) {
        this._aperture = aperture;
        this._electricField = electricField;
    }

    set diameterInMicroMeter(diameterInMicroMeter) {
        this._aperture.diameterInMicroMeter = diameterInMicroMeter;
        this._electricField.recompute(this._aperture);
    }

    set lambdaInNanos(value) {
        this._electricField.lambdaInNanos = value;
        this._electricField.recompute(this._aperture);
    }

    set apertureType(type) {
        this._aperture.type = type;
        this._electricField.recompute(this._aperture);
    }
}

//
// Physics
//
const resolution = 100;
const R = 1.0;
const aperture = new Aperture(200, resolution);
const electricField = new ElectricFieldIntensityGrid(resolution);

//
// View for 2D canvas
//
const canvas2d = Canvas.withElementId("fraunhoferCanvas");
const renderer2d = Canvas2DRenderer.on(HtmlDiv.withElementId("fraunhoferCanvasWrapper").contains(canvas2d));

const intensityPixelRaster = new IntensityRaster({
    width: resolution,
    height: resolution,
    scaleToCanvas: true
});
renderer2d.synchronize(electricField.alwaysWith(intensityPixelRaster));

const simulation = Simulation.with(renderer2d).onClockTick();
const uiControls = new UiControls(aperture, electricField);

const eventController = new EventController(simulation);
eventController.attach(HtmlControl
    .withElementId("wavelengthSlider")
    .forType("change")
    .withValueSpanId("wavelengthValue")
    .to(uiControls).withProperty("lambdaInNanos"));

eventController.attach(HtmlControl
    .withElementId("diameterSlider")
    .forType("change")
    .withValueSpanId("diameterValue")
    .to(uiControls).withProperty("diameterInMicroMeter"));

eventController.attach(HtmlControl
    .withElementId("circleButton")
    .forType("click")
    .to(uiControls).withProperty("apertureType"));

eventController.attach(HtmlControl
    .withElementId("squareButton")
    .forType("click")
    .to(uiControls).withProperty("apertureType"));

eventController.attach(HtmlControl
    .withElementId("laserColor")
    .forType("click")
    .to(intensityPixelRaster).withProperty("showSpectralColor"));


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

uiControls.lambdaInNanos = 500;
uiControls.aperture = Aperture.Type.CIRCULAR;
uiControls.diameterInMicroMeter = 200;
simulation.start();