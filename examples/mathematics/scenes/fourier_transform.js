import {
    FFT, ComplexScalarFieldRaster, DiscreteComplexField, EventController, HtmlControl,
    Simulation, HtmlDiv, Canvas, Canvas2DRenderer
} from "helion";

class FourierSimulation {
    static Type = Object.freeze({
        CIRCULAR: "circular",
        SQUARE: "square"
    });

    constructor(diameter, N) {
        this._type = FourierSimulation.Type.CIRCULAR;
        this._N = N;
        this._diameter = diameter;
        this._fft = new FFT(N);
        this._field = new DiscreteComplexField({nx: N, ny: N});
        this.doFft();
    }

    get field() { return this._field; }

    set diameter(diameter) {
        this._diameter = diameter;
        this.doFft();
    }

    set type(type) {
        this._type = type;
        this.doFft();
    }

    doFft() {
        this._buildShape();
        this._fft.fft2D(this._field);
        this._field.transformWith(this._fftShift2D); // Shift back to center
    }

    _fftShift2D(field) {
        const N = field.real.length;
        const half = N >> 1;
        const real =  Array.from({ length: N },() => new Float32Array(N));
        const imag = Array.from({ length: N },() => new Float32Array(N));

        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                real[i][j] = field.real[(i + half) % N][(j + half) % N];
                imag[i][j] = field.imag[(i + half) % N][(j + half) % N];
            }

        field.real = real;
        field.imag = imag;
    }

    _buildShape() {
        const N = this._N;
        const real =  Array.from({ length: N },() => new Float32Array(N));
        const imag = Array.from({ length: N },() => new Float32Array(N));
        const cx = N / 2;
        const cy = N / 2;
        const radius = this._diameter / 2;
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                const x = i - cx;
                const y = j - cy;
                const inside = this._type === FourierSimulation.Type.CIRCULAR ?
                    (x * x + y * y <= radius * radius)
                    : (Math.abs(x) <= radius && Math.abs(y) <= radius);

                real[i][j] = inside ? 1 : 0;
            }
        this._field.real = real;
        this._field.imag = imag;
    }
}

const resolution = 512;
const fourierSimulation = new FourierSimulation(30, resolution);

//
// View for 2D canvas
//
const canvas2d = Canvas.withElementId("fourierTransformCanvas");
const renderer2d = Canvas2DRenderer.on(HtmlDiv.withElementId("fourierTransformCanvasWrapper").contains(canvas2d));

const intensityRaster = new ComplexScalarFieldRaster({
    width: resolution,
    height: resolution
});

renderer2d.synchronize(fourierSimulation.field.alwaysWith(intensityRaster));
const simulation = Simulation.with(renderer2d).onClockTick();
simulation.start()

//
// Event listeners
//
const eventController = new EventController();
eventController.attach(HtmlControl
    .withElementId("diameterSlider")
    .forType("change")
    .withValueSpanId("diameterValue")
    .to(fourierSimulation).withProperty("diameter"));

eventController.attach(HtmlControl
    .withElementId("circleButton")
    .forType("click")
    .to(fourierSimulation).withProperty("type"));

eventController.attach(HtmlControl
    .withElementId("squareButton")
    .forType("click")
    .to(fourierSimulation).withProperty("type"));

eventController.attach(HtmlControl
    .withElementId("phaseColor")
    .forType("click")
    .to(intensityRaster).withProperty("showPhaseColor"));