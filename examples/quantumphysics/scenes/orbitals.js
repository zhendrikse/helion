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
    "1s": {
        definition: orbitalSurface(() => 1),
        latex: "1s"
    },
    "2pₓ": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(v))),
        latex: "2p_x"
    },
    "2pᵧ": {
        definition: orbitalSurface(u => Math.abs(Math.cos(u))),
        latex: "2p_y"
    },
    "2p_z": { 
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.sin(v))),
        latex: "2p_z"
    },
    "3d_z²": {
        definition: orbitalSurface(u => Math.abs(3 * Math.cos(u) ** 2 - 1)),
        latex: "3d_{z^2}"
    },
    "3d_xz": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(u) * Math.cos(v))),
        latex: "3d_{xz}"
    },
    "3d_yz": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) * Math.cos(u) * Math.sin(v))),
        latex: "3d_{yz}"
    },
    "3d_x²₋z²": { 
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 2 * Math.cos(2 * v))),
        latex: "3d_{x^2₋z^2}"
    },
    "3d_xy": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 2 * Math.sin(2 * v))),
        latex: "3d_{xy}"
    },
    "4f_z³": {
        definition: orbitalSurface(u => Math.abs(5 * Math.cos(u) ** 3 - 3 * Math.cos(u))),
        latex: "4f_{xyz}"
    },
    "4f_xyz": {
        definition: orbitalSurface((u, v) => 2 * Math.abs(Math.sin(u) ** 2 * Math.cos(u) * Math.sin(2 * v))),
        latex: "4f_{xyz}"
    },
    "4f_x(x²−3z²)": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 3 * Math.cos(3 * v))),
        latex: "4f_{x(x^2−3z^2)}"
    },
    "4f_z(x²−z²)": {
        definition: orbitalSurface((u, v) => Math.abs(Math.sin(u) ** 3 * Math.sin(3 * v))),
        latex: "4f_{z(x^2−z^2)}"
    }
};

const orbitalRegistry = new Registry({
    label: "Orbital ",
    entries: orbitals
});

const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(200, 200)
});

const simulation = Simulation.with({
    htmlDivId: "orbitalsContainer",
    headUpDisplay: {enabled: false},
    camera: {fieldOfView: 20},
    parameterMenuCollapsed: false
});

function showOrbital(name) {
    const surface = orbitalRegistry.get(name).definition;
    simulation.bind(surface.onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView, {tickLabels: false, annotations: false});
    simulation.frameSceneOn(surfaceView, {padding: 0.8});
    simulation.setLatexTitle("\\Large{" + orbitalRegistry.get(name).latex + " }\\ \\text{orbital}");
}

simulation
    .append(new DropdownMenu()
        .for(orbitalRegistry)
        .withValue("4f_xyz")
        .onChange(event => showOrbital(event.target.value)));

showOrbital("4f_xyz");
