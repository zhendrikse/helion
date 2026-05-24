export class Renderer {
    constructor(canvasWrapperDiv) {
        this._canvasWrapperDiv = canvasWrapperDiv;
    }
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
    render(transform, time) {}
    resize() {}
    reset() {}
}

export class CompositeRenderer extends Renderer {
    constructor(renderers = [] = {}) {
        super();
        this._renderers = renderers; // array van Renderer-instanties
    }

    initialize(transform) {
        for (const renderer of this._renderers)
            renderer.initialize?.(transform);
    }

    synchronize(viewObject) {
        for (const renderer of this._renderers)
            renderer.synchronize?.(viewObject);
    }

    render(transform) {
        for (const renderer of this._renderers)
            renderer.render?.(transform);
    }

    reset() {
        for (const renderer of this._renderers)
            renderer.reset?.();
    }
}