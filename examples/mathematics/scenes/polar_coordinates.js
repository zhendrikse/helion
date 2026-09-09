import {
    Simulation, ParametricSurface, Domain, Slider, Range, DifferentialFrame, TangentFrameView,
    SurfaceVisualization, SurfaceResolution, Checkbox, LineSegment, Vec3, LineSegmentView, ColorMappers
} from "../../../src/index.js";

const radius = 2;
const sphereSurface = new ParametricSurface({
    domain: new Domain([1e-3, Math.PI], [1e-3, 2 * Math.PI]),
    x: (u, v) => radius * Math.sin(u) * Math.cos(v),
    y: (u, v) => radius * Math.sin(u) * Math.sin(v),
    z: (u, v) => radius * Math.cos(u)
});

const initialU = 45 / 180;
const initialV = 80 / 360;
const surfacePoint = new DifferentialFrame({u: initialU, v: initialV});
const line = new LineSegment(new Vec3(), surfacePoint.position);
sphereSurface.frameAt(initialU, initialV, surfacePoint);

const tangentFrameView = new TangentFrameView({
    color: 0xffff00,
    scale: 1.0,
    opacity: 0.5,
    wireframe: false
});

const sphereView = new SurfaceVisualization({
    resolution: new SurfaceResolution(60, 60),
    opacity: 0.15,
    display: SurfaceVisualization.Display.Surface,
    colorMapper: ColorMappers.get(ColorMappers.Viridis)
});
sphereView.surfaceLayer.wireframe = true;

const simulation = Simulation.with({
        htmlDivId: "polarCoordinatesContainer",
        camera: { fieldOfView: 30 },
        headUpDisplay: { enabled: false }
    })
    .bind(sphereSurface.onceWith(sphereView))
    .bind(surfacePoint.alwaysWith(tangentFrameView))
    .bind(line.alwaysWith(new LineSegmentView({lineWidth: 2})))
    .append(new Slider("θ (theta)")
        .withRange(new Range(0, 180, 1))
        .withValue(initialU * 180)
        .onInput(e => { 
            // @ts-ignore
            surfacePoint.u = Number(e.target.value) / 180;
            sphereSurface.frameAt(surfacePoint.u, surfacePoint.v, surfacePoint);
        })
    )
    .append(new Slider("φ (phi)")
        .withRange(new Range(0, 360, 1))
        .withValue(initialV * 360)
        .onInput(e => {
            // @ts-ignore
            surfacePoint.v = Number(e.target.value) / 360;
            sphereSurface.frameAt(surfacePoint.u, surfacePoint.v, surfacePoint);
        })
    )
    .append(new Checkbox("Principal directions")
        .checked(false)
            // @ts-ignore
        .onChange(e => tangentFrameView.showPrincipals = e.target.checked)
        .togetherWith(new Checkbox("Axes")
            .checked(true)
            // @ts-ignore
            .onChange(/* @ts-ignore */ e => tangentFrameView.showAxes = e.target.checked)
    ))
    .provideAxesAround(sphereView)
    .frameSceneOn(sphereView, { padding: 0.9, translationY: -1 });

simulation.setLatexTitle("\\text{Spherical coordinates } (r,\\theta,\\phi):\\; r=2");
