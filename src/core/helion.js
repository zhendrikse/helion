import { Hud } from "./hud.js";
import { ThreeJsRenderer} from "../view/3d/renderer.js";
import { Vector3} from "three";
import { Axes} from "../view/3d/composite/backgrounds.js";
import { generateUUID, Vec3} from "../model/math/math.js";
import { UPlotGraph} from "./uplot.js";
import { Button } from "./controls.js";

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
    get names() { return Object.keys(this._entries); }

    add(name, value) { this._entries[name] = value; }
}

export class MathPhysicsModelBehavior {
    alwaysWith(view) {
        return new Binding(this, view, Binding.Mode.ALWAYS);
    }
    onceWith(view) {
        return new Binding(this, view, Binding.Mode.ONCE);
    }

    reset() {}
}

/**
 * Binding between the phys/math model and view.
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

    forceSynchronize(atClockTime) {
        this.view.synchronizeWith(this.model, atClockTime);
    }

    synchronize(atClockTime) {
        const viewNeedsSynchronization = this.mode === Binding.Mode.ALWAYS || this.view?.dirty;
        if (viewNeedsSynchronization)
            this.view.synchronizeWith(this.model, atClockTime);
    }

    initialize() {
        if (!this.view.canBindTo(this.model))
            throw new Error("Helion cannot bind this view to this model");

        this.view.initialize(this.model);
        this.view.synchronizeWith(this.model, 0); // The first (and for sync-once-objects last) sync happens here!
    }

    reset() {
        this.model.reset?.(); // Reset phys/math model to its original state
        this.view.reset?.();  // For example, object trails need to be cleaned up!
    }
}

/**
 * Bridge between the simulation, browser DOM, and renderer.
 *
 * containerDiv
 * ├── canvasWrapperDiv
 * │   ├── canvas        (with simulation inside!)
 * │   ├── HUD           (shows head-up display messages)
 * │   └── CSS2D labels  (text labels in the simulation)
 * │
 * ├── SimulationButtonsDiv
 * │   ├── Start/stop    (Start/stop/reset buttons, if present)
 * │
 * ├── AddOnsDiv
 * │   ├── uPlot graph   (Graph, if present)
 * │   ├── details       (Parameter settings menu)
 * │       ├── summary
 * │           ├── dropdowns
 * │           ├── sliders
 * │           ├── buttons
 * │           └── ...
 */
export class Viewport {
    constructor(containerDiv, parameterMenuCollapsed) {
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
        this._canvasWrapperDiv.style.width = "100%";
        this._canvasWrapperDiv.style.height = "100%";
        this._container.appendChild(this._canvasWrapperDiv);

        this._canvas = document.createElement('canvas');
        this._canvas.classList.add("helionCanvas");
        this._canvas.style.display = "block";
        this._canvas.style.backgroundColor = "transparent";
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvasWrapperDiv.appendChild(this._canvas);

        this._simulationButtonsDiv = document.createElement("div");
        this._simulationButtonsDiv.classList.add("helionSimulationButtons");
        this._simulationButtonsDiv.style.position = "relative";
        this._simulationButtonsDiv.style.display = "block";
        this._simulationButtonsDiv.style.backgroundColor = "transparent";
        this._simulationButtonsDiv.style.width = "100%";
        this._container.appendChild(this._simulationButtonsDiv);

        this._addOnsDiv = document.createElement("div");
        this._addOnsDiv.classList.add("helionAddOns");
        this._addOnsDiv.style.position = "relative";
        this._addOnsDiv.style.display = "block";
        this._addOnsDiv.style.backgroundColor = "transparent";
        this._addOnsDiv.style.width = "100%";
        this._container.appendChild(this._addOnsDiv);

        this._details = document.createElement("details");
        this._details.classList.add("helionControlGroup");
        const summary = document.createElement("summary");
        summary.classList.add("helionControlSummary");
        summary.textContent = "⚙️ Parameters";
        this._details.appendChild(summary);
        this._details.style.visibility = "hidden";
        this._details.open = !parameterMenuCollapsed;
        this._addOnsDiv.appendChild(this._details);

        this.#createFullScreenButton();
    }

    #createFullScreenButton() {
        this._fullscreenButton = document.createElement("button");
        this._fullscreenButton.innerHTML = "⛶";
        this._fullscreenButton.title = "Fullscreen";
        this._fullscreenButton.classList.add("helionFullscreenButton");

