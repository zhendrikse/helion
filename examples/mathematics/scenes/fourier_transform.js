import {
    FFT, DiscreteComplexField, RadioButton, Simulation, Slider, Vec3, Range,
    Checkbox, ComplexScalarFieldRaster
} from "../../../src/index.js";

const Shape = Object.freeze({
    CIRCULAR: "circle",
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
        this._field.apply(FFT.fft2D);
        this._field.apply(FFT.fftShift2D); // Shift back to center
    }

    // _pixelAt(i, j, type) {
    //     switch (type) {
    //         case FourierSimulation.Type.CIRCULAR:
    //             return (x * x + y * y <= radius * radius);
    //     }
    // }

    _buildShape() {
        const N = this._N;
        const real =  new Float32Array(N * N);
        const imag = new Float32Array(N * N);
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

                real[j * N + i] = inside ? 1 : 0;
            }
        this._field.real = real;
        this._field.imag = imag;
    }
}

const resolution = 512;
const fourierSimulation = new FourierSimulation(30, resolution);

//
// View for 2D raster
//
const intensityRaster = new ComplexScalarFieldRaster({
    width: resolution,
    height: resolution,
    showPhaseColour: false,
    brightness: 5e-3
});

Simulation
    .with({
        htmlDivId: "fourierTransformContainer",
        cameraPosition: new Vec3(2, .5, .75).multiplyScalar(.5 * resolution),
    })
    .synchronize(fourierSimulation.field.alwaysWith(intensityRaster))
    .onClockTick()
    .append(new Slider("📏 Size:")
        .on(fourierSimulation)
        .withRange(new Range(20, 50, .1))
        .withValue(30)
        .withUnits("pixels")
        .withProperty("diameter")
        .togetherWith(new Checkbox("🎨 Phase: ")
            .on(intensityRaster)
            .checked(false)
            .withProperty("phaseColor"))
    )
    .append(new RadioButton("🟩 Square")
        .on(fourierSimulation)
        .withProperty("type")
        .withValue("square")
        .togetherWith( new RadioButton("🟢 Circle")
            .on(fourierSimulation)
            .withProperty("type")
            .checked(true)
            .withValue("circle"))
    )
    .start();
