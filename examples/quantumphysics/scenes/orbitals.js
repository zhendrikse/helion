import {
    Simulation, DropdownMenu, Domain, ParametricSurface, Registry,
    SurfaceResolution, SurfaceVisualization
} from "../../../src/index.js";

const orbitalSurface = radialFunction => new ParametricSurface({
    domain: new Domain([0, Math.PI], [0, 2 * Math.PI]),
    x: (theta, phi) => radialFunction(theta, phi) * Math.sin(theta) * Math.cos(phi),
    y: (theta, phi) => radialFunction(theta, phi) * Math.sin(theta) * Math.sin(phi),
    z: (theta, phi) => radialFunction(theta, phi) * Math.cos(theta)
});

const orbitals = {
    "1s": {
        definition: orbitalSurface(() => 1),
        latex: "1s"
    },
    "2pₓ": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) * Math.cos(phi))),
        latex: "2p_x"
    },
    "2pᵧ": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) * Math.sin(phi))),
        latex: "2p_y"
    },
    "2p_z": {
        definition: orbitalSurface((/** @type {number} */ theta) => 
            Math.abs(Math.cos(theta))),
        latex: "2p_z"
    },
    "3d_z²": {
        definition: orbitalSurface((/** @type {number} */ theta) => 
            Math.abs(3 * Math.cos(theta) ** 2 - 1)),
        latex: "3d_{z^2}"
    },
    "3d_xz": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) * Math.cos(theta) * Math.cos(phi))),
        latex: "3d_{xz}"
    },
    "3d_yz": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) * Math.cos(theta) * Math.sin(phi))),
        latex: "3d_{yz}"
    },
    "3d_x²₋z²": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) ** 2 * Math.cos(2 * phi))),
        latex: "3d_{x^2-z^2}"
    },
    "3d_xy": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) ** 2 * Math.sin(2 * phi))),
        latex: "3d_{xy}"
    },
    "4f_z³": {
        definition: orbitalSurface((/** @type {number} */ theta) => 
            Math.abs(5 * Math.cos(theta) ** 3 - 3 * Math.cos(theta))),
        latex: "4f_{z^3}"
    },
    "4f_xyz": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            2 * Math.abs(Math.sin(theta) ** 2 * Math.cos(theta) * Math.sin(2 * phi))),
        latex: "4f_{xyz}"
    },
    "4f_x(x²−3z²)": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) ** 3 * Math.cos(3 * phi))),
        latex: "4f_{x(x^2-3z^2)}"
    },
    "4f_z(x²−z²)": {
        definition: orbitalSurface((/** @type {number} */ theta, /** @type {number} */ phi) => 
            Math.abs(Math.sin(theta) ** 3 * Math.sin(3 * phi))),
        latex: "4f_{z(x^2-z^2)}"
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

/** @param {string} orbitalName */
function showOrbital(orbitalName) {
    const surface = orbitalRegistry.get(orbitalName).definition;
    simulation.bind(surface.onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView, {tickLabels: false, annotations: false});
    simulation.frameSceneOn(surfaceView, {padding: 0.8});
    simulation.setLatexTitle("\\Large{" + orbitalRegistry.get(orbitalName).latex + " }\\ \\text{orbital}");
}

simulation
    .append(new DropdownMenu()
        .for(orbitalRegistry)
        .withValue("2p_z")
        // @ts-ignore
        .onChange(event => showOrbital(event.target.value)));

showOrbital("2p_z");
