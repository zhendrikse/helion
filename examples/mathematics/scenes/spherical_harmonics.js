import {
    Simulation, ParametricSurface, Domain, Registry, Slider, Range, Vec3,
    SurfaceVisualization, SurfaceResolution, ContoursLayer, Checkbox, DropdownMenu
} from "../../../src/index.js";

const PI = Math.PI;

// Old demo r(u,v) strings use ^ for exponent and sin/cos with pi
function rFunctionFromString(expr) {
    const js = expr
        .replace(/\^/g, "**")
        .replace(/\bsin\b/g, "Math.sin")
        .replace(/\bcos\b/g, "Math.cos")
        .replace(/\bPI\b/g, "Math.PI")
        .replace(/\bpi\b/g, "Math.PI");
    return new Function("u", "v", `return (${js});`);
}

function makeSurface(rExpr) {
    const rFn = rFunctionFromString(rExpr);
    return new ParametricSurface({
        domain: new Domain([-PI, PI], [0, PI]),
        // Helion ParametricSurface does target.set(x, z, y) -> world Y = z, Z = y
        // old yFn=cos(u) is up, so we put cos in z to get world Y
        x: (u, v) => Math.sin(u) * Math.cos(v) * rFn(u, v),
        y: (u, v) => Math.sin(u) * Math.sin(v) * rFn(u, v),
        z: (u, v) => Math.cos(u) * rFn(u, v),
    });
}

const surfaceData = [
    { r: "sin(2 * u)^0 + cos(6 * u)^1 + sin(2 * v)^2 + cos(6 * v)^2", intervals: [["-pi","pi"],["0","pi"]] },
    { r: "sin(2 * u)^4 + cos(2 * u)^4 + sin(4 * v)^2 + cos(4 * v)^2", intervals: [["-pi","pi"],["0","pi"]] },
    { r: "sin(2 * u)^4 + cos(2 * u)^3 + sin(2 * v)^4 + cos(2 * v)^3", intervals: [["-pi","pi"],["0","pi"]] },
    { r: "sin(4 * u)^4 + cos(4 * u)^3 + sin(4 * v)^2 + cos(4 * v)^1", intervals: [["-pi","pi"],["0","pi"]] },
    { r: "sin(2 * u)^2 + cos(4 * u)^4 + sin(2 * v)^2 + cos(4 * v)^4", intervals: [["-pi","pi"],["0","pi"]] },
];

const presets = {
    "Preset 1": surfaceData[0],
    "Preset 2": surfaceData[1],
    "Preset 3": surfaceData[2],
    "Preset 4": surfaceData[3],
    "Preset 5": surfaceData[4],
};
const presetRegistry = new Registry({ label: "Preset ", entries: presets });

let currentR = surfaceData[0].r;
let currentSurface = makeSurface(currentR);

const contoursLayer = new ContoursLayer({
    resolution: new SurfaceResolution(100, 100),
    contourSegments: 100
});
contoursLayer.visible = false;

const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(128, 128),
    opacity: 0.95
}).addOverlayLayer(contoursLayer);

const simulation = Simulation.with({
    htmlDivId: "sphericalHarmonicsContainer",
    camera: { fieldOfView: 20 },
    headUpDisplay: { enabled: false }
}).bind(currentSurface.onceWith(surfaceView))
  .provideAxesAround(surfaceView)
  .frameSceneOn(surfaceView, { padding: 0.9, translationY: -2 });

function updateSurface(rExpr) {
    try {
        const next = makeSurface(rExpr);
        currentR = rExpr;
        currentSurface = next;
        simulation.bind(next.onceWith(surfaceView));
        simulation.provideAxesAround(surfaceView);
        simulation.frameSceneOn(surfaceView, { padding: 0.9, translationY: -2 });
        simulation.setLatexTitle(`r=${rExpr}\\newline\\quad \\newline \\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=r\\begin{pmatrix}sin(u)cos(v)\\\\cos(u)\\\\sin(u)sin(v)\\end{pmatrix}, u\\in[-\\pi,\\pi], v\\in[0,\\pi]`);
        if (customInput) { customInput.value = rExpr; customInput.style.borderColor=""; }
    } catch (e) {
        if (customInput) customInput.style.borderColor="red";
        console.error(e);
    }
}

// Preset
simulation.append(new DropdownMenu().for(presetRegistry).addEventListener("change", e => {
    // @ts-ignore
    const preset = presetRegistry.get(e.target.value);
    updateSurface(preset.r);
}));

// Contours — replaces old ViewParameters/ContourParameters
simulation.append(
    new Checkbox("Contours ").on(contoursLayer).withProperty("visible").checked(contoursLayer.visible)
        .togetherWith(new Checkbox("Wireframe ").on(surfaceView.surfaceLayer).withProperty("wireframe"))
);

// Custom R(u,v) — replaces old LiteralStringBasedSurfaceDefinition math folder
const customRow = document.createElement("div");
customRow.style.display = "flex";
customRow.style.gap = "6px";
customRow.style.alignItems = "center";
customRow.style.marginBottom = "5px";
const customLabel = document.createElement("label");
customLabel.textContent = "R(u,v) =";
customLabel.style.fontSize = "12px";
customLabel.style.marginRight = "5px";
const customInput = document.createElement("input");
customInput.type = "text";
customInput.value = currentR;
customInput.style.flex = "1";
customInput.style.minWidth = "280px";
customInput.placeholder = "e.g. sin(2*u)**2 + cos(4*v)**2";
const customBtn = document.createElement("button");
customBtn.textContent = "Apply";
customBtn.style.padding = "2px 8px";
customBtn.onclick = () => updateSurface(customInput.value);
customInput.onkeydown = e => { if (e.key === "Enter") customBtn.click(); };
customRow.append(customLabel, customInput, customBtn);

// append via dummy HtmlControl-like wrapper to hook into Helion controlsDiv
const customControl = {
    append(controlsDiv) { controlsDiv.appendChild(customRow); return this; },
    to(sim) { return this; }
};
simulation.append(customControl);

updateSurface(currentR);
