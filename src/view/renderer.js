export class Renderer {
    constructor(canvasWrapperDiv) {
        this._canvasWrapperDiv = canvasWrapperDiv;
    }

    add(viewObject) {}

    /**
     * A renderer gets notified from the simulation when the run status changes.
     * The renderer may then need to display certain information about that event to the user.
     */
    onRunStatusChanged() {}

    render(time) {}

    resize() {}
}

export class CompositeRenderer extends Renderer {
    constructor(renderers = [] = {}) {
        super();
        this._renderers = renderers; // array van Renderer-instanties
    }

    add(viewObject) {
        for (const renderer of this._renderers)
            renderer.add(viewObject);
    }

    render(time, forceAllViewsToBeRendered) {
        for (const renderer of this._renderers)
            renderer.render?.();
    }
}