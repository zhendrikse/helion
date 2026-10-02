import {Renderable2D} from "../../renderer.js";
import {hsvToRgb} from "../../colormappers.js";
import {ComplexFunctionSample} from "../../../model/math/fields.js";

export class OneDimensionalComplexPlaneWave2D extends Renderable2D {
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
        super();
        this._width = width;
        this._height = height;
        this._scaleY = scaleY;
        this._showImaginary = showImaginary;
        this._mode = mode;

        this._phaseColors = new Array(nColors + 1);
        for (let c = 0; c <= nColors; c++)
            this._phaseColors[c] = hsvToRgb(c / nColors).asHexString();

        this._nColors = nColors;
        this._context = null;
        this._sample = new ComplexFunctionSample();
    }

    set context(context) { this._context = context; }

    canBindTo(waveFunction) {
        if (waveFunction.ny !== 1 || typeof waveFunction.sample !== "function")
            throw new Error('OneDimensionalComplexPlaneWave2D needs a one-dimensional complex field.');
        return true;
    }

    set mode(mode) { this._mode = mode; }

    _plotDensityPhase(waveFunction) {
        for (let x = 0; x < this._width; x++) {
            const normalizedX = x / (this._width - 1);
            waveFunction.sample(normalizedX, 0, this._sample);

            // ComplexFunctionSample.phase is normalized to one full turn.
            const normalizedPhase = (this._sample.phase % 1 + 1) % 1;
            const colorIndex = Math.floor(normalizedPhase * this._nColors);

            this._context.strokeStyle = this._phaseColors[colorIndex];
            this._context.beginPath();
            this._context.moveTo(x, 0);
            this._context.lineTo(x, this._height);
            this._context.stroke();
        }
    }

    _plotAxis(centerY) {
        this._context.strokeStyle = "gray";
        this._context.beginPath();
        this._context.moveTo(0, centerY);
        this._context.lineTo(this._width, centerY);
        this._context.stroke();
    }

    _plotReal(waveFunction, centerY) {
        this._context.strokeStyle = "#ffc000";
        this._context.beginPath();

        for (let x = 0; x < this._width; x++) {
            const normalizedX = x / (this._width - 1);
            waveFunction.sample(normalizedX, 0, this._sample);
            const y = centerY - this._sample.output.re * this._scaleY;

            if (x === 0) this._context.moveTo(x, y);
            else this._context.lineTo(x, y);
        }

        this._context.stroke();
    }

    _plotImag(waveFunction, centerY) {
        this._context.strokeStyle = "#00d0ff";
        this._context.beginPath();

        for (let x = 0; x < this._width; x++) {
            const normalizedX = x / (this._width - 1);
            waveFunction.sample(normalizedX, 0, this._sample);
            const y = centerY - this._sample.output.im * this._scaleY;

            if (x === 0) this._context.moveTo(x, y);
            else this._context.lineTo(x, y);
        }

        this._context.stroke();
    }

    _plotRealImag(waveFunction, centerY) {
        this._plotReal(waveFunction, centerY);

        if (this._showImaginary)
            this._plotImag(waveFunction, centerY);
    }

    synchronizeWith(waveFunction) {
        const centerY = this._height / 2;

        this._context.fillStyle = "black";
        this._context.fillRect(0, 0, this._width, this._height);

        this._plotAxis(centerY);

        if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.REAL_IMAG)
            this._plotRealImag(waveFunction, centerY);
        else if (this._mode === OneDimensionalComplexPlaneWave2D.Mode.DENSITY_PHASE)
            this._plotDensityPhase(waveFunction);
    }
}
