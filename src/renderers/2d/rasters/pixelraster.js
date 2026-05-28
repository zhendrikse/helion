export class PixelRaster {
    constructor({
        width,
        height,
        scaleToCanvas = false
    } = {}) {
        this._width = width;
        this._height = height;
        this._scaleToCanvas = scaleToCanvas;
        this._scalarGridField = null;
    }

    attachTo(scalarGridField) {
        // Sanity checks
        if (!scalarGridField.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._scalarGridField = scalarGridField;
    }

    setColourAt(x, y, imageData) {}

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
