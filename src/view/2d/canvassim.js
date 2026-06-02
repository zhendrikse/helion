import { Renderer} from "../renderer.js";

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

    render(time, forceAllViewsToBeRendered) {
        this._context.clearRect(0, 0, this._canvas.clientWidth, this._canvas.clientHeight);
        this._dynamicObjects.forEach(obj => obj.render?.(this._context));
    }

    reset() {
        this._dynamicObjects.forEach(obj => obj.reset?.());
    }
}
