import {
    FFT, ComplexScalarFieldRaster, DiscreteComplexField, EventController, HtmlControl,
    Simulation, HtmlDiv, Canvas, Canvas2DRenderer
} from "helion";

class ShapeField extends DiscreteComplexField{
    static Type = Object.freeze({
        CIRCULAR: "circular",
        SQUARE: "square"
    });

    constructor(diameter, N) {
        super({nx: N, ny: N});
        this._type = ShapeField.Type.CIRCULAR;
        this._N = N;
        this._diameter = diameter;
        this._fft = new FFT(N);
        this._buildShape();
    }

    set diameter(diameter) {
        this._diameter = diameter;
        this._buildShape();
        fftField = this.doFft();
    }

    set type(type) {
        this._type = type;
        this._buildShape();
        fftField = this.doFft();
    }

    doFft() {
        this._fft.fft2D(this);
        return this.transformWith(this._fftShift2D); // Shift back to center
    }


    _fftShift2D(arr) {
        const N = arr.length;
        const half = N >> 1;

        const out = Array.from({ length: N }, () => new Array(N));
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++)
                out[i][j] = arr[(i + half) % N][(j + half) % N];

        return out;
    }

    _buildShape() {
        const N = this._N;
        const real =  Array.from({ length: N },() => new Float32Array(N));
        const cx = N / 2;
        const cy = N / 2;
        const radius = this._diameter / 2;
        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                const x = i - cx;
                const y = j - cy;
                const inside = this._type === ShapeField.Type.CIRCULAR ?
                    (x * x + y * y <= radius * radius)
                    : (Math.abs(x) <= radius && Math.abs(y) <= radius);

                real[i][j] = inside ? 1 : 0;
            }
        this.real = real;
        this.imag = Array.from({ length: N },() => new Float32Array(N));
    }
}

const resolution = 512;
const field = new ShapeField(30, resolution);
let fftField = field.doFft();

//
// View for 2D canvas
//
const canvas2d = Canvas.withElementId("fourierTransformCanvas");
const renderer2d = Canvas2DRenderer.on(HtmlDiv.withElementId("fourierTransformCanvasWrapper").contains(canvas2d));

const intensityRaster = new ComplexScalarFieldRaster({
    width: resolution,
    height: resolution
});

renderer2d.synchronize(fftField.alwaysWith(intensityRaster));
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
    .to(field).withProperty("diameter"));

eventController.attach(HtmlControl
    .withElementId("circleButton")
    .forType("click")
    .to(field).withProperty("type"));

eventController.attach(HtmlControl
    .withElementId("squareButton")
    .forType("click")
    .to(field).withProperty("type"));
