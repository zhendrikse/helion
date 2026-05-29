import {FFT, ComplexPhaseRaster, EventController, HtmlControl } from "helion";

const screenContext = document.getElementById("fourierTransformCanvas").getContext("2d");

const resolution = 512;
const intensityImage = new ComplexPhaseRaster({
    width: resolution,
    height: resolution
});

class Aperture {
    static Type = Object.freeze({
        CIRCULAR: "circular",
        SQUARE: "square"
    });
    constructor(diameter, N) {
        this._type = Aperture.Type.CIRCULAR;
        this._N = N;
        this._diameter = diameter;
        this.buildField();
    }

    set diameter(diameter) {
        this._diameter = diameter;
        this.buildField();
    }

    set type(type) {
        this._type = type;
        this.buildField();
    }

    buildField() {
        const N = this._N;
        const field = Array.from({ length: N }, () => new Array(N).fill(0));

        const cx = N / 2;
        const cy = N / 2;
        const radius = this._diameter / 2;

        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                const x = i - cx;
                const y = j - cy;

                const inside = this._type === Aperture.Type.CIRCULAR ?
                    (x * x + y * y <= radius * radius)
                    : (Math.abs(x) <= radius && Math.abs(y) <= radius);

                field[i][j] = inside ? 1 : 0;
            }

        return field;
    }
}

class FourierTransform {
    constructor(N) {
        this._N = N;
        this._fft = new FFT(N);
    }

    compute(field) {
        const N = this._N;

        // create copy (FFT works in-place)
        const real = field.map(row => row.slice());
        const imag = Array.from({ length: N }, () => new Array(N).fill(0));

        this._fft.fft2D(real, imag);

        const intensity = Array.from({ length: N }, () => new Array(N));
        const phaseArray = Array.from({ length: N }, () => new Array(N));

        let max = 0;
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                const re = real[i][j];
                const im = imag[i][j];
                const value = Math.sqrt(re * re + im * im);
                const phase = Math.atan2(im, re); // [-π, π]
                intensity[i][j] = value;
                phaseArray[i][j] = phase;
                if (value > max) max = value;
            }

        return {
            magnitude: fftShift2D(intensity),
            phase: fftShift2D(phaseArray),
            max
        };
    }
}

function fftShift2D(arr) {
    const N = arr.length;
    const half = N >> 1;

    const out = Array.from({ length: N }, () => new Array(N));
    for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
            out[i][j] = arr[(i + half) % N][(j + half) % N];

    return out;
}


function render() {
    const currentResult = fourier.compute(aperture.buildField());
    intensityImage.render(
        screenContext,
        currentResult.magnitude,
        currentResult.phase,
        currentResult.max
    );
}

const aperture = new Aperture(30, resolution);
const fourier = new FourierTransform(resolution);

//
// Event listeners
//
const eventController = new EventController();
eventController.attach(HtmlControl
    .withElementId("diameterSlider")
    .forType("change")
    .withValueSpanId("diameterValue")
    .to(aperture).withProperty("diameter"));

eventController.attach(HtmlControl
    .withElementId("circleButton")
    .forType("click")
    .to(aperture).withProperty("type"));

eventController.attach(HtmlControl
    .withElementId("squareButton")
    .forType("click")
    .to(aperture).withProperty("type"));

render();
