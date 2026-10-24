import {Renderable, Renderer, ViewsCollection} from "../view/renderer.js";

export class Transformation {
    /**
     * @abstract
     * @param {any} body
     */
    applyTo(body) {}
}

export class ModelObject {
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

export class ModelsCollection {
    /** @param {ModelObject[]} modelObjects */
    constructor(modelObjects = []) {
        this._bindables = modelObjects;
        /** @type {Binding[]} */
        this._bindings = [];
    }

    /** @param {ModelObject} bindable */
    add(bindable) {
        this._bindables.push(bindable);
        return this;
    }

    get size() { return this._bindables.length; }

    /**
     * Method that is meant to be called internally within the Helion library.
     * 
     * @param {Binding[]} simulationBindings 
     * @param {Renderer} renderer 
     */
    addTo(simulationBindings, renderer) {
        this._bindings.forEach(binding => binding.addTo(simulationBindings, renderer));
    }

    /** @returns {ArrayIterator<ModelObject>} */
    [Symbol.iterator]() {
        return this._bindables[Symbol.iterator]();
    }

    modelObject(index) { return this._bindables[index]; }

    /**
     * @param {(body: ModelObject, index: number, bodies: ModelObject[]) => void} callback
     * @param {*} [thisArg]
     */
    forEach(callback, thisArg) {
        this._bindables.forEach(callback, thisArg);
    }

    /**
     * Synchronize model only once with the view. Important: the
     * model is also synchronized with the view at every user interaction!!
     * @param {ViewsCollection} viewsCollection views to synchronize the models with.
     */
    onceWith(viewsCollection) {
        this._bindables.forEach(bindable=> this._bindings.push(bindable.onceWith(viewsCollection.createView())));
        return this;
    }

    /**
     * Keeps the models and views synchronized at all times!
     * @param {ViewsCollection} viewsCollection views to synchronize the models with.
     */
    alwaysWith(viewsCollection) {
        this._bindables.forEach(bindable => this._bindings.push(bindable.alwaysWith(viewsCollection.createView())));
        return this;
    }

    /** @param {Transformation} transformation */
    apply(transformation) {
        this._bindables.forEach(bindable => transformation.applyTo(bindable));
    }

    reset() {
        this._bindables.forEach(bindable => bindable.reset());
        this._bindings.forEach(binding => {
            binding.model.reset();
            binding.view.reset();
        });
        this._bindables = [];
        this._bindings = [];
    }
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
     * @param {ModelObject} model
     * @param {Renderable} view
     * @param {string} mode
     */
    constructor(model, view, mode = Binding.Mode.ALWAYS) {
        this.model = model;
        this.view = view;
        this.mode = mode;
    }

    /**
     * @param {Binding[]} bindings
     * @param {Renderer} renderer
     */
    addTo(bindings, renderer) {
        // See if this view is already attached to some binding
        const existingIndex = bindings.findIndex(binding => binding.view === this.view);

        if (existingIndex >= 0) {
            const old = bindings[existingIndex];

            // Reset old view before it is being reused
            old.view.reset?.();

            // Replace existing binding
            bindings[existingIndex] = this;
        } else {
            renderer.add(this.view);
            bindings.push(this);
        }
        this.initialize();
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
