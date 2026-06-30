import {
    Simulation, ParametricSurface, Domain, DropdownMenu, Registry, SurfaceVisualization,
    ContoursLayer, SurfaceResolution, ColorLayers, PrincipalDirectionsLayer, Checkbox, ColorMappers
} from "../../../src/index.js";
import {DoubleSide, MeshStandardMaterial} from "three";

const sin = Math.sin, cos = Math.cos, tan = Math.tan, log = Math.log, PI = Math.PI;
const surfaces = {
    "Bow curve": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 4 * PI]),
        x: (u, v) => (1 * sin(u) + 2) * sin(v),
        y: (u, v) => 1 * cos(u) + 2 * cos(0.5 * v),
        z: (u, v) => (1 * sin(u) + 2) * cos(v)
    }),
    "Dini's spiral": new ParametricSurface({
        domain: new Domain([0, 4 * PI], [0.1, 2 - 0.1]),
        x: (u, v) => 1.5 * cos(u) * sin(v),
        y: (u, v) => 1.5 * sin(u) * sin(v),
        z: (u, v) => (cos(v) + log(tan(v / 2))) + 1 / 10 * u
    }),
    "Enneper's surface": new ParametricSurface({
        domain: new Domain([-2, 2], [-2, 2]),
        x: (u, v) => u - u * u * u / 3 + u * v * v,
        y: (u, v) => v - v * v * v / 3 + v * u * u,
        z: (u, v) => u * u - v * v
    }),
    "Folium": new ParametricSurface({
        domain: new Domain([-PI, PI], [-PI, PI]),
        x: (u, v) => cos(u + 2 * PI/3) / Math.cosh(v),
        y: (u, v) => cos(u - 2 * PI/3) / Math.cosh(v),
        z: (u, v) => cos(u) * (2 * v/PI - Math.tanh(v)),
    }),
    "Klein bottle": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 2 * PI]),
        x: (u, v) => -(5 - 2 * cos(u)) * cos(v) + 6 * (sin(u) + 1) * cos(u),
        y: (u, v) => (5 - 2 * cos(u)) * sin(v),
        z: (u, v) => -16 * sin(u)
    }),
    "Mobius strip": new ParametricSurface({
        domain: new Domain([-1, 1], [0, 2 * PI]),
        x: (u, v) => (2 + u * cos(v / 2)) * cos(v),
        y: (u, v) => u * sin(v / 2),
        z: (u, v) => (2 + u * cos(v / 2)) * sin(v)
    }),
    "Torus": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 2 * PI]),
        x: (u, v) => cos(u) * (3 + 1.5 * cos(v)),
        y: (u, v) => sin(u) * (3 + 1.5 * cos(v)),
        z: (u, v) => 2 * sin(v)
    }),
    "Trefoil knot": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 2 * PI]),
        x: (u, v) => (3 * (1 + 1/4 * sin(3 * v)) + cos(u)) * cos(2 * v),
        y: (u, v) => (3 * (1 + 1/4 * sin(3 * v)) + cos(u)) * sin(2 * v),
        z: (u, v) => sin(u) + 2 * cos(3 * v)
    })
};

const surfacesRegistry = new Registry({
    label: "🌫️ Surface ",
    entries: surfaces
});

const contoursLayer = new ContoursLayer({
    resolution: new SurfaceResolution(50, 50),
    colorLayer: new ColorLayers().get(ColorLayers.GaussianCurvature)()
});
const principalLayer = new PrincipalDirectionsLayer({
    resolution: new SurfaceResolution(40, 40),
    scale: 0.2
});
principalLayer.visible = false;

const surfaceView = new SurfaceVisualization({
    material: new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true
    }),
    resolution: new SurfaceResolution(200, 200),
    colorLayer: new ColorLayers().get(ColorLayers.GaussianCurvature)(),
    opacity: 0.85
})
    .addOverlayLayer(principalLayer)
    .addOverlayLayer(contoursLayer);

const simulation = Simulation
    .with({
        htmlDivId: "parametricSurfacesContainer",
        fieldOfView: 20
    })
    .append(new DropdownMenu()
        .for(surfacesRegistry)
        .addEventListener("change", event => changeSurface(event.target.value))
    )
    .append(surfaceView.colorLayerUI())
    .append(surfaceView.ui())
    .append(new Checkbox("Contours ")
        .on(contoursLayer)
        .withProperty("visible")
        .checked(contoursLayer.visible)
        .togetherWith(new Checkbox("Principal directions ")
            .on(principalLayer)
            .checked(principalLayer.visible)
            .withProperty("visible")
        )
    );

function changeSurface(surfaceId) {
    const newSurface = surfacesRegistry.get(surfaceId);
    simulation.bind(newSurface.onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView);
    simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
}

changeSurface("Bow curve");
