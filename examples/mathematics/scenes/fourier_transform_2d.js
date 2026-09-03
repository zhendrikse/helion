import {
    DiscreteComplexField, Simulation, Vec3, ComplexSurfaceView2D, FFTShift2D, FFT2D, ComplexShapeMask,
    ShapeConfiguration, Shapes, ComplexSoftness, Slider, Range, Checkbox, SurfaceResolution
} from "../../../src/index.js";

const resolution = 512;
const field = new DiscreteComplexField({nx: resolution, ny: resolution});
const intensityRaster = new ComplexSurfaceView2D({
    showPhaseColour: false,
    brightnessFunction: modulus => modulus * 5e-3
});

function reset(shapeConfiguration, softness) {
    field
        .reset()
        .apply(new ComplexShapeMask(shapeConfiguration))
        .apply(new ComplexSoftness({ softness }))
        .apply(new FFT2D())
        .apply(new FFTShift2D());
}

const shapeConfiguration = new ShapeConfiguration({ defaultShape: Shapes.Circle });
let softness = 2;
shapeConfiguration.onChangeEventListener = (_) => reset(shapeConfiguration, softness);
reset(shapeConfiguration, softness);

Simulation
    .with({
        htmlDivId: "fourierTransform2dContainer",
        camera: {
            position: new Vec3(2, .5, .75).multiplyScalar(.25 * resolution),
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .onReset(() => reset(shapeConfiguration))
    .bind(field.alwaysWith(intensityRaster))
    .append(shapeConfiguration.ui())
    .append(new Slider("🧸 Softness")
        .withRange(new Range(0, 20, 1))
        .withValue(softness)
        .addEventListener("input", event => {
            softness = Number(event.target.value);
            reset(shapeConfiguration, softness);
        })
    )
    .append(new Checkbox("🎨 Phase: ")
        .on(intensityRaster)
        .withProperty("phaseColor")
    );
