import {toColorString} from "../canvassim.js";

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
            const phase = this._complexPlaneWave.valueAt(x * 0.02).phase;
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