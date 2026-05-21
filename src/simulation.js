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

    to(object) {
        this.objectToModify = object;
        return this;
    }

    withProperty(propertyName) {
        if (!propertyName in this.objectToModify)
            throw new Error("Property with name '" + propertyName + "' does not exist on " + this.objectToModify);

        this.objectPropertyName = propertyName;
        return this;
    }
}

export class CallbackFunction {
    constructor(callback) {
        this._callbackFunction = callback;
    }

    to(control) {
        control.callbackFunction = this._callbackFunction;
        return control;
    }
}

export class EventController {
    static for = (simulation) => new EventController(simulation);

    constructor(simulation = null) {
        this._simulation = simulation;
        this._onCanvasClickEventHandler = null;
    }

    /**
     * Add a mouse-click event listener to a simulation canvas. It defaults to start/stop.
     * When calling this function with a custom callback, the default start/stop functionality is
     * lost and needs to be re-added if needed!!
     */
    addStartStopMouseClickEventListenerTo(canvas, callback = (event) => this._simulation.toggleRunStatus()) {
        // Pass a mouse click on the canvas on to the simulation:
        this._onCanvasClickEventHandler = callback;
        canvas.htmlCanvas.addEventListener("click", (event) => callback(event) );
    }

    removeStartStopMouseClickEventListenerFrom(canvas, callback = (event) => this._simulation.toggleRunStatus()) {
        canvas.htmlCanvas.removeEventListener("click", this._onCanvasClickEventHandler);
    }

    /**
     * Adds a custom event listener (callback function) to a control.
     */
    add(control) {
        control.htmlElement.addEventListener(control.actionType, (event) => {
            if (control.htmlSpanElement)
                this._updateValueInReadOut(control, event.target.value);
            control.callbackFunction(event);
        });
    }

    _updateValueInReadOut(control, value) {
        const numberValue = Number(value);
        if (typeof value === 'boolean')
            control.htmlSpanElement.innerText = value ? 'true' : 'false';
        else if (Number.isNaN(numberValue))
            control.htmlSpanElement.innerText = value;
        else
            control.htmlSpanElement.innerText = numberValue.toFixed(2);
    }

    /**
     * Sets a value from the control for a property an any type of object, as long as it exposes the property name.
     */
    attach(control) {
        control.htmlElement.addEventListener(control.actionType, (event) => {
            const target = event.target;
            const value = target.type === 'checkbox' ? target.checked : target.value;
            control.objectToModify[control.objectPropertyName] = value;

            if (control.htmlSpanElement)
                this._updateValueInReadOut(control, value);
        });
    }
}

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

    add(viewObject) {
        for (const renderer of this._renderers)
            renderer.add?.(viewObject);
    }

    asyncAdd(viewObject) {
        for (const renderer of this._renderers)
            renderer.asyncAdd?.(viewObject);
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

export class Simulation {
    static with = (renderer) => new Simulation(renderer);
    constructor(renderer) {
        this._renderer = renderer;
        this._onReset = () => {};
        this._onBeforePhysicsUpdate = () => {};
        this._onAfterPhysicsUpdate = () => {};
        this._transform = new Transform(1);
        this._running = false;
        this._simulatedTime = 0;
        this._dt = 0.01;
        this._substepsCount = 1;
    }

    onScale(scale) { this._transform = new Transform(scale); return this; }

    incrementsTimeBy(dt) {
        this._dt = dt;
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

    onClockTick(updateFunction = () => {}, substepsCount = 1) {
        this._updateFunction = updateFunction;
        this._substepsCount = substepsCount;

        // For rendering static objects once
        this._renderer.initialize(this._transform);

        const animate = (clockTime) => {
            // Physics update
            this._onBeforePhysicsUpdate(clockTime, this._simulatedTime);
            this._updatePhysics(clockTime);
            this._onAfterPhysicsUpdate(clockTime, this._simulatedTime);

            // Rendering
            this._renderer.render(this._transform, clockTime);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
        return this;
    }

    reset() {
        this._simulatedTime = 0;
        this._renderer.reset();
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
    }

    stop() {
        this._running = false;
        this._renderer.onRunStatusChanged(this._running);
    }

    get isRunning() { return this._running; }

    onReset(resetFunction = () => {}) { this._onReset = resetFunction; }

    set substepsCount(substepsCount) { this._substepsCount = substepsCount; }
}

class Transform {
    constructor(scale) {
        this._scale = scale;
    }

    physicsToRender(fromVector, toVector) {
        toVector.set(fromVector.x * this._scale, fromVector.y * this._scale, fromVector.z * this._scale);
    }

    renderToPhysics(fromVector, toVector) {
        toVector.set(fromVector.x / this._scale, fromVector.y / this._scale, fromVector.z / this._scale);
    }

    scaleRadius(radius) {
        return radius * this._scale;
    }
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

        const series = [];
        dataDefinition.forEach(dataPoint => series.push({label: dataPoint.label, stroke: dataPoint.color}));

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