        Object.assign(this._fullscreenButton.style, {
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: "1000",
            width: "36px",
            height: "36px",
            border: "none",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.15)",
            color: "white",
            fontSize: "20px",
            cursor: "pointer",
            backdropFilter: "blur(4px)"
        });

        document.addEventListener("fullscreenchange", () => {
            this._fullscreenButton.innerHTML =
                document.fullscreenElement ? "⮌" : "⛶";
        });

        document.addEventListener("fullscreenchange", () => {
            window.dispatchEvent(new Event("resize"));
        });

        this._fullscreenButton.addEventListener("click", async () => {
            if (!document.fullscreenElement)
                await this._container.requestFullscreen();
            else
                await document.exitFullscreen();
        });

        this._canvasWrapperDiv.appendChild(this._fullscreenButton);

        // const downloadButton = document.createElement("button");
        // downloadButton.textContent = "Download image";
        // document.body.appendChild(downloadButton);
        //
        // downloadButton.addEventListener("click", () => {
        //     renderer.render(scene, camera); // laatste frame renderen
        //     const link = document.createElement("a");
        //     link.download = "blackhole.png";
        //     link.href = renderer.domElement.toDataURL("image/png");
        //     link.click();
        // });
    }

    get simulationButtonsDiv() { return this._simulationButtonsDiv; }
    get addOnsDiv() { return this._addOnsDiv; }
    get controlsDiv() { return this._details; }
    get canvasWrapper() { return this._canvasWrapperDiv; }
    get canvas() { return this._canvas; }
    get width() { return this._canvasWrapperDiv.clientWidth; }
    get height() { return this._canvasWrapperDiv.clientHeight; }

    enableParameterMenu() {
        this._details.style.visibility = "visible";
    }
}

class SimulationClock {
    constructor({
        fixedDt = 0.01,     // Physics step size => advances simulated time, not the simulation speed!
        maxAccumulatedTime = 0.25
    } = {}) {
        this.fixedDt = fixedDt;
        this.clockTime = 0;         // Our real-world clock time
        this.previousClockTime = 0;
        this.elapsedTime = 0;       // The elapsed time per frame on our real-world clock
        this.simulatedTime = 0;     // The absolute simulated time that is incremented with dt
        this.accumulator = 0;
        this._maxAccumulatedTime = maxAccumulatedTime;

    }

    reset() {
        this.simulatedTime = 0;
        this.accumulator = 0;
    }

    tick() {
        this.accumulator -= this.fixedDt;
        this.simulatedTime += this.fixedDt;
    }

    updateWith(clockTime, timeScale) {
        this.previousClockTime = this.clockTime;
        this.clockTime = clockTime;
        this.elapsedTime = (this.clockTime - this.previousClockTime) * 0.001;
        this.elapsedTime = Math.min(this.elapsedTime, this._maxAccumulatedTime);
        this.accumulator += this.elapsedTime * timeScale;
    }
}

export class Simulation {
    static Background = Object.freeze({
        PLAIN: "Plain",
        FOG: "Fog",
        TRANSPARENT: "Transparent",
        STARS: "Stars"
    });

    static viewportFromHtmlDiv = (htmlDiv, parameterMenuCollapsed) => {
        let canvasWrapper;
        if (htmlDiv)
            canvasWrapper = document.getElementById(htmlDiv);
        else {
            canvasWrapper = document.createElement("div");
            canvasWrapper.id = generateUUID();
            document.body.appendChild(canvasWrapper);
        }

        return new Viewport(canvasWrapper, parameterMenuCollapsed);
    }

