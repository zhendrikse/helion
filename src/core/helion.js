import { Hud } from "./hud.js";
import {ThreeJsRenderer} from "../view/3d/renderer.js";

export class Registry {
    constructor({
        id = "registryId",
        label = "registryLabel",
        entries = {}
    }) {
        this._entries = entries;
        this._label = label;
        this._id = id;
    }

    get(name) { return this._entries[name]; }
    get label() { return this._label; }
    get id() { return this._id; }

    names() { return Object.keys(this._entries); }

    add(name, value) { this._entries[name] = value; }
}

export class MathPhysicsModelBehavior {
    alwaysWith(view) {
        return new Binding(this, view, Binding.Mode.ALWAYS);
    }
    onceWith(view) {
        return new Binding(this, view, Binding.Mode.ONCE);
    }
}

/**
 * Binding between the phys/math model and view
 */
export class Binding {
    static Mode = Object.freeze({
        ALWAYS: "always",
        ONCE: "once"
    });

    constructor(model, view, mode = Binding.Mode.ALWAYS) {
        this.model = model;
        this.view = view;
        this.mode = mode;
    }

    syncModelAndView() {
        this.model.copyTo(view);
    }

    needsRendering() {
        return this.mode === Binding.Mode.ALWAYS || this.view?.dirty
    }

    initialize() {
        this.view.bind(this.model);
        this.view.initialize?.(); // Necessary to generate geometries & correct bounding boxes
    }

    reset() {
        this.model.reset?.(); // Reset phys/math model to its original state
        this.view.reset?.();  // For example, object trails need to be cleaned up!
    }
}

/**
 * Bridge between the simulation, browser DOM, and renderer.
 */
export class Viewport {
    constructor(containerDiv) {
        this._container = containerDiv;
        this._container.classList.add('helionContainer');
        this._container.style.position = "relative";
        this._container.style.width = "100%";
        this._container.style.margin = "auto";
        if (this._container.style.aspectRatio === "")
            this._container.style.aspectRatio  = "1/1";

        this._canvasWrapperDiv = document.createElement("div");
        this._canvasWrapperDiv.classList.add("helionCanvasWrapper");
        this._canvasWrapperDiv.style.position = "relative";
        this._canvasWrapperDiv.style.display = "block";
        this._canvasWrapperDiv.style.backgroundColor = "transparent";
        this._canvasWrapperDiv.style.width = this._container.clientWidth + "px";
        this._canvasWrapperDiv.style.height = this._container.clientHeight + "px";
        this._container.appendChild(this._canvasWrapperDiv);

        this._canvas = document.createElement('canvas');
        this._canvas.classList.add("helionCanvas");
        this._canvas.style.display = "block";
        this._canvas.style.backgroundColor = "transparent";
        this._canvas.style.width = this._canvasWrapperDiv.clientWidth + "px";
        this._canvas.style.height = this._canvasWrapperDiv.clientHeight + "px";
        this._canvasWrapperDiv.appendChild(this._canvas);
    }

    get container() { return this._container; }
    get canvasWrapper() { return this._canvasWrapperDiv; }
    get canvas() { return this._canvas; }
    get width() { return this._canvasWrapperDiv.clientWidth; }
    get height() { return this._canvasWrapperDiv.clientHeight; }
}

export class Simulation {
    static in = (htmlDiv) => new Simulation(new Viewport(htmlDiv));

    constructor(viewport) {
        this._viewport = viewport;
        this._renderer = new ThreeJsRenderer();
        this._bindings = [];
        this._hud = null;                       // No head-up display by default
        this._onReset = () => {};               // Callback function for client when a reset happens
        this._onBeforePhysicsUpdate = () => {}; // Callback function for client before physics update
        this._onAfterPhysicsUpdate = () => {};  // Callback function for client after physics update
        this._running = false;
        this._simulatedTime = 0;
        this._dt = 0.01;
        this._substepsCount = 1;
        requestAnimationFrame(this.animate);
    }

    with(renderer) {
        this._renderer = renderer;
        this._renderer.attach(this._viewport);
        return this;
    }

    get renderer() { return this._renderer; }

    incrementsTimeBy(dt) {
        this._dt = dt;
        return this;
    }

    synchronize(binding) {
        this._renderer.add(binding.view);
        this._bindings.push(binding);
        binding.initialize();
        return this;
    }

    withHud() {
        this._hud = new Hud();
        this._hud.attach(this._viewport)
        if (!this._running)
            this._hud.show("Click to start the simulation");
        return this;
    }

    _updatePhysics(clockTime) {
        if (!this._running || !this._updateFunction)
            return;

        for (let substeps = 0; substeps < this._substepsCount; substeps++) {
            this._updateFunction(clockTime, this._simulatedTime);
            this._simulatedTime += this._dt;
        }
    }

    onBeforeClockTick(customFunction = (clockTime, simulatedTime) => {}) {
        this._onBeforePhysicsUpdate = customFunction;
        return this;
    }

    onAfterClockTick(customFunction = (clockTime, simulatedTime) => {}) {
        this._onAfterPhysicsUpdate = customFunction;
        return this;
    }

    animate = (clockTime) => {
        // Physics update
        this._onBeforePhysicsUpdate(clockTime, this._simulatedTime);
        this._updatePhysics(clockTime);
        this._onAfterPhysicsUpdate(clockTime, this._simulatedTime);

        // Rendering
        for (const binding of this._bindings)
            if (binding.needsRendering)
                binding.view.render(clockTime);

        this._renderer.render(clockTime);
        requestAnimationFrame(this.animate);
    };

    onClockTick(updateFunction = () => {}, substepsCount = 1) {
        this._updateFunction = updateFunction;
        this._substepsCount = substepsCount;
        return this;
    }

    reset() {
        this._simulatedTime = 0;
        for (const binding of this._bindings)
            binding.reset();
        this._onReset?.();
    }

    /**
     * Add a mouse-click event listener to a simulation canvas. It defaults to start/stop.
     * When calling this function with a custom callback, the default start/stop functionality is
     * lost and needs to be re-added if needed!!
     */
    withMouseClickEventListener(callback = (event) => this.toggleRunStatus()) {
        this._viewport.canvasWrapper.addEventListener("click", (event) => callback(event) );
        return this;
    }

    // When the user has clicked on the canvas, the running state of the application needs to be updated
    toggleRunStatus() {
        if (this._running) {
            this.reset(); // This function is called during execution ==> we need to reset the simulation
            this.stop();
        } else
            this.start();
    }

    start() {
        this._running = true;
        this._hud?.hide();
        return this;
    }

    stop() {
        this._running = false;
        this._hud?.show("Reset: click to restart");

        return this;
    }

    get isRunning() { return this._running; }

    onReset(resetFunction = () => {}) {
        this._onReset = resetFunction;
        return this
    }
}
