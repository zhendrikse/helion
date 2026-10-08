import {
    DiscreteComplexField, Simulation, Vec3, ComplexSurfaceView2D, FFTShift2D, FFT2D, ComplexShapeMask,
    ShapeConfiguration, Shapes, ComplexSoftness, Slider, Range, Checkbox, SurfaceResolution
} from "../../../src/index.js";

const resolution = 512;
const field = new DiscreteComplexField({nx: resolution, ny: resolution});
const intensityRaster = new ComplexSurfaceView2D({
    showPhaseColour: false,
    brightnessFunction: modulus => modulus * 1e-3
});


let softness = 2;
/**
 * @param {ShapeConfiguration} shapeConfiguration
 */
function reset(shapeConfiguration) {
    field
        .reset()
        .apply(new ComplexShapeMask(shapeConfiguration))
        .apply(new ComplexSoftness({ softness }))
        .apply(new FFT2D())
        .apply(new FFTShift2D());
}

const shapeConfiguration = new ShapeConfiguration({ defaultShape: Shapes.Circle });
shapeConfiguration.onChangeEventListener = () => reset(shapeConfiguration);
reset(shapeConfiguration);

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
            // @ts-ignore
            softness = Number(event.target.value);
            reset(shapeConfiguration);
        })
    )
    .append(new Checkbox("🎨 Phase: ")
        .on(intensityRaster)
        .withProperty("phaseColor")
    );
