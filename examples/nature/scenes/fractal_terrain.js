import {
    DiscreteScalarField, DiscreteFieldSurface, Simulation, PerlinNoiseOperator,
    StandardSurfaceView, Vec3, DiamondSquareOperator, ColorMappers, RadioButton
} from "../../../src/index.js";

class Landscape {
    static perlinNoiseOperator = new PerlinNoiseOperator({
        scale: 75,
        frequency: 0.01,
        octaves: 8,
        persistence: 0.55
    });
    static diamondSquareOperator = new DiamondSquareOperator({
        amplitude: 50,
        roughness: 1.1
    });

    constructor() {
        const field = new DiscreteScalarField({ nx: 257,  ny: 257 });
        this._surface = new DiscreteFieldSurface(field);
        this.noiseType = "diamondSquare";
    }

    get surface() { return this._surface; }

    set noiseType(operatorNameAsString) {
        const field = new DiscreteScalarField({ nx: 257,  ny: 257 });
        field.apply(operatorNameAsString === "perlin" ?
            Landscape.perlinNoiseOperator :
            Landscape.diamondSquareOperator);
        this._surface = new DiscreteFieldSurface(field);
    }
}

const landscape = new Landscape();
const surfaceView = new StandardSurfaceView({
    colorMapper: ColorMappers.get(ColorMap.Terrain),
    contours: false
});
surfaceView.position.set(-128, 0, -128);

const simulation = Simulation
    .with({
        htmlDivId: "terrainContainer",
        cameraPosition: new Vec3(300, 300, 300),
        fieldOfView: 30,
    })
    .synchronize(landscape.surface.onceWith(surfaceView))
    .append(surfaceView.colormapSelector)
    .append(surfaceView.surfaceLayoutSelector)
    .append(new RadioButton("Perlin noise: ")
        .withValue("perlin")
        .on(landscape)
        .withProperty("noiseType")
        .addEventListener("click", () => simulation.synchronize(landscape.surface.onceWith(surfaceView)))
        .togetherWith(new RadioButton("Diamond-square: ")
            .withValue("diamondSquare")
            .checked(true)
            .on(landscape)
            .withProperty("noiseType")
            .addEventListener("click", () => simulation.synchronize(landscape.surface.onceWith(surfaceView))))
    )
    .start();
