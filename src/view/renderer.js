/**
 * containerDiv
 * ├── canvasWrapperDiv
 * │   ├── canvas        (with simulation inside!)
 * │   ├── HUD           (shows head-up display messages)
 * │   └── CSS2D labels  (text labels in the simulation)
 * │
 * ├── graph
 * ├── dropdowns
 * ├── sliders
 * └── controls
 */
export class Renderer {
    constructor(htmlDiv) {
        this._container = htmlDiv;
        this._container.classList.add('helionContainer');
        this._container.style.position = "relative";
        this._container.style.width = "100%";
        this._container.style.margin = "auto";
        if (this._container.style.aspectRatio === "")
            this._container.style.aspectRatio  = "1/1";

        this._canvasWrapperDiv = document.createElement("div");
        this._canvasWrapperDiv.classList.add("helionCanvasWrapper");
        this._canvasWrapperDiv.style.position = "relative";
        this._canvasWrapperDiv.style.display = "block";
        this._canvasWrapperDiv.style.backgroundColor = "transparent";
        this._canvasWrapperDiv.style.width = this._container.clientWidth + "px";
        this._canvasWrapperDiv.style.height = this._container.clientHeight + "px";
        this._container.appendChild(this._canvasWrapperDiv);

        this._canvas = document.createElement('canvas');
        this._canvas.classList.add("helionCanvas");
        this._canvas.style.display = "block";
        this._canvas.style.backgroundColor = "transparent";
        this._canvas.style.width = this._canvasWrapperDiv.clientWidth + "px";
        this._canvas.style.height = this._canvasWrapperDiv.clientHeight + "px";
        this._canvasWrapperDiv.appendChild(this._canvas);
    }

    get containerDiv() { return this._container; }
    get canvasWrapperDiv() { return this._canvasWrapperDiv; }

    add(viewObject) {}

    render(view, time) {}

    resize() {}
}

export class CompositeRenderer {
    constructor(renderers = [] = {}) {
        this._renderers = renderers; // array van Renderer-instanties
    }

    add(viewObject) {
        for (const renderer of this._renderers)
            renderer.add(viewObject);
    }

    render(view, time) {
        for (const renderer of this._renderers)
            renderer.render(view, time);
    }
}