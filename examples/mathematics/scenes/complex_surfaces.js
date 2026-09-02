import {
    Simulation, DropdownMenu, Domain, Registry, Range, ComplexSurfaceView3D,
    SurfaceResolution, ComplexFunction, Complex, Slider, ComplexFieldSurface, ComplexSurfaceView2D, RadioGroup, Vec3
} from "../../../src/index.js";

const one = new Complex(1, 0);
const two = new Complex(2, 0);
const eps = new Complex(0.01, 0);

const functions = {
    "z * z + 2": {
        "function": new ComplexFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(z).add(two)
        }),
        "latex": "z^2+2"
    },
    "z * z * z + 2": {
        "function": new ComplexFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.clone().multiply(z).multiply(z).add(two)
        }),
        "latex": "z^3+2"
    },
    "z * z_bar": {
        "function": new ComplexFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(new Complex(z.re, -z.im))
        }),
        "latex": "z\\bar{z}"
    },
    "exp(z * z)": {
        "function": new ComplexFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z => z.multiply(z).exp()
        }),
        "latex": "e^{z^2}"
    },
    "log(z)": {
        "function": new ComplexFunction({
            domain: new Domain([-Math.PI, Math.PI], [-Math.PI, Math.PI]),
            func: z => z.log()
        }),
        "latex": "\\log{z}"
    },
    "sin(z)": {
        "function": new ComplexFunction({
            domain: new Domain([-Math.PI, Math.PI], [-Math.PI, Math.PI]),
            func: z => z.sin()
        }),
        "latex": "\\sin{z}"
    },
    "sqrt(z)": {
        "function": new ComplexFunction({
            domain: new Domain([-2, 2], [-2, 2]),
            func: z =>  z.add(eps).sqrt()
        }),
        "latex": "\\sqrt{z}"
    },
    "(z + 1) / (z - 1)": {
        "function": new ComplexFunction({
            domain: new Domain([-3, 3], [-3, 3]),
            func: z => z.clone().add(one).divide(z.clone().add(eps).subtract(one))
        }),
        "latex": "\\dfrac{z + 1}{z - 1}"
    },
    "z + 1 / z": {
        "function": new ComplexFunction({
            domain: new Domain([-3, 3], [-3, 3]),
            func: z => z.clone().add(one.divide(z.clone().add(eps)))
        }),
        "latex": "z + \\bigg(\\dfrac{1}{z}\\bigg)"
    }
};

const functionsRegistry = new Registry({
    label: "f(z) = ",
    entries: functions
});

class SurfaceController {
    constructor(simulation) {
        this._simulation = simulation;
        this._dimension3d = true;
    }

    changeSurface(surfaceId) {
        const func = functionsRegistry.get(surfaceId).function;
        const surface = new ComplexFieldSurface(func);
        this._simulation.bind(surface.onceWith(surfaceView));
        if (this._dimension3d) {
            this._simulation.provideAxesAround(surfaceView);
            this._simulation.frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
        }
        this._simulation.setLatexTitle("\\Large{f(z) = " + functionsRegistry.get(surfaceId).latex + "}");
    }

    set dimension3d(value) { this._dimension3d = value; }

    set animate(value) { this._animate = value; }
}

const surfaceView = new ComplexSurfaceView3D({
    defaultResolution: new SurfaceResolution(400, 400)
});

const surfaceView2D = new ComplexSurfaceView2D({
    defaultResolution: new SurfaceResolution(400, 400)
});

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


function setDimension(dimension3d = true) {
    waveFunctionSurface.visible = dimension3d;
    potentialBarrier.visible = dimension3d;
    waveFunctionSurface2d.visible = !dimension3d;
    potentialBarrier2d.visible = !dimension3d;
    simulation.cameraPosition = dimension3d ?
        new Vec3(-1, .7, .75).multiplyScalar(.75 * xMax) :
        new Vec3(0, 0, xMax)
}

const surfaceController = new SurfaceController(simulation);
simulation
    .append(new DropdownMenu()
        .for(functionsRegistry)
        .addEventListener("change", event => surfaceController.changeSurface(event.target.value)))
    .append(new RadioGroup()
        .add("2D", event => setDimension(false))
        .add("3D", event => setDimension(true))
        .checked(1))
    .append(surfaceView.ui())
    .append(new Slider("Maximum height: ")
        .on(surfaceView)
        .withProperty("maxHeight")
        .withRange(new Range(1, 10, .1))
        .withValue(4.0))

surfaceController.changeSurface("z * z + 2");
