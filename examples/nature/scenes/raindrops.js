import {
    DiscreteScalarField, Interval, Simulation, Vec3, DiscreteFieldSurface, LaplaceOperator,
    SurfaceResolution, WaveEquationSolver, GaussianImpulse, SurfaceVisualization,
    FixedIntervalNormalizer, RadioGroup, RadioButton, Checkbox, ColorMappers
} from "../../../src/index.js";

export class WaveEquation {
    constructor({
        velocity = 1,
        damping = 0.1
    } = {}) {
        this._velocity = velocity;
        this._damping = damping;
    }

    get damping() { return this._damping; }

    acceleration(field, i, j) {
        return this._velocity * this._velocity * LaplaceOperator.at(field, i, j);
    }
}

//
// First, declare a (discrete) scalar field and a wave equation.
// Next, define a solver on this field for this equation.
// Finally, define a surface that can visualize the (scalar) field.
//
const field = new DiscreteScalarField({ nx: 256, ny: 256 });
const solver = new WaveEquationSolver(new WaveEquation({ velocity: 5 }));
const surface = new DiscreteFieldSurface(field);

const resolution = 256;
const waterSurface = new SurfaceVisualization({
    resolution: new SurfaceResolution(resolution, resolution),
    colorMapper: new ColorMappers().get(ColorMappers.WaterAlternative)(),
    normalizer: new FixedIntervalNormalizer(new Interval(-.3, 2)),
    opacity: 0.8,
    display: SurfaceVisualization.Display.Glyphs
});
waterSurface.position.set(-resolution * .5, 0, -resolution * .5);

Simulation
    .with({
        htmlDivId: "raindropContainer",
        cameraPosition: new Vec3(4, 2, 4.2).multiplyScalar(75),
        fieldOfView: 19
    })
    .bind(surface.alwaysWith(waterSurface))
    .runsEvery(0.01)
    .atSpeed(10)
    .onStep((_, dt) => {
        field.evolve(solver, dt);
        if (Math.random() > dt)
            return;
        
        field.apply(new GaussianImpulse( {
            centerX: Math.floor(Math.random() * 256),
            centerY: Math.floor(Math.random() * 256),
            amplitude: .25,
            sigma: 1
        }));
    })
    .append(waterSurface.ui())
    .append(
        new RadioGroup(
            new RadioButton("Smooth")
                .addEventListener("change", () => waterSurface.display(SurfaceVisualization.Display.Surface)),

            new RadioButton("Glyphs")
                .addEventListener("change", () => waterSurface.display(SurfaceVisualization.Display.Glyphs)),
        ).checked(1)
    )
    .append(waterSurface.glyphLayer.ui())
    .append(new Checkbox("Wireframe ")
        .on(waterSurface.surfaceLayer)
        .withProperty("wireframe")
    )
    .start();
