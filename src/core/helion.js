import { Hud } from "./hud.js";
import { ThreeJsRenderer} from "../view/3d/renderer.js";
import { Object3D, Vector3 } from "three";
import { Axes } from "../view/3d/composite/backgrounds.js";
import { generateUUID, Vec3 } from "../model/math/math.js";
import { BodyPair } from "../model/phys/bodies.js";
import { UPlotGraph } from "./uplot.js";
import { AxesUI, Button, HtmlControl } from "./controls.js";
import { renderMath } from "../view/mathrenderer.js";
import { Viewport } from "./viewport.js";
import { ThreeJsScene } from "../view/3d/scene.js";
import { Renderable } from "../view/renderer.js";

export class Registry {
    constructor({ id = generateUUID(), label = "registryLabel", entries = {} }) {
        this._entries = entries;
        this._label = label;
        this._id = id;
    }
    get(name) { return this._entries[name]; }
    get label() { return this._label; }
    get id() { return this._id; }
    get names() { return Object.keys(this._entries); }
    add(name, value) { this._entries[name] = value; }
}

export class Transformation {
    applyTo(body) {}
}

export class MathPhysicsModelBehavior {
    constructor() {
        this._behaviors = [];
    }

    alwaysWith(view) {
        return new Binding(this, view);
    }

    addBehavior(behavior) {
        this._behaviors.push(behavior);
        return this;
    }

    applyBehaviors(dt) {
        for (const behavior of this._behaviors)
            behavior(dt);
    }
}

class Binding {
    constructor(model, view) {
        this._model = model;
        this._view = view;
    }

    get view() { return this._view; }

    initialize() {
        this._view.initialize?.(this._model);
        this.synchronize();
    }

    synchronize() {
        this._view.synchronizeWith?.(this._model);
    }

    forceSynchronize(time) {
        this.synchronize();
    }

    reset() {
        this._model.reset?.();
        this._view.reset?.();
        this.synchronize();
    }
}

export class SimulationClock {
    constructor() {
        this.realTimeStep = 0.01;
        this.simulationTimeStep = 0.01;
        this.accumulator = 0;
        this.clockTime = 0;
        this._lastTime = performance.now();
    }

    updateWith(timeStamp, timeScale = 1) {
        const elapsed = Math.min((timeStamp - this._lastTime) / 1000, 0.1);
        this._lastTime = timeStamp;
        this.accumulator += elapsed * timeScale;
    }

    tick() {
        this.accumulator -= this.realTimeStep;
        this.clockTime += this.simulationTimeStep;
    }

    reset() {
        this.accumulator = 0;
        this.clockTime = 0;
        this._lastTime = performance.now();
    }
}

export class Simulation {
    static Status = Object.freeze({ STOPPED: "stopped", RUNNING: "running", PAUSED: "paused" });

