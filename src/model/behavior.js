export class Transformation {
    /**
     * @abstract
     * @param {any} body
     */
    applyTo(body) {}
}

export class MathPhysicsModelBehavior {
    /**
     * Keeps the model and view synchronized at all times!
     * @param {Renderable} view view to synchronize the model with.
     * @returns {Binding} a new binding between the model and view.
     */
    alwaysWith(view) {
        return new Binding(this, view, Binding.Mode.ALWAYS);
    }

    /**
     * Synchronize model only once with the view. Important: the
     * model is also synchronized with the view at every user interaction!!
     * @param {Renderable} view view to synchronize the model with.
     * @returns {Binding} a new binding between the model and view.
     */
    onceWith(view) {
        return new Binding(this, view, Binding.Mode.ONCE);
    }

    /** @param {Transformation} transformation */
    apply(transformation) {
        transformation.applyTo(this);
        return this;
    }

    reset() {}
}

/**
 * Binding between the phys/math model and view.
 */
export class Binding {
    static Mode = Object.freeze({
        ALWAYS: 'always',
        ONCE: 'once'
    });

    /**
     * @param {MathPhysicsModelBehavior} model
     * @param {Renderable} view
     * @param {string} mode
     */
    constructor(model, view, mode = Binding.Mode.ALWAYS) {
        this.model = model;
        this.view = view;
        this.mode = mode;
    }

    forceSynchronize() {
        this.view.synchronizeWith(this.model);
    }

    synchronize() {
        const viewNeedsSynchronization = this.mode === Binding.Mode.ALWAYS || this.view?.dirty;
        if (viewNeedsSynchronization && this.view.visible)
            this.view.synchronizeWith(this.model);
    }

    initialize() {
        if (!this.view.canBindTo(this.model))
            throw new Error('Helion cannot bind this view to this model');

        this.view.initialize(this.model);
        this.view.synchronizeWith(this.model); // The first (and for sync-once-objects last) sync happens here!
    }

    reset() {
        this.model.reset?.(); // Reset phys/math model to its original state
        this.view.reset?.();  // For example, object trails need to be cleaned up!
    }
}