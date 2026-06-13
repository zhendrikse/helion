import { toColorString } from "../../colormappers.js";

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
        this._context = null;
    }

    set context(context) { this._context = context; }

    bind(complexPlaneWave) {
        // Sanity checks
        if (!complexPlaneWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._complexPlaneWave = complexPlaneWave;
    }

    set mode(mode) { this._mode = mode; }

    _plotDensityPhase(){
        for (let x = 0; x < this._width; x++) {
            const phase = this._complexPlaneWave.valueAt(x * 0.02).phase;
            const normalizedPhase = (phase % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); // altijd 0..2π
            const colorIndex = Math.floor(normalizedPhase / (2 * Math.PI) * this._nColors);
            this._context.strokeStyle = this._phaseColors[colorIndex];
            this._context.beginPath();
            this._context.moveTo(x, 0);
            this._context.lineTo(x, this._height);
            this._context.stroke();
        }
    }

    _plotAxis(centerY) {
        // x-axis
        this._context.strokeStyle = "gray";
        this._context.beginPath();
        this._context.moveTo(0, centerY);
        this._context.lineTo(this._width, centerY);
        this._context.stroke();
    }

    _plotReal(centerY) {
        this._context.strokeStyle = "#ffc000";
        this._context.beginPath();
        for (let x = 0; x < this._width; x++) {
            const psi = this._complexPlaneWave.valueAt(x * 0.02);
            const y = centerY - psi.re * this._scaleY;
            if (x === 0) this._context.moveTo(x, y);
            else this._context.lineTo(x, y);
        }
        this._context.stroke();
    }

    _plotImag(centerY) {
        this._context.strokeStyle = "#00d0ff";
        this._context.beginPath();
        for (let x = 0; x < this._width; x++) {
            const psi = this._complexPlaneWave.valueAt(x * 0.02);
            const y = centerY - psi.im * this._scaleY;
            if (x === 0) this._context.moveTo(x, y);
            else this._context.lineTo(x, y);
        }
        this._context.stroke();
    }

    _plotRealImage(centerY) {
        this._plotReal(centerY);

        if (this._showImaginary)
            this._plotImag(centerY);
    }

    render() {
        const centerY = this._height / 2;

        // Clear canvas
        this._context.fillStyle = "black";
        this._context.fillRect(0, 0, this._width, this._height);

        this._plotAxis(centerY);

        if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.REAL_IMAG)
            this._plotRealImage(centerY);
        else if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.DENSITY_PHASE)
            this._plotDensityPhase();
    }
}