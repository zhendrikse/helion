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
    add(viewObject) {}

    render(view, time) {}

    resize() {}

    attach(viewport) {}
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