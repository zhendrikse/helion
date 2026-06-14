import {
    Simulation, ParametricSurface, Domain, StandardSurfaceView, DropdownMenu, Registry
} from "../../../src/index.js";

const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const log = Math.log;
const PI = Math.PI;

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

const surfaceView = new StandardSurfaceView({
    scalarFieldType: "GaussianCurvature",
    opacity: 0.925
});

const container = document.getElementById("parametricSurfacesContainer");
const simulation = Simulation
    .in(container)
    .with({})
    .start();

const surfacesRegistry = new Registry({
    id: "parametricSurfaceSelect",
    label: "Surface ",
    entries: surfaces
});

function changeSurface(surfaceId) {
    const newSurface = surfacesRegistry.get(surfaceId);
    surfaceView.dispose();
    simulation.synchronize(newSurface.onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView);
    simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
}

new DropdownMenu(container)
    .for(surfacesRegistry)
    .addEventListener("change", event => changeSurface(event.target.value));
surfaceView.showColormapSelectorIn(container);
surfaceView.showScalarFieldSelectorIn(container);
surfaceView.showSurfaceControlsIn(container);

changeSurface("Bow curve");
