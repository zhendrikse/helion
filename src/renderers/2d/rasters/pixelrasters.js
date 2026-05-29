export class ScalarRaster {
    static RenderMode = Object.freeze({
        CLEAR_EACH_FRAME: "clearEachFrame",
        ACCUMULATE: "accumulate"
    });

    constructor({
        width,
        height,
        scaleToCanvas = false,
        normalize = (intensity, max) => intensity / max,
        colorMapper = null
    } = {}) {
        this._width = width;
        this._height = height;
        this._normalize = normalize;
        this._colorMapper = colorMapper;
        this._scaleToCanvas = scaleToCanvas;
        this._scalarGridField = null;
    }

    attachTo(scalarGridField) {
        // Sanity checks
        if (!scalarGridField.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._scalarGridField = scalarGridField;
    }

    setColourAt(i, j, imageData) {
        let index = j * (this._width * 4) + i * 4;
        const color = this._colorMapper?.mapToColor(this._normalize(this._scalarGridField.valueAt(i, j)));
        if (color === null) { // 👈 Intentional use of ==, not ===
            imageData.data[index + 3] = 0; // completely transparant
            return;
        }

        imageData.data[index++] = color[0];
        imageData.data[index++] = color[1];
        imageData.data[index++] = color[2];
        imageData.data[index++] = (color[3] ?? 255);
    }

    // TODO Doesn't seem to work?
    // clear(color = null) {
    //     for (let x = 0; x < this.dimX(); x++)
    //         for (let y = 0; y < this.dimY(); y++)
    //             this.setColourAt(x, y, color);
    // }

    render(context) {
        const imageData = context.createImageData(this._width, this._height);

        for (let i = 0; i < this._width; i++)
            for (let j = 0; j < this._height; j++)
                this.setColourAt(i, j, imageData);

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

export class ComplexPhaseRaster {
    constructor({
        width = 100,
        height = 100,
        scaleToCanvas = true,
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
        this._colorMapper = colorMapper;
        this._width = width;
        this._height = height;
    }

    render(context, magnitude, phase, max) {
        const imageData = context.createImageData(this._width, this._height);
        for (let i = 0; i < this._width; i++)
            for (let j = 0; j < this._height; j++) {
                const color = this._colorMapper(magnitude[i][j] / max, phase[i][j]);
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

