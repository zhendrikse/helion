import {
    Canvas, DiscreteScalarField, HtmlDiv, ScalarFieldSurface, Simulation, PerlinNoiseOperator,
    StandardSurfaceView, ThreeJsRenderer, Vec3, DiamondSquareOperator, ColorMappers
} from "../../../src/index.js";


const field = new DiscreteScalarField({
    nx: 257,
    ny: 257
});

// field.apply(new PerlinNoiseOperator({
//     scale: 75,
//     frequency: 0.01,
//     octaves: 8,
//     persistence: 0.55
// }));

field.apply(new DiamondSquareOperator({
    amplitude: 50,
    roughness: 1.1
}));

const surface = new ScalarFieldSurface(field);
const surfaceView = new StandardSurfaceView({
    colorMapper: ColorMappers.get("Terrain"),
    contours: false
});
surfaceView.position.set(-128, 0, -128);

const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("terrainCanvasWrapper")
        .contains(Canvas.withElementId("terrainCanvas")))
    .with({
        cameraPosition: new Vec3(300, 300, 300),
        fieldOfView: 30,
    });

Simulation
    .with(renderer)
    .synchronize(surface.onceWith(surfaceView));

surfaceView.showSurfaceControls();
surfaceView.showColormapSelector();
