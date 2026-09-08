import {
    Simulation, DropdownMenu, Domain, ParametricSurface, Registry,
    SurfaceResolution, SurfaceVisualization
} from "../../../src/index.js";

const orbitalSurface = radialFunction => new ParametricSurface({
    domain: new Domain([-Math.PI, Math.PI], [0, Math.PI]),
    x: (u, v) => radialFunction(u, v) * Math.sin(u) * Math.cos(v),
    y: (u, v) => radialFunction(u, v) * Math.cos(u),
    z: (u, v) => radialFunction(u, v) * Math.sin(u) * Math.sin(v)
});

const orbitals = {
    "1s": orbitalSurface(() => 1),
    "2pₓ": orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(v))),
    "2pᵧ": orbitalSurface(u => Math.abs(Math.cos(u))),
    "2p_z": orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.sin(v))),
    "3d_z²": orbitalSurface(u => Math.abs(3 * Math.cos(u) ** 2 - 1)),
    "3d_xz": orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(u) * Math.cos(v))),
    "3d_yz": orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(u) * Math.sin(v))),
    "3d_x²₋z²": orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 2 * Math.cos(2 * v))),
    "3d_xy": orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 2 * Math.sin(2 * v))),
    "4f_z³": orbitalSurface(u => Math.abs(5 * Math.cos(u) ** 3 - 3 * Math.cos(u))),
    "4f_xyz": orbitalSurface((u, v) => 2 * Math.abs(Math.sin(u) ** 2 * Math.cos(u) * Math.sin(2 * v))),
    "4f_x(x²−3z²)": orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 3 * Math.cos(3 * v))),
    "4f_z(x²−z²)": orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 3 * Math.sin(3 * v)))
};

const orbitalRegistry = new Registry({
    label: "Orbital ",
    entries: orbitals
});

const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(125, 125)
});

const simulation = Simulation.with({
    htmlDivId: "orbitalsContainer",
    headUpDisplay: {enabled: false},
    camera: {fieldOfView: 20},
    parameterMenuCollapsed: false
});

function showOrbital(name) {
    const surface = orbitalRegistry.get(name);
    simulation.bind(surface.onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView);
    simulation.frameSceneOn(surfaceView, {padding: 0.9});
    simulation.setLatexTitle("\\Large{" + name + " orbital}");
}

simulation
    .append(new DropdownMenu()
        .for(orbitalRegistry)
        .addEventListener("change", event => showOrbital(event.target.value)));

showOrbital("4f_z³");
