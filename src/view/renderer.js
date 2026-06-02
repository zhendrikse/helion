export class Renderer {
    constructor(canvasWrapperDiv) {
        this._canvasWrapperDiv = canvasWrapperDiv;
    }

    get canvasWrapperDiv() { return this._canvasWrapperDiv; }

    /**
     * Add objects to simulation with synchronization of the physics state.
     */
    synchronize(object) {}

    /**
     * A renderer gets notified from the simulation when the run status changes.
     * The renderer may then need to display certain information about that event to the user.
     */
    onRunStatusChanged() {}
    initialize() {}
    render(time, forceAllViewsToBeRendered) {}
    resize() {}
    reset() {}
}

export class CompositeRenderer extends Renderer {
    constructor(renderers = [] = {}) {
        super();
        this._renderers = renderers; // array van Renderer-instanties
    }

    initialize() {
        for (const renderer of this._renderers)
            renderer.initialize?.();
    }

    synchronize(viewObject) {
        for (const renderer of this._renderers)
            renderer.synchronize?.(viewObject);
    }

    render(time, forceAllViewsToBeRendered) {
        for (const renderer of this._renderers)
            renderer.render?.();
    }

    reset() {
        for (const renderer of this._renderers)
            renderer.reset?.();
    }
}