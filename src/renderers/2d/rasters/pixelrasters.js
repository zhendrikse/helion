import {FieldStatistics} from "../../../math/math.js";

export class ScalarFieldRaster {
    static RenderMode = Object.freeze({
        CLEAR_EACH_FRAME: "clearEachFrame",
        ACCUMULATE: "accumulate"
    });

    constructor({
        width,
        height,
        scaleToCanvas = true,
        max = FieldStatistics.max,
        colorMapper = null
    } = {}) {
        this._width = width;
        this._height = height;
        this._max = max;
        this._colorMapper = colorMapper;
        this._scaleToCanvas = scaleToCanvas;
        this._discreteScalarField = null;
    }

    attachTo(discreteScalarField) {
        // Sanity checks
        if (!discreteScalarField.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._discreteScalarField = discreteScalarField;
    }

    setColourAt(i, j, imageData, maxValue) {
        let index = j * (this._width * 4) + i * 4;
        const color = this._colorMapper?.mapToColor(this._discreteScalarField.valueAt(i, j) / maxValue);

        if (color === null) { // 👈 Intentional use of ==, not ===
            imageData.data[index + 3] = 0; // completely transparant
            return;
        }

        imageData.data[index++] = color[0];
        imageData.data[index++] = color[1];
        imageData.data[index++] = color[2];
        imageData.data[index++] = (color[3] ?? 255);
    }

    render(context) {
        const imageData = context.createImageData(this._width, this._height);
        const maxValue = this._max(this._discreteScalarField);
        for (let i = 0; i < this._width; i++)
            for (let j = 0; j < this._height; j++)
                this.setColourAt(i, j, imageData, maxValue);

        if (!this._scaleToCanvas) {
            context.putImageData(imageData, 0, 0);
            return;
        }

        // draw direct scaled imageData via offscreen canvas
        const off = new OffscreenCanvas(this._width, this._height);
        off.getContext("2d").putImageData(imageData, 0, 0);

        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.drawImage(off, 0, 0, context.canvas.width, context.canvas.height);
    }
}

export function hsvToRgb(h, s, v) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

export class ComplexScalarFieldRaster {
    constructor({
        width = 100,
        height = 100,
        scaleToCanvas = true,
        showPhaseColour = true,
        colorMapper = (magnitude, phase) => {
            if (magnitude < 1e-3)
                return [0, 0, 0, 0];

            const hue = (phase + Math.PI) / (2 * Math.PI);
            const {r, g, b} = hsvToRgb(hue, 1, 1);
            const brightness = Math.pow(magnitude, 0.3);
            const alpha = Math.log(1 + 10 * magnitude);
            return [r * brightness, g * brightness, b * brightness, alpha * 255];
        }
    } = {}) {
        this._scaleToCanvas = scaleToCanvas;
        this._phaseColor = showPhaseColour;
        this._colorMapper = colorMapper;
        this._width = width;
        this._height = height;
        this._discreteComplexField = null;
    }

    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    attachTo(discreteComplexField) {
        // Sanity checks
        if (!discreteComplexField.magnitudeAt)
            throw new Error("Field does not implement magnitudeAt(), hence it cannot be attached to this view.");
        if (!discreteComplexField.phaseAt)
            throw new Error("Field does not implement phaseAt(), hence it cannot be attached to this view.");

        this._discreteComplexField = discreteComplexField;
    }

    render(context) {
        const imageData = context.createImageData(this._width, this._height);
        const max = FieldStatistics.maxMagnitude(this._discreteComplexField);
        for (let i = 0; i < this._width; i++)
            for (let j = 0; j < this._height; j++) {
                const mag = this._discreteComplexField.magnitudeAt(i, j) / max;
                const phase = this._discreteComplexField.phaseAt(i, j);
                const color = this._phaseColor ? this._colorMapper(mag, phase) : [255, 255, 0,Math.log(1 + 10 * mag) * 255];
                const index = j * (this._width * 4) + i * 4;
                for (let k = 0; k < 4; k++)
                    imageData.data[index + k] = color[k];
            }

        if (!this._scaleToCanvas) {
            context.putImageData(imageData, 0, 0);
            return;
        }

        // draw direct scaled imageData via offscreen canvas
        const off = new OffscreenCanvas(this._width, this._height);
        off.getContext("2d").putImageData(imageData, 0, 0);

        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.drawImage(off, 0, 0, context.canvas.width, context.canvas.height);
    }
}

