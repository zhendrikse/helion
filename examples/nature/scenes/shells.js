import {
    Simulation, ParametricSurface, Domain, StandardSurfaceView, SurfaceResolution,
    ColorMappers, Registry, DropdownMenu
} from "../../../src/index.js";
import {MeshStandardMaterial} from "three";

const sin = Math.sin, cos = Math.cos, exp = Math.exp, PI = Math.PI;
const surfaces = {
    "Astroceras": new ParametricSurface({
        domain: new Domain([-40, -1], [0, 2 * PI]),
        x: (u, v) => (3.5 + 1.25 * cos(v)) * exp(0.12 * u) * cos(1 * u),
        y: (u, v) => (3.5 + 1.25 * cos(v)) * exp(0.12 * u) * sin(1 * u),
        z: (u, v) => (0 + 1.25 * sin(v)) * exp(0.12 * u)
    }),
    "Bellerophina": new ParametricSurface({
        domain: new Domain([-10, 1], [0, 2 * PI]),
        x: (u, v) => (0.75 + 0.85 * cos(v)) * exp(0.06 * u) * cos(1 * u),
        y: (u, v) => (0.75 + 0.85 * cos(v)) * exp(0.06 * u) * sin(1 * u),
        z: (u, v) => (0 + 1.2 * sin(v)) * exp(0.06 * u)
    }),
    "Conchoidal": new ParametricSurface({
        domain: new Domain([0, 6 * PI], [0, 2 * PI]),
        x: (u, v) => 1.2 ** u * (1 + cos(v)) * cos(u),
        y: (u, v) => 1.2 ** u * (1 + cos(v)) * sin(u),
        z: (u, v) => 1.2 ** u * sin(v) - 1.5 * 1.2 ** u
    }),
    "Euhoplites": new ParametricSurface({
        domain: new Domain([-40, -1], [0, 2 * PI]),
        x: (u, v) => (0.9 + 0.6 * cos(v)) * exp(0.1626 * u) * cos(1 * u),
        y: (u, v) => (0.9 + 0.6 * cos(v)) * exp(0.1626 * u) * sin(1 * u),
        z: (u, v) => (0 + 0.4 * sin(v)) * exp(0.1626 * u)
    }),
    "Mya arenaria": new ParametricSurface({
        domain: new Domain([-1, 0.52], [0, 2 * PI]),
        x: (u, v) => (0.9 + 0.85 * cos(v)) * exp(2.5 * u) * cos(3 * u),
        y: (u, v) => (0.9 + 0.85 * cos(v)) * exp(2.5 * u) * sin(3 * u),
        z: (u, v) => (0 + 1.6 * sin(v)) * exp(2.5 * u)
    }),
    "Nautilus": new ParametricSurface({
        domain: new Domain([-20, 1], [0, 2 * PI]),
        x: (u, v) => (1 + 1 * cos(v)) * exp(0.18 * u) * cos(1 * u),
        y: (u, v) => (1 + 1 * cos(v)) * exp(0.18 * u) * sin(1 * u),
        z: (u, v) => (0 + 0.6 * sin(v)) * exp(0.12 * u)
    }),
    "Pseudoheliceras subcatenatum": new ParametricSurface({
        domain: new Domain([-45, -1], [0, 2 * PI]),
        x: (u, v) => (1.5 + 1.6 * cos(v)) * exp(0.075 * u) * cos(1 * u),
        y: (u, v) => (1.5 + 1.6 * cos(v)) * exp(0.075 * u) * sin(1 * u),
        z: (u, v) => (-7 + 1.6 * sin(v)) * exp(0.075 * u)
    }),
    "Sea shell": new ParametricSurface({
        domain: new Domain([0, 2 * PI], [0, 2 * PI]),
        x: (u, v) => 2 * (1 - v / (2 * PI)) * cos(3 * v) * (1 + cos(u)) + 0.25 * cos(3 * v),
        y: (u, v) => 2 * (1 - v / (2 * PI)) * sin(3 * v) * (1 + cos(u)) + 0.25 * sin(3 * v),
        z: (u, v) => (7 * v / (2 * PI)) + 2 * (1 - v / (2 * PI)) * sin(u)
    })
};

const surfacesRegistry = new Registry({
    id: "shellsSelect",
    label: "Specie: ",
    entries: surfaces
});

const surfaceView = new StandardSurfaceView({
    material: new MeshStandardMaterial({
        metalness: 0.5,
        roughness: 0.5,
    }),
    opacity: 0.95,
    surfaceResolution: new SurfaceResolution(200, 200),
    contourResolution: new SurfaceResolution(100, 50),
    colorMapper: ColorMappers.get(ColorMap.RdYlBu)
});

const simulation = Simulation
    .with({
        htmlDivId: "shellsContainer",
        fieldOfView: 20
    })
    .onClockTick(() => surfaceView.rotation.y += 0.0167)
    .append(new DropdownMenu()
        .for(surfacesRegistry)
        .addEventListener("change", event => changeSurface(event.target.value)))
    .append(surfaceView.colormapSelector)
    .append(surfaceView.surfaceLayoutSelector)
    .start();

function changeSurface(surfaceId) {
    const newSurface = surfacesRegistry.get(surfaceId);
    surfaceView.dispose();
    simulation.synchronize(newSurface.onceWith(surfaceView));
    simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
}

changeSurface("Sea shell");