    static viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed, aspectRatio) {
        return Viewport.fromHtmlDiv(htmlDivId, parameterMenuCollapsed, aspectRatio);
    }

    static with({
        htmlDivId,
        viewport = { aspectRatio: 1 },
        camera = {},
        lighting = { enabled: true, shadows: false },
        scene = {
            background: ThreeJsScene.Background.TRANSPARENT,
            backgroundColor: 0x0088ff,
            scale: 1
        },
        headUpDisplay = { enabled: true },
        infoPanel = { text: "" },
        parameterMenuCollapsed = true
    } = {}) {
        const viewPort = Simulation.viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed, viewport.aspectRatio);
        const renderer = new ThreeJsRenderer({ camera, viewport, lighting, scene });
        renderer.attach(viewPort);
        return new Simulation(viewPort, renderer, headUpDisplay.enabled, infoPanel);
    }

    constructor(viewport, renderer, headUpDisplay, infoPanel) {
        this._viewport = viewport;
        this._renderer = renderer;
        /** @type {Binding[]} */
        this._bindings = [];
        this._plot = null;
        this._hud = null;
        this._onReset = () => {};
        /** @type {string} */
        this._status = Simulation.Status.STOPPED;
        this._axesUI = null;

        this._timeScale = 1;
        this._clock = new SimulationClock();
        this._maxPerformanceFunction = null;
        this._iterationsPerFrame = 10;
        this._minimumFrameRate = 30;
        /** @type (clock: SimulationClock, dt: number) => void */
        this._stepFunction = null;
        this._stepsPerClockTick = 1;
        /** @type (time: number) => void */
        this._onFrame = (time) => {};
        this._lastTime = performance.now();
        this._framesPerSecond = 0;

        if (headUpDisplay)
            this._initHud()

        if (infoPanel.text)
            this._viewport.infoPanelText = infoPanel.text;

        requestAnimationFrame(this.animate);
    }

    get width() { return this._viewport.width; }
    get height() { return this._viewport.height; }
    /** @param {Vec3} position */
    set cameraPosition(position)   { this._renderer.cameraPosition = position;   }
    /** @param {boolean} autoRotate */
    set autoRotate(autoRotate)     { this._renderer.autoRotate = autoRotate;     }
    /** @param {boolean} visible */
    set axesVisible(visible)       { this._renderer.axesVisible = visible;       }
    /** @param {boolean} orthographic */
    set orthographic(orthographic) { this._renderer.orthographic = orthographic; }
    
    /** @param {Object3D} object3D */
    addObject3D(object3D) {
        this._renderer.add(object3D);
        return this;
    }

    removeAxes() {
        this._renderer.removeAxes();
        return this;
    }

    /** @param {string} latex */
    setLatexTitle(latex) {
        renderMath(this._viewport.titleDiv, latex);
        return this;
    }

    /** @param {string} text */
    setTextTitle(text) {
        this._viewport.titleDiv.textContent = text;
        return this;
    }

    clearTitle() {
        this._viewport.titleDiv.replaceChildren();
        return this;
    }

    runsEvery(dt) {
        this._clock.realTimeStep = dt;
        return this;
    }

    advancesBy(dt) {
        this._clock.simulationTimeStep = dt;
        return this;
    }

    /** @param {Binding} binding */
    bind(binding) {
        const existingIndex = this._bindings.findIndex(
            b => b.view === binding.view
        );

        if (existingIndex >= 0) {
            const old = this._bindings[existingIndex];
            old.view.reset?.();
            this._bindings[existingIndex] = binding;
            binding.initialize();
        } else {
            this._renderer.add(binding.view);
            this._bindings.push(binding);
            binding.initialize();
        }

        return this;
    }

    _initHud() {
        this._hud = new Hud();
        this._hud.attach(this._viewport)
        this._hud.show("Click to start the simulation");
    }

    atSpeed(timeScale) {
        this._timeScale = timeScale;
        return this;
    }

    /** @param {Renderable} anObject */
    frameSceneOn(anObject, {
        padding = 1.2,
        translationY = 0,
        minDistance = 2,
        viewDirection = new Vec3(1, 1, 1)
    } = {}) {
        if (!anObject.boundingBox)
            throw new Error('Trying to provide axes for an object that does not have a boundingBox property');
        this._renderer.frameSceneOn(anObject, { padding, translationY, minDistance, viewDirection });
        return this;
    }

    /** @param {Renderable} anObject */
    provideAxesAround(anObject, {
        layoutType = Axes.Type.MATLAB,
        divisions = 10,
        frame = true,
        annotations = true,
        tickLabels = true,
        xyPlane = true,
        xzPlane = true,
        yzPlane = true,
        axisLabels = ["X", "Y", "Z"],
        positiveXZ = false,
        bottomAlign = true
    } = {}) {
        if (!anObject.boundingBox)
            throw new Error('Trying to provide axes for an object that does not have a boundingBox property');
        const axes = this._renderer.provideAxesAround(anObject, {
            layoutType, divisions, frame, annotations, tickLabels, xyPlane, xzPlane, yzPlane, axisLabels, positiveXZ, bottomAlign
        });

        if (this._axesUI)
            this._axesUI.axes = axes;
        else {
            this._axesUI = new AxesUI(axes);
            this.append(this._axesUI.ui())
        }

        return this;
    }

    substeps(substeps) {
        this._stepsPerClockTick = substeps;
        return this;
    }

    _updatePhysics() {
        let i = 0;
        const maxSteps = 10;

        while (this._clock.accumulator >= this._clock.realTimeStep && i < maxSteps) {
            for (let j = 0; j < this._stepsPerClockTick; j++) {
                this._stepFunction(this._clock, this._clock.simulationTimeStep);
                this._clock.tick();
            }
            i++;
        }
    }

    _tuneIterationsPerFrame(timeStamp) {
        if (this._framesPerSecond < this._minimumFrameRate)
            this._iterationsPerFrame--;
        else
            this._iterationsPerFrame++;

        this._framesPerSecond = 0;
        this._lastTime = timeStamp;
    }

    animate = (timeStamp) => {
        if (this._status === Simulation.Status.RUNNING) {
            if (this._maxPerformanceFunction) {
                if (timeStamp - this._lastTime > 1000)
                    this._tuneIterationsPerFrame(timeStamp);

                let iterations = 0;
                while (iterations < this._iterationsPerFrame) {
                    this._maxPerformanceFunction(this._clock);
                    iterations++;
                }

                this._framesPerSecond++;
            }

            if (this._stepFunction) {
                this._clock.updateWith(timeStamp, this._timeScale);
                this._updatePhysics();
            }
        }

        this._onFrame(timeStamp);

        for (const binding of this._bindings)
            binding.synchronize();

        this._renderer.render(timeStamp);
        requestAnimationFrame(this.animate);
    };

    onStep(stepFunction = (clock, dt) => {}) {
        if (this._maxPerformanceFunction)
            throw new Error("Cannot mix iteration mode and step mode");

        this._stepFunction = stepFunction;
        return this;
    }

    maxOutCpu(maxPerformanceFunction, minimumFrameRate = 30, iterationsPerFrame = 10) {
        if (this._stepFunction)
            throw new Error("Cannot mix iteration mode and step mode");

        this._maxPerformanceFunction = maxPerformanceFunction;
        this._iterationsPerFrame = iterationsPerFrame;
        this._minimumFrameRate = minimumFrameRate;
        return this;
    }

    onFrame(callback = (timeStamp) => {}) {
        this._onFrame = callback;
        return this;
    }

    reset() {
        this._clock.reset();

        for (const binding of this._bindings)
            binding.reset();

        this._onReset?.();
    }

    defaultMouseClickCallback (event) {
        if (this._status === Simulation.Status.STOPPED) {
            this._hud?.show("Running", 1000);
            this._status = Simulation.Status.RUNNING;
        } else if (this._status === Simulation.Status.RUNNING) {
            this._hud?.show("Click to reset the simulation");
            this._status = Simulation.Status.PAUSED;
        } else if (this._status === Simulation.Status.PAUSED) {
            this.reset();
            this._hud?.show("Click to restart the simulation");
            this._status = Simulation.Status.STOPPED;
        }
    }

    withMouseClickEventListener(callback = event => this.defaultMouseClickCallback(event)) {
        this._viewport.canvasWrapper.addEventListener("click", event => callback(event) );
        return this;
    }

    start() {
        this._hud?.show("Running", 1000);
        this._status = Simulation.Status.RUNNING;
        return this;
    }

    stop() {
        this._hud?.show("Simulation stopped");
        this._status = Simulation.Status.STOPPED;
        return this;
    }

    get isRunning() { return this._status === Simulation.Status.RUNNING; }

    onReset(resetFunction = () => {}) {
        this._onReset = resetFunction;
        return this
    }

    /** @param {HtmlControl} control */
    append(control) {
        control.append(this._viewport.controlsDiv).to(this);
        this._viewport.enableParameterMenu();
        return this;
    }

    appendStartStopResetUI() {
        const runButton = new Button().withText("▶︎ Run");
        runButton
            .addEventListener("click", () => {
                if (this._status === Simulation.Status.RUNNING) {
                    this._hud?.show("Paused");
                    runButton.withText("▶︎ Run")
                    this.stop();
                } else {
                    this._hud?.show("Running", 1000);
                    runButton.withText("❚❚ Pause")
                    this.start();
                }
            })
            .togetherWith(new Button()
                .addEventListener("click", () => {
                    this._hud?.show("Reset", 1000);
                    this.reset();
                })
                .withText("⟳ Reset"));
        runButton.append(this._viewport.simulationButtonsDiv).to(this);
        return this;
    }

    onUserInteraction(event) {
        for (const binding of this._bindings)
            binding.forceSynchronize(this._clock.clockTime);
    }

    setupGraphWith({
         dataDefinition,
         width = this._viewport.width,
         height = this._viewport.height,
         title="",
         xLabel="",
         yLabel="",
         maxPoints = 500,
         labelColor = "green",
     } = {}) {
        const plotParentDiv = this._viewport.addOnsDiv;
        this._plot = new UPlotGraph({
            plotParentDiv, dataDefinition, width, height, title, xLabel, yLabel, maxPoints, labelColor
        });
        return this;
    }

    plot(variables) {
        for (let i = 0; i < variables.length; ++i)
            this._plot.graphData[i].push(variables[i]);
        this._plot.update();
    }

    setPlotData(data) {
        this._plot.setData(data);
        return this;
    }
}
