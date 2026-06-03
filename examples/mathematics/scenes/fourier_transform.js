import {
    FFT, ComplexScalarFieldRaster, DiscreteComplexField, EventController, HtmlControl,
    Simulation, HtmlDiv, Canvas, Canvas2DRenderer
} from "../../../src/index.js";

const Shape = Object.freeze({
    CIRCULAR: "circular",
    SQUARE: "square",
    RECTANGLE: "rectangle"
});

class FourierSimulation {
    constructor(diameter, N) {
        this._type = Shape.CIRCULAR;
        this._N = N;
        this._diameter = diameter;
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
        this._field.transformWith(FFT.fft2D);
        this._field.transformWith(FFT.fftShift2D); // Shift back to center
    }

    // _pixelAt(i, j, type) {
    //     switch (type) {
    //         case FourierSimulation.Type.CIRCULAR:
    //             return (x * x + y * y <= radius * radius);
    //     }
    // }

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
                const inside = this._type === Shape.CIRCULAR ?
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

const simulation = Simulation
    .with(renderer2d)
    .synchronize(fourierSimulation.field.alwaysWith(intensityRaster))
    .onClockTick();
simulation.start()

//
// Event listeners
//
const eventController = new EventController();
eventController.attach(HtmlControl
    .withElementId("diameterSlider")
    .forType("input")
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
    .to(intensityRaster).withProperty("phaseColor"));