import { Renderer} from "../../simulation.js";

/** Utility function to convert a number to a two-digit hex string (from stackoverflow): */
function numberToTwoDigitHexString(numberToConvert) {
    const hex = numberToConvert.toString(16); // 16 is necessary for conversion to hex string!
    return hex.length === 1 ? "0" + hex : hex;
}

/** Utility function to create a hex color string for a given hue (between 0 and 1): */
export function toColorString(hue) {
    let r, g, b;
    if (hue < 1/6) { // red to yellow
        r = 255; g = Math.round(hue * 6 * 255);
        b = 0;
    } else if (hue < 1/3) { // yellow to green
        r = Math.round((1/3 - hue) * 6 * 255);
        g = 255;
        b = 0;
    } else if (hue < 1/2) { // green to cyan
        r = 0;
        g = 255;
        b = Math.round((hue - 1/3) * 6 * 255);
    } else if (hue < 2/3) { // cyan to blue
        r = 0;
        g = Math.round((2/3 - hue) * 6 * 255);
        b = 255;
    } else if (hue < 5/6) { // blue to magenta
        r = Math.round((hue - 2/3) * 6 * 255);
        g = 0;
        b = 255;
    } else { // magenta to red
        r = 255;
        g = 0;
        b = Math.round((1 - hue) * 6 * 255);
    }
    return "#" + numberToTwoDigitHexString(r) + numberToTwoDigitHexString(g) + numberToTwoDigitHexString(b);
}

export class Canvas2DRenderer extends Renderer {
    static on = (canvasWrapperDiv) => new Canvas2DRenderer(canvasWrapperDiv);

    constructor(canvasWrapperDiv) {
        super(canvasWrapperDiv);
        this._canvas = canvasWrapperDiv.canvas;
        this._context = this._canvasWrapperDiv.canvas.htmlCanvas.getContext("2d");
        this._dynamicObjects = [];
        this._staticObjects = [];
    }

    initialize() {
        this._staticObjects.forEach(obj => obj.render?.(this._context));
    }

    synchronize(bodyAndView) {
        // Tie the body state to its associated view
        if (!bodyAndView.view.attachTo)
            throw new Error("Use addPlainObject() to attach regular Three.js objects!");

        if (bodyAndView.always)
            this._dynamicObjects.push(bodyAndView.view);
        else
            this._staticObjects.push(bodyAndView.view);

        bodyAndView.view.attachTo(bodyAndView.body);
    }

    render(transform) {
        this._context.clearRect(0, 0, this._canvas.clientWidth, this._canvas.clientHeight);
        this._dynamicObjects.forEach(obj => obj.render?.(this._context));
    }

    reset() {
        this._dynamicObjects.forEach(obj => obj.reset?.());
    }
}

/*************
 * V I E W S *
 *************/

export class OneDimensionalComplexPlaneWave2D {
    static Mode = Object.freeze({
        DENSITY_PHASE: "densityPhase",
        REAL_IMAG: "realImag"
    });
    constructor({
        width = 800,
        height = 400,
        scaleY = 100,
        showImaginary = true,
        mode = OneDimensionalComplexPlaneWave2D.Mode.DENSITY_PHASE,
        nColors = 360
    } = {}) {
        this._complexPlaneWave = null;
        this._width = width;
        this._height = height;
        this._scaleY = scaleY;
        this._showImaginary = showImaginary;
        this._mode = mode;

        // Precompute color map for phase visualization
        this._phaseColors = new Array(nColors + 1);
        for (let c = 0; c <= nColors; c++) {
            this._phaseColors[c] = toColorString(c / nColors);
        }
        this._nColors = nColors;
    }

    attachTo(complexPlaneWave) {
        // Sanity checks
        if (!complexPlaneWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._complexPlaneWave = complexPlaneWave;
    }

    set mode(mode) { this._mode = mode; }

    _plotDensityPhase(context){
        for (let x = 0; x < this._width; x++) {
            const phase = this._complexPlaneWave.valueAt(x * 0.02).phase();
            const normalizedPhase = (phase % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); // altijd 0..2π
            const colorIndex = Math.floor(normalizedPhase / (2 * Math.PI) * this._nColors);
            context.strokeStyle = this._phaseColors[colorIndex];
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, this._height);
            context.stroke();
        }
    }

    _plotAxis(context, centerY) {
        // x-axis
        context.strokeStyle = "gray";
        context.beginPath();
        context.moveTo(0, centerY);
        context.lineTo(this._width, centerY);
        context.stroke();
    }

    _plotReal(context, centerY) {
        context.strokeStyle = "#ffc000";
        context.beginPath();
        for (let x = 0; x < this._width; x++) {
            const psi = this._complexPlaneWave.valueAt(x * 0.02);
            const y = centerY - psi.re * this._scaleY;
            if (x === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.stroke();
    }

    _plotImag(context, centerY) {
        context.strokeStyle = "#00d0ff";
        context.beginPath();
        for (let x = 0; x < this._width; x++) {
            const psi = this._complexPlaneWave.valueAt(x * 0.02);
            const y = centerY - psi.im * this._scaleY;
            if (x === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.stroke();
    }

    _plotRealImage(context, centerY) {
        this._plotReal(context, centerY);

        if (this._showImaginary)
            this._plotImag(context, centerY);
    }

    render(context) {
        const centerY = this._height / 2;

        // Clear canvas
        context.fillStyle = "black";
        context.fillRect(0, 0, this._width, this._height);

        this._plotAxis(context, centerY);

        if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.REAL_IMAG)
            this._plotRealImage(context, centerY);
        else if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.DENSITY_PHASE)
            this._plotDensityPhase(context);
    }
}