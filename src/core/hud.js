/**
 * Head-up display: displays information on top of the simulation canvas,
 * e.g. "Click to start the simulation".
 */

export class Hud {
    constructor(htmlDiv) {
        this._element = document.createElement("div");
        this._element.style.position = "absolute";
        this._element.style.top = "50%";
        this._element.style.left = "50%";
        this._element.style.transform = "translate(-50%, -50%)";
        this._element.style.pointerEvents = "none";
        this._element.style.display = "none";
        this._element.style.color = "yellow";
        this._element.style.fontSize = "24px";
        this._element.style.textAlign = "center";
    }

    attach(viewPort) {
        viewPort.canvasWrapper.appendChild(this._element);
    }

    show(text) {
        this._element.textContent = text;
        this._element.style.display = "block";

        // setTimeout(() => {
        //     this._element.style.display = "none";
        // }, duration);
    }

    hide() {
        this._element.style.display = "none";
    }
}