    static with({
        htmlDivId,
        background = Simulation.Background.TRANSPARENT,
        backgroundColor = 0x0088ff,
        scale = 1,
        controls = true,
        headUpDisplay = false,
        light = true,
        cameraPosition = new Vec3(3, 3, 3),
        shadowsEnabled = false,
        fieldOfView = 50,
        parameterMenuCollapsed = true
    } = {}) {
        const viewport = Simulation.viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed);
        viewport.parameterMenuCollapsed = parameterMenuCollapsed;
        const renderer = new ThreeJsRenderer({
            background, backgroundColor, scale, controls, light, cameraPosition, shadowsEnabled, fieldOfView
        });
        renderer.attach(viewport);
        return new Simulation(viewport, renderer, headUpDisplay);
    }

    constructor(viewport, renderer, headUpDisplay) {
        this._viewport = viewport;
        this._renderer = renderer;
        this._bindings = [];
        this._plot = null;              // No plot by default
        this._hud = null;               // No head-up display by default
        this._onReset = () => {};       // Callback function for client when a reset happens
        this._iterationFunction = null; // Used to maximize CPU performance
        this._iterationsPerFrame = 10;
        this._onFrame = (time) => {};   // 1x per (requestAnimation)frame => machine dependent!
        this._stepFunction = null;      // Called 1/dt times per second if CPU is capable
        this._running = false;
        this._timeScale = 1;

        this._clock = new SimulationClock();

        if (headUpDisplay)
            this._initHud()

        requestAnimationFrame(this.animate);
    }

    set autoRotate(autoRotate) { this._renderer.autoRotate = autoRotate; }
    set cameraPosition(position) { this._renderer.cameraPosition = position; }

    addObject3D(object3D) {
        this._renderer.add(object3D);
        return this;
    }

    incrementsTimeBy(dt) {
        this._clock.fixedDt = dt;
        return this;
    }

    synchronize(binding) {
        this._renderer.add(binding.view);
        this._bindings.push(binding);
        binding.initialize();
        return this;
    }

    _initHud() {
        this._hud = new Hud();
        this._hud.attach(this._viewport)
    }

    onTimeScale(timeScale) {
        this._timeScale = timeScale;
        return this;
    }

    get hud() { return this._hud; }

    frameSceneOn(anObject, {
        padding = 1.2,
        translationY = 0,
        minDistance = 2,
        viewDirection = new Vector3(1, 1, 1)
    } = {}) {
        this._renderer.frameSceneOn(anObject, { padding, translationY, minDistance, viewDirection });
        return this;
    }

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
        bottomAlign = true,
        settingControls = true
    } = {}) {
        const axes = this._renderer.provideAxesAround(anObject, {
            layoutType, divisions, frame, annotations, tickLabels, xyPlane, xzPlane, yzPlane, axisLabels, positiveXZ, bottomAlign
        });
        if (settingControls)
            this.append(axes.controls());
        return this;
    }

    _updatePhysics(clock) {
        let i = 0;
        const maxSteps = 10;

        while (this._clock.accumulator >= this._clock.fixedDt && i < maxSteps) {
            this._stepFunction(this._clock, this._clock.fixedDt);
            this._clock.tick();
            i++;
        }
    }

    animate = (timeStamp) => {
        if (this._running) {
            if (this._iterationFunction) {
                let iterations = 0;

                while (iterations < this._iterationsPerFrame) {
                    this._iterationFunction(this._clock);
                    iterations++;
                }
            }

            if (this._stepFunction) {
                this._clock.updateWith(timeStamp, this._timeScale);
                this._updatePhysics(this._clock);
            }
        }

        this._onFrame(timeStamp);

        // Sync model and views after model update
        for (const binding of this._bindings)
            binding.synchronize(this._clock.clockTime);

        this._renderer.render(timeStamp);
        requestAnimationFrame(this.animate);
    };

    /**
     * The stepFunction is called with a frequency that is required to make the simulated time run
     * synchronously with the real clock time. This makes sure that these kind of simulations run
     * equally fast on different hardware. Suppose the frame rate is 60 frames / sec. So
     * elapsed time is approximately 0.0167, so the accumulator is incremented by this amount.
     * So, for example, with fixedDt = 0.01, so 1/100 onStep() calls per second, the number of
     * onStep() calls per frame is approximately:
     * frame 1 -> step
     * frame 2 -> step + step
     * frame 3 -> step
     * frame 4 -> step + step
     *
     * @param stepFunction this function is called with the frequency that is required to make
     * the simulate time run synchronously with the real clock time.
     */
    onStep(stepFunction = (clock, dt) => {}) {
        if (this._iterationFunction)
            throw new Error("Cannot mix iteration mode and step mode");

        this._stepFunction = stepFunction;
        return this;
    }

    /**
     * Used to maximize CPU utilization.
     *
     * @param maxPerformanceFunction The function that is called.
     * @param iterationsPerFrame The number of times the function is called per (requestAnimation)frame.
     */
    onIteration(maxPerformanceFunction, iterationsPerFrame = 10) {
        if (this._stepFunction)
            throw new Error("Cannot mix iteration mode and step mode");

        this._iterationFunction = maxPerformanceFunction;
        this._iterationsPerFrame = iterationsPerFrame;
        return this;
    }

    /**
     * Called each (requestAnimation)frame.
     *
     * @param callback the function that is called each (requestAnimation)frame.
     */
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

    /**
     * Add a mouse-click event listener to a simulation canvas. It defaults to start/stop.
     * When calling this function with a custom callback, the default start/stop functionality is
     * lost and needs to be re-added if needed!!
     */
    withMouseClickEventListener(callback = (event) => this.toggleRunStatus()) {
        this._viewport.canvasWrapper.addEventListener("click", event => callback(event) );
        if (!this._running)
            this._hud?.show("Click to start the simulation");
        return this;
    }

    // When the user has clicked on the canvas, the running state of the application needs to be updated
    toggleRunStatus() {
        if (this._running) {
            this.reset(); // This function is called during execution ==> we need to reset the simulation
            this.stop();
            this._hud?.show("Reset: click to restart");
        } else {
            this.start();
            this._hud?.show("Running", 1000);
        }
    }

    start() {
        this._running = true;
        return this;
    }

    stop() {
        this._running = false;
        return this;
    }

    get isRunning() { return this._running; }

    onReset(resetFunction = () => {}) {
        this._onReset = resetFunction;
        return this
    }

    append(control) {
        control.append(this._viewport.controlsDiv).to(this);
        this._viewport.enableParameterMenu();
        return this;
    }

    withStartStopResetButtons() {
        const runButton = new Button().withText("▶︎ Run");
        runButton
            .addEventListener("click", () => {
                if (this._running) {
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
                    this._hud.show("Reset", 1000);
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
}
