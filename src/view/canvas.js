export class Canvas {
    static create(aspectRatio = "1 / 1") {
        const canvas = new Canvas(document.createElement("canvas"));
        canvas.htmlCanvas.style.aspectRatio = aspectRatio;
        return canvas;
    }

    static withElementId(elementId) {
        const canvas = document.getElementById(elementId);

        if (!canvas)
            throw new Error(`Canvas with elementId '${elementId}' not found`);

        return new Canvas(canvas);
    }

    constructor(htmlCanvas) {
        this._htmlCanvas = htmlCanvas;
        this._overlay = null;
        this._htmlCanvas.classList.add("applicationCanvas");
    }

    and(overlay) {
        this._overlay = overlay;
        return {
            canvas: this,
            overlay: overlay
        };
    }

    get overlay() { return this._overlay; }
    get htmlCanvas() { return this._htmlCanvas; }
    get clientHeight() { return this._htmlCanvas.clientHeight; }
    get clientWidth() { return this._htmlCanvas.clientWidth; }
}

export class Overlay {

    static create(text = "") {

        const overlay = document.createElement("div");

        overlay.classList.add("overlayText");
        overlay.innerText = text;

        return new Overlay(overlay);
    }

    static withElementId(elementId) {

        const overlay = document.getElementById(elementId);

        if (!overlay)
            throw new Error(
                `Overlay with elementId '${elementId}' not found`
            );

        return new Overlay(overlay);
    }

    constructor(htmlOverlay) {
        this._overlay = htmlOverlay;
    }

    setText(text) {
        this._overlay.innerText = text;
        return this;
    }

    show() {
        this._overlay.style.display = "";
        return this;
    }

    hide() {
        this._overlay.style.display = "none";
        return this;
    }

    get htmlOverlay() {
        return this._overlay;
    }
}

export class CanvasWrapper {

    static create(aspectRatio = "1 / 1") {

        const wrapper = document.createElement("div");

        wrapper.classList.add("canvasWrapper");
        wrapper.style.aspectRatio = aspectRatio;

        return new CanvasWrapper(wrapper);
    }

    static withElementId(elementId) {

        const wrapper = document.getElementById(elementId);

        if (!wrapper)
            throw new Error(
                `Wrapper with elementId '${elementId}' not found`
            );

        return new CanvasWrapper(wrapper);
    }

    constructor(htmlDiv) {
        this._htmlDiv = htmlDiv;
        this._canvas = null;
        this._overlay = null;
    }

    contains(canvas) {

        this._canvas = canvas;

        this._htmlDiv.appendChild(canvas.htmlCanvas);

        return this;
    }

    containsBoth(canvasAndOverlay) {

        this._canvas = canvasAndOverlay.canvas;
        this._overlay = canvasAndOverlay.overlay;

        this._htmlDiv.appendChild(this._canvas.htmlCanvas);
        this._htmlDiv.appendChild(this._overlay.htmlOverlay);

        return this;
    }

    get htmlDiv() {
        return this._htmlDiv;
    }

    get canvas() {
        return this._canvas;
    }

    get overlay() {
        return this._overlay;
    }
}

export class SimulationHost {
    static withElementId(elementId) {
        return new SimulationHost(elementId);
    }

    constructor(elementId) {
        this.host = document.getElementById(elementId);
        if (!this.host)
            throw new Error(`Host element '${elementId}' not found`);

        this.canvas = Canvas.create();
        this.overlay = Overlay.create("Click to start the animation!");
        this.wrapper = CanvasWrapper
            .create()
            .containsBoth(
                this.canvas.and(this.overlay)
            );

        this.host.appendChild(
            this.wrapper.htmlDiv
        );
    }
}