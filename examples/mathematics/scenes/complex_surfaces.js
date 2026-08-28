import {
    Simulation, DropdownMenu, Domain, Registry, Range, ComplexSurfaceView,
    SurfaceResolution, ComplexFunctionSurface, Complex, Slider
} from "../../../src/index.js";

const one = new Complex(1, 0);
const two = new Complex(2, 0);
const eps = new Complex(0.01, 0);

const surfaces = {
    "z * z * z + 2": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.clone().multiply(z).multiply(z).add(two)
        }),
        "latex": "z^3+2"
    },
    "z * z + 2": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(z).add(two)
        }),
        "latex": "z^2+2"
    },
    "z * z_bar": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(new Complex(z.re, -z.im))
        }),
        "latex": "z\\bar{z}"
    },
    "exp(z * z)": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(z).exp()
        }),
        "latex": "e^{z^2}"
    },
    "log(z)": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-Math.PI, Math.PI], [-Math.PI, Math.PI]),
            func: z => z.log()
        }),
        "latex": "\\log{z}"
    },
    "sin(z)": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-Math.PI, Math.PI], [-Math.PI, Math.PI]),
            func: z => z.sin()
        }),
        "latex": "\\sin{z}"
    },
    "sqrt(z)": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z =>  z.add(eps).sqrt()
        }),
        "latex": "\\sqrt{z}"
    },
    "(z + 1) / (z - 1)": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-3, 3], [-3, 3]),
            func: z => z.clone().add(one).divide(z.clone().subtract(one))
        }),
        "latex": "\\dfrac{z + 1}{z - 1}"
    },
    "z + 1 / z": {
        "surface": new ComplexFunctionSurface({
            domain: new Domain([-3, 3], [-3, 3]),
            func: z => z.clone().add(one.divide(z.clone().add(eps)))
        }),
        "latex": "z + \\bigg(\\dfrac{1}{z}\\bigg)"
    }
};

const surfacesRegistry = new Registry({
    label: "f(z) = ",
    entries: surfaces
});

class SurfaceController {
    constructor(simulation) {
        this._simulation = simulation;
        this._currentSurface = surfacesRegistry.get("z * z * z + 2").surface;
    }

    changeSurface(surfaceId) {
        this._currentSurface = surfacesRegistry.get(surfaceId).surface;
        this._simulation.bind(this._currentSurface.onceWith(surfaceView));
        this._simulation.provideAxesAround(surfaceView);
        this._simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
        this._simulation.setLatexTitle("\\Large{f(z) = " + surfacesRegistry.get(surfaceId).latex + "}");
    }

    set animate(value) { this._animate = value; }
}

const surfaceView = new ComplexSurfaceView({
        resolution: new SurfaceResolution(200, 200)
    }
);

const simulation = Simulation
    .with({
        htmlDivId: "complexSurfacesContainer",
        headUpDisplay: {
            enabled: false
        },
        infoPanel: {
            text: "<strong>Complex functions 🍭</strong><br>\n" +
                "Height compression: The modulus $\\|f(z)\\|$\n" +
                " is compressed using a hyperbolic tangent to prevent poles and large values from dominating the visualization. " +
                "$$h=H_\\text{max}\\tanh\\left(\\dfrac{\\|f(z)\\|}{H_\\text{max}}\\right)$$" +
                "<b>Note</b>: The displayed height is therefore not the exact modulus for large values."
        },
        camera: {
            fieldOfView: 20
        },
        parameterMenuCollapsed: false
    });

const surfaceController = new SurfaceController(simulation);
simulation
    .append(new DropdownMenu()
        .for(surfacesRegistry)
        .addEventListener("change", event => surfaceController.changeSurface(event.target.value)))
    .append(new Slider("Maximum height: ")
        .on(surfaceView)
        .withProperty("maxHeight")
        .withRange(new Range(1, 10, .1))
        .withValue(4.0))

surfaceController.changeSurface("z * z * z + 2");
