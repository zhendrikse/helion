import {
    DiscreteScalarField, DiscreteFieldSurface, Simulation, PerlinNoiseOperator, Vec3, DiamondSquareOperator,
    ColorMappersFactory, RadioButton, SurfaceVisualization, SurfaceResolution, RadioGroup
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
const surfaceView = new SurfaceVisualization({
    colorMapper: ColorMappersFactory.create(ColorMappersFactory.Type.Terrain),
    resolution: new SurfaceResolution(128, 128)
});
surfaceView.position.set(-128, 0, -128);
surfaceView.displaySurfaceLayer();

const simulation = Simulation
    .with({
        htmlDivId: "terrainContainer",
        cameraPosition: new Vec3(300, 300, 300),
        fieldOfView: 30,
    })
    .bind(landscape.surface.onceWith(surfaceView))
    .append(surfaceView.ui())
    .append(new RadioGroup(
        new RadioButton("Perlin noise: ")
            .withValue("perlin")
            .on(landscape)
            .withProperty("noiseType")
            .addEventListener("change", () =>
                simulation.bind(landscape.surface.onceWith(surfaceView))),
        new RadioButton("Diamond-square: ")
            .withValue("diamondSquare")
            .checked(true)
            .on(landscape)
            .withProperty("noiseType")
            .addEventListener("change", () =>
                simulation.bind(landscape.surface.onceWith(surfaceView))))
    );
