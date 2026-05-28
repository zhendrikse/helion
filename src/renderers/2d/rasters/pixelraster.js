export class PixelRaster {
    constructor({
        context,
        width,
        height,
        scaleToCanvas = false
    } = {}) {
        this._width = width;
        this._height = height;
        this._scaleToCanvas = scaleToCanvas;
        this._context = context;
        this._imageData = context.createImageData(this._width, this._height);
    }

    setColourAt(x, y, color) {
        if (x < 0 || y < 0 || x >= this.dimX() || y >= this.dimY()) return;
        let index = y * (this._width * 4) + x * 4;
        const imageData = this._imageData.data;
        if (color === null) { // 👈 Intentional use of ==, not ===
            imageData[index + 3] = 0; // completely transparant
            return;
        }

        imageData[index++] = color[0];
        imageData[index++] = color[1];
        imageData[index++] = color[2];
        imageData[index++] = (color[3] ?? 255);
    }

    dimX = () => this._width;
    dimY = () => this._height;

    // TODO Doesn't seem to work?
    // clear(color = null) {
    //     for (let x = 0; x < this.dimX(); x++)
    //         for (let y = 0; y < this.dimY(); y++)
    //             this.setColourAt(x, y, color);
    // }

    render() {
        if (!this._scaleToCanvas) {
            this._context.putImageData(this._imageData, 0, 0);
            return;
        }

        // draw direct scaled imageData via offscreen canvas
        const off = new OffscreenCanvas(this._width, this._height);
        off.getContext("2d").putImageData(this._imageData, 0, 0);

        this._context.imageSmoothingEnabled = false;
        this._context.clearRect(0, 0, this._context.canvas.width, this._context.canvas.height);
        this._context.drawImage(off, 0, 0, this._context.canvas.width, this._context.canvas.height);
    }
}
