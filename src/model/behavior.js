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

/**
 * @template {ModelObject} [T=ModelObject]
 * @template {Renderable} [V=Renderable]
 */
export class BindingsCollection {
    /** @param {Binding<T, V>[]} [bindings] */
    constructor(bindings = []) {
        /** @type {Binding<T, V>[]} */
        this._bindings = bindings;
    }

    /** @returns {ArrayIterator<Binding<T, V>>} */
    [Symbol.iterator]() {
        return this._bindings[Symbol.iterator]();
    }

    /**
     * @param {(binding: Binding<T, V>, index: number,
     *          bindings: Binding<T, V>[]) => void} callback
     * @param {*} [thisArg]
     */
    forEach(callback, thisArg) {
        this._bindings.forEach(callback, thisArg);
    }

    /** @param {Binding<T, V>} binding */
    add(binding) {
        this._bindings.push(binding);
    }

    /** @param {BindingsCollection<T, V>} bindingsCollection */
    copy(bindingsCollection) {
        this._bindings = [...bindingsCollection];
    }
}

/**
 * @template {ModelObject} [T=ModelObject]
 */
export class ModelObjectsCollection {
    /** @param {T[]} modelObjects */
    constructor(modelObjects = []) {
        this._bindables = modelObjects;
        /** @type {BindingsCollection} to be "consumed" by the Simulation class */
        this._bindings = new BindingsCollection();
        /** @type {BindingsCollection} meant for the capture() method */
        this._lastBindings = new BindingsCollection();
    }

    /** @param {T} bindable */
    add(bindable) {
        this._bindables.push(bindable);
        return this;
    }

    /**
     * @template {Renderable} [V=Renderable]
     * @param {BindingsCollection<T, V>} bindingsCollection
     * @returns {this}
     */
    capture(bindingsCollection) {
        bindingsCollection.copy(this._lastBindings);
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

    /** @returns {ArrayIterator<T>} */
    [Symbol.iterator]() {
        return this._bindables[Symbol.iterator]();
    }

    /** @param {number} index */
    modelObject(index) { return this._bindables[index]; }

    /**
     * @param {(body: T, index: number, bodies: T[]) => void} callback
     * @param {*} [thisArg]
     */
    forEach(callback, thisArg) {
        this._bindables.forEach(callback, thisArg);
    }

    /**
     * Synchronize model only once with the view. Important: the
     * model is also synchronized with the view at every user interaction!!
     *
     * @template {Renderable} [V=Renderable]
     * @param {ViewsCollection<V>} viewsCollection
     * @returns {this}
     */
    onceWith(viewsCollection) {
        this._lastBindings = new BindingsCollection(
            this._bindables.map(bindable => bindable.onceWith(viewsCollection.createView()))
        );

        this._lastBindings.forEach(binding => this._bindings.add(binding));

        return this;
    }

    /**
     * Keeps the models and views synchronized at all times!
     *
     * @template {Renderable} [V=Renderable]
     * @param {ViewsCollection<V>} viewsCollection
     * @returns {this}
     */
    alwaysWith(viewsCollection) {
        this._lastBindings = new BindingsCollection(
            this._bindables.map(bindable => bindable.alwaysWith(viewsCollection.createView()))
        );

        this._lastBindings.forEach(binding => this._bindings.add(binding));

        return this;
    }

    /** @param {Transformation} transformation */
    apply(transformation) {
        this._bindables.forEach(bindable => transformation.applyTo(bindable));
    }

    reset() {
        this._bindings.forEach(binding => {
            binding.model.reset();
            binding.view.reset();
        });
        this._bindables = [];
        this._bindings = new BindingsCollection();
        this._lastBindings = new BindingsCollection();
    }
}

/**
 * Binding between a model and its view.
 *
 * @template {ModelObject} [T=ModelObject]
 * @template {Renderable} [V=Renderable]
 */
export class Binding {
    static Mode = Object.freeze({
        ALWAYS: 'always',
        ONCE: 'once'
    });

    static Empty = () => new Binding(null, null);

    /**
     * @param {T} model
     * @param {V} view
     * @param {string} [mode]
     */
    constructor(model, view, mode = Binding.Mode.ALWAYS) {
        /** @type {T} */
        this.model = model;
        /** @type {V} */
        this.view = view;
        this.mode = mode;
    }

    /** @param {Binding} binding */
    capture(binding) {
        binding.mode = this.mode;
        binding.model = this.model;
        binding.view = this.view;
        return this;
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
