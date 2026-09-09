import {
    Simulation, DropdownMenu, Domain, ParametricSurface, Registry,
    SurfaceResolution, SurfaceVisualization, AdaptiveSymmetricNormalizer,
    DifferentialFrame
} from "../../../src/index.js";
import { ColorMappers } from "../../../src/view/colormappers.js";

const PI = Math.PI;
const eps = 1e-3;
// Domain with 1e-3 offset mitigates pole-singularity detI≈0 (G≈0) in diffgeometry.js.
const domain = new Domain([eps, PI - eps], [0, 2 * PI]);

/** @param {(theta: number, phi: number) => number} Y */
function orbitalSurface(Y) {
    
    /** @type {(theta: number, phi: number) => number} Y */
    const rAbs = (theta, phi) => Math.abs(Y(theta, phi));
    return new ParametricSurface({
        domain,
        x: (theta, phi) => rAbs(theta, phi) * Math.sin(theta) * Math.cos(phi),
        y: (theta, phi) => rAbs(theta, phi) * Math.sin(theta) * Math.sin(phi),
        z: (theta, phi) => rAbs(theta, phi) * Math.cos(theta)
    });
}

// phase color: - → blue, + → red (diverging). Use sign of Y, not |Y|.
class PhaseLayer {
    /** @param {(theta: number, phi: number) => number} Y */
    constructor(Y) { this.Y = Y; }

    /** @param {DifferentialFrame} frame */
    value(frame) {
        const p = frame.position;
        const r = Math.hypot(p.x, p.y, p.z);
        if (r < 1e-12) return 0;

        const theta=domain.xRange.scaleUnitParameter(frame.u);
        const phi=domain.yRange.scaleUnitParameter(frame.v);
        return this.Y(theta, phi);
    }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.RdYlBu)(); }
    preferredNormalizer() { return new AdaptiveSymmetricNormalizer(); }
}

// genormaliseerde reële Y_l^m (vereenvoudigd: factor weggelaten voor gelijke visuele schaal,
// vorm identiek; echte factor bv. p_z=√(3/4π)cosθ). Hier alleen hoekvorm, schaal genormaliseerd op ~1.
const orbitals = {
    "1s": { 
        Y: () => 1, 
        latex: "1s" 
    },
    "2p_x": { 
        Y: (t,p) => Math.sin(t) * Math.cos(p), 
        latex: "2p_x" 
    },
    "2p_y": { 
        Y: (t,p) => Math.sin(t) * Math.sin(p), 
        latex: "2p_y" 
    },
    "2p_z": { 
        Y: (t) => Math.cos(t), 
        latex: "2p_z" 
    },
    "3d_z²": { 
        Y: (t) => 3 * Math.cos(t) ** 2 - 1, 
        latex: "3d_{z^2}" 
    },
    "3d_xz": { 
        Y: (t,p) => Math.sin(t) * Math.cos(t) * Math.cos(p), 
        latex: "3d_{xz}" 
    },
    "3d_yz": { 
        Y: (t,p) => Math.sin(t) * Math.cos(t) * Math.sin(p), 
        latex: "3d_{yz}" 
    },
    "3d_x²-y²": { 
        Y: (t,p) => Math.sin(t) ** 2 * Math.cos(2 * p), 
        latex: "3d_{x^2-y^2}" 
    },
    "3d_xy": { 
        Y: (t,p) => Math.sin(t) ** 2 * Math.sin(2 * p), 
        latex: "3d_{xy}" 
    },
    "4f_z³": { 
        Y: (t) => 5 * Math.cos(t) ** 3 - 3 * Math.cos(t), 
        latex: "4f_{z^3}" 
    },
    "4f_x(5z²-r²)": { 
        Y: (t,p) => Math.sin(t) * (5 * Math.cos(t) ** 2 - 1) * Math.cos(p), 
        latex: "4f_{x(5z^2-r^2)}" 
    },
    "4f_y(5z²-r²)": { 
        Y: (t,p) => Math.sin(t) * (5 * Math.cos(t) ** 2 - 1) * Math.sin(p), 
        latex: "4f_{y(5z^2-r^2)}" 
    },
    "4f_xyz": { 
        Y: (t,p) => Math.sin(t) ** 2 * Math.cos(t) * Math.sin(2 * p), 
        latex: "4f_{xyz}" 
    },
    "4f_z(x²-y²)": { 
        Y: (t,p) => Math.sin(t) ** 2 * Math.cos(t) * Math.cos(2 * p), 
        latex: "4f_{z(x^2-y^2)}" 
    },
    "4f_x(x²-3y²)": { 
        Y: (t,p) => Math.sin(t) ** 3 * Math.cos(3 * p), 
        latex: "4f_{x(x^2-3y^2)}" 
    },
    "4f_y(3x²-y²)": { 
        Y: (t,p) => Math.sin(t) ** 3 * Math.sin(3 * p), 
        latex: "4f_{y(3x^2-y^2)}" 
    },
};

const orbitalRegistry = new Registry({ label: "Orbital ", entries: orbitals });

const phaseLayer = new PhaseLayer(orbitals["2p_z"].Y);
const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(100, 100),
    colorLayer: phaseLayer,
    opacity: 1
});

const simulation = Simulation.with({
    htmlDivId: "orbitalsContainer",
    infoPanel: {
        text: "<strong>⚛️ Atomic orbitals</strong><br/>Polar plots $r=|Y_l^m(θ,φ)|$ of real spherical harmonics.<br/>" + 
            "Shape from $|Y|$ (e.g. two lobes for $p$), color (RdYlBu) = sign → phase ±.<br/>" + 
            "Full $ψ_{n,l,m}=R_{n,l}(r)Y_{l,m}$: radial part $R$ and nodes (e.g. $2s$) omitted, " + 
            "scale $∝n^2a_0$ not to scale."
    },
    headUpDisplay: { enabled: false },
    camera: { fieldOfView: 20 },
    parameterMenuCollapsed: false
});

function showOrbital(name) {
    const entry = orbitalRegistry.get(name);
    phaseLayer.Y = entry.Y;
    // hergebruik zelfde view → Simulation.bind vervangt binding i.p.v. stapelen
    simulation.bind(orbitalSurface(entry.Y).onceWith(surfaceView));
    simulation.provideAxesAround(surfaceView, { tickLabels: false, annotations: false });
    simulation.frameSceneOn(surfaceView, { padding: 0.8 });
    simulation.setLatexTitle(`\\Large{${entry.latex}}\\ \\text{orbital}\\ (Y_{l}^{m},\\ r=|Y|)`);
}

simulation.append(new DropdownMenu().for(orbitalRegistry).withValue("2p_z").onChange(e => showOrbital(e.target.value)));
showOrbital("2p_z");
