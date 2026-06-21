import {
    DiscreteComplexField, RadioButton, Simulation, Slider, Vec3, Range,
    Checkbox, ComplexScalarFieldRaster, FFTShift2D, FFT2D, DiscreteScalarField, ShapeFactory
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
        this._field
            .apply(new FFT2D())
            .apply(new FFTShift2D());
    }

    _buildShape() {
        const mask = new DiscreteScalarField({ nx: this._N, ny: this._N });
        mask.apply(ShapeFactory.create(ShapeFactory.Type.Square), { size: this._diameter });
        for (let i = 0; i < this._N; i++)
            for (let j = 0; j < this._N; j++)
                this._field.real[this._field.index(i, j)] = mask.valueAt(i, j) === 0 ? 0 : 1;
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
