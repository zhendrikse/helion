import {Renderable2D} from "../renderer.js";

function scientificColorCodingFor(value, minVal, maxVal) {
    value = Math.min(Math.max(value, minVal), maxVal - 0.0001);
    const range = maxVal - minVal;
    value = range === 0.0 ? 0.5 : (value - minVal) / range;
    const num = Math.floor(4 * value);
    const s = 4 * (value - num / 4);

    switch (num) {
        case 0 :
            return [0, 255 * s, 255, 255];
        case 1 :
            return [0, 255, 255 * (1 - s), 255];
        case 2 :
            return [255 * s, 255, 0, 255];
        case 3 :
            return [255, 255 * (1 - s), 0, 255];
    }
}

/**
 * Visualizes the pressure/smoke/obstacle combination used by the 2D fluid solver.
 *
 * The pressure field is the model bound to this view. The smoke and obstacle
 * fields are additional state needed to reproduce the fluid visualization.
 */
export class FluidDynamicsView extends Renderable2D {
    constructor(display, width, height, scene) {
        super();
        this._imageData = display.getImageData(0, 0, width, height);
        this._display = display;
        this._scene = scene;
        this._showVelocities = false;
        this._showStreamlines = false;
        this._showObstacle = true;
        this._showPressure = true;
        this._showSmoke = true;
        this._height = height;
        this._width = width;
        const simulationHeight = 1.1;
        this._canvasScale = height / simulationHeight;
    }

    _scaleX(x) { return x * this._canvasScale; }

    _scaleY(y) { return this._height - y * this._canvasScale; }

    set showSmoke(showSmoke) { this._showSmoke = showSmoke; }
    set showVelocities(showVelocities) { this._showVelocities = showVelocities; }
    set showStreamlines(showStreamlines) { this._showStreamlines = showStreamlines; }
    set showPressure(showPressure) { this._showPressure = showPressure; }

    _doShowObstacle(fluid) {
        //display.strokeW
        const r = this._scene.obstacleRadius + fluid.h;
        if (this._showPressure)
            this._display.fillStyle = "#131313";
        else
            this._display.fillStyle = "#DDDDDD";
        this._display.beginPath();
        this._display.arc(this._scaleX(this._scene.obstacleX), this._scaleY(this._scene.obstacleY), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.fill();

        this._display.lineWidth = 3.0;
        this._display.strokeStyle = "#000000";
        this._display.beginPath();
        this._display.arc(this._scaleX(this._scene.obstacleX), this._scaleY(this._scene.obstacleY), this._canvasScale * r, 0.0, 2.0 * Math.PI);
        this._display.closePath();
        this._display.stroke();
        this._display.lineWidth = 1.0;
    }

    _doShowVelocities(fluid) {
        this._display.strokeStyle = "#000000";
        const scale = 0.2;
        const h = fluid.h;
        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++) {
                this._display.beginPath();

                const x0 = this._scaleX(i * h);
                const x1 = this._scaleX(i * h + fluid._velocityX.valueAt(j, i) * scale);
                const y = this._scaleY((j + 0.5) * h);

                this._display.moveTo(x0, y);
                this._display.lineTo(x1, y);
                this._display.stroke();

                const x = this._scaleX((i + 0.5) * h);
                const y0 = this._scaleY(j * h);
                const y1 = this._scaleY(j * h + fluid._velocityY.valueAt(j, i) * scale)

                this._display.beginPath();
                this._display.moveTo(x, y0);
                this._display.lineTo(x, y1);
                this._display.stroke();
            }
    }

    _doShowStreamlines(fluid) {
        const numberOfSegments = 15;
        this._display.strokeStyle = "#000000";

        for (let i = 1; i < fluid.numX - 1; i += 5)
            for (let j = 1; j < fluid.numY - 1; j += 5) {
                let x = (i + 0.5) * fluid.h;
                let y = (j + 0.5) * fluid.h;

                this._display.beginPath();
                this._display.moveTo(this._scaleX(x), this._scaleY(y));

                for (let n = 0; n < numberOfSegments; n++) {
                    if (x > fluid.numX * fluid.h)
                        break;

                    x += fluid.xVelocityAt(x, y) * 0.01;
                    y += fluid.yVelocityAt(x, y) * 0.01;
                    this._display.lineTo(this._scaleX(x), this._scaleY(y));
                }
                this._display.stroke();
            }
    }

    _updateImageDataAt(i, j, fluid, pressureRange) {
        const cellScale = 1.1;
        const h = fluid.h;

        let color = [255, 255, 255, 0];
        const smoke = fluid.obstacleAt(j, i);
        if (this._showPressure) {
            color = scientificColorCodingFor(fluid.pressureAt(j, i), pressureRange.min, pressureRange.max);
            if (this._showSmoke) {
                color[0] = Math.max(0.0, color[0] - 255 * smoke);
                color[1] = Math.max(0.0, color[1] - 255 * smoke);
                color[2] = Math.max(0.0, color[2] - 255 * smoke);
            }
        } else if (this._showSmoke) {
            color[0] = 255 * smoke;
            color[1] = 255 * smoke;
            color[2] = 255 * smoke;
            if (this._scene.sceneNr === 2) //SCENE_TYPE.PAINT)
                color = scientificColorCodingFor(smoke, 0.0, 1.0);
        } else if (fluid.smokeAt(j, i) === 0.0) {
            color[0] = 0;
            color[1] = 0;
            color[2] = 0;
        }

        const x = Math.floor(this._scaleX(i * h));
        const y = Math.floor(this._scaleY((j + 1) * h));
        const cx = Math.floor(this._canvasScale * cellScale * h) + 1;
        const cy = Math.floor(this._canvasScale * cellScale * h) + 1;

        for (let yi = y; yi < y + cy; yi++) {
            let pos = 4 * (yi * this._width + x);

            for (let xi = 0; xi < cx; xi++) {
                this._imageData.data[pos++] = color[0]; // red
                this._imageData.data[pos++] = color[1]; // green
                this._imageData.data[pos++] = color[2]; // blue
                this._imageData.data[pos++] = color[3]; // opacity
            }
        }
    }

    canBindTo(_model) {
        return true;
    }

    synchronizeWith(fluid) {
        const pressureRange = fluid.pressureRange;
        this._display.clearRect(0, 0, this._width, this._height);
        this._display.fillStyle = "#FF0000";

        for (let i = 0; i < fluid.numX; i++)
            for (let j = 0; j < fluid.numY; j++)
                this._updateImageDataAt(i, j, fluid, pressureRange);

        this._display.putImageData(this._imageData, 0, 0);

        if (this._showVelocities)
            this._doShowVelocities(fluid);

        if (this._showStreamlines)
            this._doShowStreamlines(fluid);

        if (this._showObstacle)
            this._doShowObstacle(fluid);

        if (this._showPressure) {
            const pressureText = "pressure: " + pressureRange.min.toFixed(0) + " - " + pressureRange.max.toFixed(0) + " N/m";
            this._display.fillStyle = "#A0A0A0";
            this._display.font = "16px Arial";
            this._display.fillText(pressureText, 10, 35);
        }
    }
}
