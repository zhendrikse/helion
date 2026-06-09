import uPlot from 'uplot';
import { Color } from 'three';

/**********************************************
 * S I M U L A T I O N  E N V I R O N M E N T *
 **********************************************/

export class HtmlDiv {
    static withElementId = (elementId) => new HtmlDiv(elementId);

    constructor(elementId) {
        this._htmlDiv = document.getElementById(elementId);
        if (!this._htmlDiv)
            throw new Error("HTML <div> with elementId '" + elementId + "' not found => check HTML page!");
        this._canvas = null;
        this._overlay = null;
    }

    contains(canvas) {
        this._canvas = canvas;
        return this;
    }

    containsBoth(canvasAndOverlay) {
        this._canvas = canvasAndOverlay.canvas;
        this._overlay = canvasAndOverlay.overlay;
        return this;
    }

    get htmlDiv() { return this._htmlDiv; }
    get overlay() { return this._overlay; }
    get canvas() { return this._canvas; }
}

export class Canvas {
    static withElementId = (elementId) => new Canvas(elementId);

    constructor(elementId) {
        this._htmlCanvas = document.getElementById(elementId);
        this._overlay = null;
        if (!this._htmlCanvas)
            throw new Error("Canvas with elementId '" + elementId + "' not found => check HTML page!");
    }

    and(overlay) {
        this._overlay = overlay;
        return {canvas: this, overlay: this._overlay  };
    }

    get overlay() { return this._overlay; }
    get htmlCanvas() { return this._htmlCanvas; }
    get clientHeight() { return this._htmlCanvas.clientHeight; }
    get clientWidth() { return this._htmlCanvas.clientWidth; }
    get height() { return this._htmlCanvas.height; }
    get width() { return this._htmlCanvas.width; }
}

export class Overlay {
    static withElementId = (elementId) => new Overlay(elementId);

    constructor(elementId) {
        this._overlay = document.getElementById(elementId);
        if (!this._overlay)
            throw new Error("Overlay with elementId '" + elementId + "' not found => check HTML page!");
    }
    get htmlOverlay() { return this._overlay; }
}

export class HtmlControl {
    static withElementId = (elementId) => new HtmlControl(elementId);

    constructor(elementId) {
        this.htmlElement = document.getElementById(elementId);
        if (!this.htmlElement)
            throw new Error("Control with elementId '" + elementId + "' not found => check HTML page!");

        this.actionType = "Uninitialized";
        this.objectToModify = null;
        this.objectPropertyName = "Uninitialized";
        this.callbackFunction = null;
        this.htmlSpanElement = null;
    }

    withValueSpanId(htmlSpanElementId) {
        this.htmlSpanElement = document.getElementById(htmlSpanElementId);
        if (!this.htmlSpanElement)
            throw new Error("HTML <span> with elementId '" + htmlSpanElementId + "' not found => check HTML page!");
        return this;
    }

    forType(actionType) {
        this.actionType = actionType;
        return this;
    }

    to(objectToModify) {
        this.objectToModify = objectToModify;
        return this;
    }

    withProperty(propertyName) {
        if (!propertyName in this.objectToModify)
            throw new Error("Property with name '" + propertyName + "' does not exist on " + this.objectToModify);

        this.objectPropertyName = propertyName;
        return this;
    }
}

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

export class Simulation {
    static with = (renderer) => new Simulation(renderer);
    constructor(renderer) {
        this._renderer = renderer;
        this._bindings = [];
        this._onReset = () => {};                // Callback function for client when a reset happens
        this._onBeforePhysicsUpdate = () => {};  // Callback function for client before physics update
        this._onAfterPhysicsUpdate = () => {};   // Callback function for client after physics update
        this._running = false;
        this._simulatedTime = 0;
        this._dt = 0.01;
        this._substepsCount = 1;
        requestAnimationFrame(this.animate);
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
    }

    onAfterClockTick(customFunction = (clockTime, simulatedTime) => {}) {
        this._onAfterPhysicsUpdate = customFunction;
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

    // When the user has clicked on the canvas, the running state of the application needs to be updated
    toggleRunStatus() {
        if (this._running)
            this.reset(); // This function is called during execution ==> we need to reset the simulation

        this._running = !this._running;
        this._renderer.onRunStatusChanged(this._running);
    }

    start() {
        this._running = true;
        this._renderer.onRunStatusChanged(this._running);
        return this;
    }

    stop() {
        this._running = false;
        this._renderer.onRunStatusChanged(this._running);
        return this;
    }

    get isRunning() { return this._running; }

    onReset(resetFunction = () => {}) { this._onReset = resetFunction; }

    set substepsCount(substepsCount) { this._substepsCount = substepsCount; }
}

/*******************************************
 * G R A P H  ( u P L O T )  L I B R A R Y *
 *******************************************/

export class UPlotGraph {
    constructor({
        plotDiv,
        dataDefinition,
        width = 600,
        height = 300,
        title="",
        xLabel="",
        yLabel="",
        maxPoints = 500,
        labelColor = "green",
    } = {}) {
        this._maxPoints = maxPoints;
        this._graphData = [];
        dataDefinition.forEach(() => this._graphData.push([]));

        const series = [{}];
        dataDefinition.slice(1).forEach(dataPoint => {
            series.push({
                label: dataPoint.label,
                stroke: dataPoint.color
            });
        });

        const uPlotOptions = this._uplotOptions(title, width, height, labelColor, xLabel, yLabel, series);
        this._uplotChart = new uPlot(uPlotOptions, this._graphData, plotDiv);
    }

    _uplotOptions(title, width, height, labelColor, xLabel, yLabel, series) {
        return { title, width, height,
            bg: "transparent",
            scales: { x: { auto: true }, y: { auto: true } },
            axes: [{
                    stroke: labelColor,
                    font: "12px Arial",
                    grid: { stroke: "rgba(255, 255, 255, 0.2)", width: 1 },
                    label: xLabel,
                }, {
                    stroke: labelColor,
                    font: "12px Arial",
                    grid: { stroke: "rgba(255, 255, 255, 0.2)", width: 1 },
                    label: yLabel
                }],
            series
        };
    }

    get graphData() { return this._graphData; }

    update() {
        if (this._graphData[0].length > this._maxPoints)
            this._graphData.forEach(arr => arr.shift());
        this._uplotChart.setData(this._graphData);
    }
}
