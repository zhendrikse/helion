export class Renderer {
    constructor(htmlDiv) {
        this._container = htmlDiv;
        this._container.classList.add('helionCanvasWrapper');
        this._container.style.position = "relative";
        this._container.style.width = "100%";
        this._container.style.margin = "auto";
        if (this._container.style.aspectRatio === "")
            this._container.style.aspectRatio  = "1/1";

        this._canvas = document.createElement('canvas');
        this._canvas.classList.add("helionCanvas");
        this._canvas.style.display = "block";
        this._canvas.style.backgroundColor = "transparent";
        this._canvas.style.width = this._container.clientWidth + "px";
        this._canvas.style.height = this._container.clientHeight + "px";
        this._container.appendChild(this._canvas);

        this._overlay = document.createElement("div");
        this._overlay.classList.add("helionOverlay");
        this._overlay.style.position = "absolute";
        this._overlay.style.top = "50%";
        this._overlay.style.left = "50%";
        this._overlay.style.transform = "translate(-50%, -50%)";
        this._overlay.style.color = "yellow";
        this._overlay.style.fontSize = "24px";
        this._overlay.style.pointerEvents = "none";
        this._overlay.style.userSelect = "none";
        this._overlay.style.textAlign = "center";
        this._overlay.innerHTML = "Click to start the animation";
        this._container.appendChild(this._overlay);
    }

    add(viewObject) {}

    /**
     * A renderer gets notified from the simulation when the run status changes.
     * The renderer may then need to display certain information about that event to the user.
     */
    onRunStatusChanged() {}

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

    onRunStatusChanged() {
        for (const renderer of this._renderers)
            renderer.onRunStatusChanged();
    }

    render(view, time) {
        for (const renderer of this._renderers)
            renderer.render(view, time);
    }
}