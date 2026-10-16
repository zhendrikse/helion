import {Renderer} from "../view/renderer.js";

export class Transformation {
    /**
     * @abstract
     * @param {any} body
     */
    applyTo(body) {}
}

export class Bindable {
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

export class ViewsCollection {
    static of = viewConstructor => {
        return new ViewsCollection(viewConstructor);
    }

    constructor(viewConstructor) {
        this._viewConstructor = viewConstructor;
        this._options = {};
        /** @type {Renderable[]} */
        this._views = [];
    }

    /** @returns {ArrayIterator<Renderable>} */
    [Symbol.iterator]() {
        return this._views[Symbol.iterator]();
    }

    /**
     * @param {(view: Renderable, index: number, views: Renderable[]) => void} callback
     * @param {*} [thisArg]
     */
    forEach(callback, thisArg) {
        this._views.forEach(callback, thisArg);
    }

    /** @returns {ArrayIterator<[number, Renderable]>} */
    entries() {
        return this._views.entries();
    }

    with(options) {
        this._options = options;
        return this;
    }

    reset() {
        this._views.forEach(view => {
            view.visible = false;
            view.dispose();
        });
        this._views = [];
    }

    createView() {
        const view = new this._viewConstructor(this._options);
        this._views.push(view);
        return view;
    }
}

export class BindableCollection {
    constructor() {
        /** @type {Bindable[]} */
        this._bindables = [];
        /** @type {Binding[]} */
        this._bindings = [];
    }

    /** @param {Bindable} bindable */
    add(bindable) {
        this._bindables.push(bindable);
    }

    get size() { return this._bindables.length; }

    addTo(simulationBindings, renderer) {
        this._bindings.forEach(binding => binding.addTo(simulationBindings, renderer));
    }

    /** @returns {ArrayIterator<Bindable>} */
    [Symbol.iterator]() {
        return this._bindables[Symbol.iterator]();
    }

    /** @returns {ArrayIterator<[number, Bindable]>} */
    entries() {
        return this._bindables.entries();
    }

    /**
     * @param {(body: Bindable, index: number, bodies: Bindable[]) => void} callback
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

    apply(transformation) {
        this._bindables.forEach(bindable => transformation.applyTo(bindable));
    }

    reset() {
        this._bindables.forEach(bindable => bindable.reset());
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
     * @param {Bindable} model
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
