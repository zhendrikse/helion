import { Hud } from './hud.js';
import { ThreeJsRenderer} from '../view/3d/renderer.js';
import { Axes } from '../view/3d/composite/backgrounds.js';
import { generateUUID } from '../model/math/math.js';
import { Vec3 } from '../model/math/objects.js';
import { UPlotGraph } from './uplot.js';
import { AxesUI, Button, HtmlControl } from './controls.js';
import { renderMath } from '../view/mathrenderer.js';
import { Viewport } from './viewport.js';
import { ThreeJsScene } from '../view/3d/scene.js';
import { Renderable, Renderer } from '../view/renderer.js';
import { Colour } from '../view/colormappers.js';
import { Object3D } from 'three/src/Three.js';
import {ModelObjectsCollection, Binding} from "../model/behavior.js";
import {ThreeJsCamera} from "../view/3d/camera.js";
import {NoToneMapping, SRGBColorSpace} from "three";

/**
 * SimulationClock
 *
 * Clock that separates real-time scheduling from simulated time stepping.
 * Ensures simulations run at consistent speeds regardless of frame rate.
 *
 * @internal
 */
class SimulationClock {
    /**
     * @param {Object} [options] - Configuration options
     * @param {number} [options.realTimeStep=0.01] - Real-time step in seconds (typically 1/60 or 1/100)
     * @param {number} [options.simulationTimeStep=this.realTimeStep] - Simulated time advanced per step
     * @param {number} [options.maxAccumulatedTime=0.25] - Maximum accumulated time before forced catch-up
     *
     * @internal
     */
    constructor({
        realTimeStep = 0.01,
        simulationTimeStep = realTimeStep,
        maxAccumulatedTime = 0.25
    } = {}) {
        this.realTimeStep = realTimeStep;             // realtime scheduling interval
        this.simulationTimeStep = simulationTimeStep;   // simulated-time increment

        this.clockTime = 0;
        this.previousClockTime = 0;
        this.elapsedTime = 0;
        this.simulatedTime = 0;
        this.accumulator = 0;
        this._maxAccumulatedTime = maxAccumulatedTime;
    }

    /**
     * Reset the clock to initial state.
     *
     * @returns {this} This SimulationClock instance for chaining
     * @internal
     */
    reset() {
        this.simulatedTime = 0;
        this.accumulator = 0;
        this.elapsedTime = 0;
        this.previousClockTime = 0;
        this.clockTime = 0;
        return this;
    }

    /**
     * Consume one integration substep from the accumulated real time.
     *
     * @param {number} [realTimeStep=this.realTimeStep] - Real time step in seconds
     * @param {number} [simulationTimeStep=this.simulationTimeStep] - Simulated time step in seconds
     * @returns {this} This SimulationClock instance for chaining
     * @internal
     */
    tick(realTimeStep = this.realTimeStep, simulationTimeStep = this.simulationTimeStep) {
        this.accumulator -= realTimeStep;
        this.simulatedTime += simulationTimeStep;
        return this;
    }

    /**
     * Update clock time and accumulate elapsed time.
     *
     * @param {number} clockTime - The current clock time in milliseconds
     * @param {number} timeScale - Speed multiplier for simulation time
     * @returns {this} This SimulationClock instance for chaining
     * @internal
     */
    updateWith(clockTime, timeScale) {
        this.previousClockTime = this.clockTime;
        this.clockTime = clockTime;
        this.elapsedTime = (this.clockTime - this.previousClockTime) * 1e-3;
        this.elapsedTime = Math.min(this.elapsedTime, this._maxAccumulatedTime);
        this.accumulator += this.elapsedTime * timeScale;
        return this;
    }
}

export class Simulation {
    static Status = Object.freeze({
        RUNNING: 'Running',
        PAUSED: 'Paused',
        STOPPED: 'Stopped',
    });

    /**
     * Create a viewport from an HTML div element.
     * Automatically creates a div if one with the given ID doesn't exist.
     *
     * @param {string} htmlDivId - The ID of the HTML div element for the canvas
     * @param {boolean} parameterMenuCollapsed - Whether the parameter menu should be collapsed
     * @param {string} aspectRatio - The aspect ratio of the viewport (e.g., '16 / 9', '4 / 3')
     * @returns {Viewport} A new Viewport instance
     *
     * @example
     * const viewPort = Simulation.viewportFromHtmlDiv('myCanvas', false, '16 / 9');
     */
    static viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed, aspectRatio) {
        let canvasWrapper = document.getElementById(htmlDivId);
        if (!canvasWrapper) {
            console.warn(`No HTML div with ID = \'${htmlDivId}\' found: creating Helion div automatically!`);
            canvasWrapper = document.createElement('div');
            canvasWrapper.id = generateUUID();
            document.body.appendChild(canvasWrapper);
        }

        return new Viewport(canvasWrapper, parameterMenuCollapsed, aspectRatio);
    };

    /**
     * Create a new Helion simulation.
     *
     * This is the main entry point for creating a simulation. It sets up the Three.js renderer,
     * viewport, head-up display, and info panel.
     *
     * @param {{
     *   htmlDivId?: string,
     *   viewport?: { aspectRatio?: string, parameterMenuCollapsed?: boolean },
     *   camera?: {
     *     position?: Vec3,
     *     target?: Vec3,
     *     fieldOfView?: number,
     *     controls?: boolean,
     *     autoRotate?: boolean,
     *     orthographic?: boolean
     *   },
     *   renderer?: {
     *       toneMapping: string,
     *       toneMappingExposure: number,
     *       colorSpace: string
     *   }
     *   scene?: {
     *     background?: number,
     *     backgroundColor?: Colour,
     *     scale?: number
     *   },
     *   lighting?: {
     *     enabled?: boolean,
     *     shadows?: boolean
     *   },
     *   headUpDisplay?: { enabled?: boolean },
     *   infoPanel?: { text?: string }
     * }} [options] - Configuration options for the simulation
     *
     * @returns {Simulation} A new Simulation instance
     *
     * @example
     * const sim = Simulation.with({
     *     htmlDivId: 'myCanvas',
     *     camera: { position: new Vec3(0, 0, 10), target: new Vec3(0, 0, 0) }
     * });
     */
    static with({
        htmlDivId = '',
        viewport = {},
        camera = {},
        renderer = {},
        scene = {},
        lighting = {},
        headUpDisplay = {},
        infoPanel = {}
    } = {}) {
        camera = { ...ThreeJsCamera.defaults(), ...camera };
        renderer = {
            colorSpace: SRGBColorSpace,
            toneMapping: NoToneMapping,
            toneMappingExposure: 1,
            ...renderer
        };
        scene = {
            background: ThreeJsScene.Background.TRANSPARENT,
            backgroundColor: new Colour(0x0088ff),
            scale: 1,
            ...scene
        };
        lighting = {
            enabled: true,
            shadows: false,
            ...lighting
        };
        headUpDisplay = {
            enabled: true,
            ...headUpDisplay
        };
        infoPanel = {
            text: '',
            ...infoPanel
        };
        const viewPort = Simulation.viewportFromHtmlDiv(htmlDivId, viewport.parameterMenuCollapsed ?? true, viewport.aspectRatio ?? '1 / 1');
        const threeJsRenderer = new ThreeJsRenderer({ camera, viewport, lighting, scene, renderer });
        threeJsRenderer.attach(viewPort);
        return new Simulation(viewPort, threeJsRenderer, headUpDisplay.enabled, infoPanel);
    }

    /**
     * Creates a new Simulation instance.
     *
     * @param {Viewport} viewport - The viewport containing canvas and UI elements
     * @param {Renderer} renderer - The Three.js renderer instance
     * @param {boolean} headUpDisplay - Whether to enable the head-up display
     * @param {{ text?: string }} infoPanel - Optional info panel text
     *
     * @internal
     */
    constructor(viewport, renderer, headUpDisplay, infoPanel) {
        this._viewport = viewport;
        this._renderer = renderer;
        this._parameterDivExists = false;
        this._addOnsDivExists = false;
        /** @type {Binding[]} */
        this._bindings = [];
        this._plot = null;                   // No plot by default
        this._hud = null;                    // No head-up display by default
        this._onReset = () => {};            // Callback function for client when a reset happens
        /** @type {string} */
        this._status = Simulation.Status.STOPPED;
        this._axesUI = null;
        this._runButton = new Button().withText('▶︎ Run');
        this._timeScale = 1;
        this._clock = new SimulationClock();
        this._maxPerformanceFunction = null; // Used to maximize CPU utilization
        this._iterationsPerFrame = 10;       // Automatically tuned during execution to maximize CPU utilization
        this._minimumFrameRate = 30;         // Limit beyond which number of iterations per frame is no longer increased
        /** @type (clock: SimulationClock, dt: number) => void */
        // @ts-ignore as this signals not to use the stepfunction!!
        this._stepFunction = null;           // Called at fixed dt intervals
        this._stepsPerClockTick = 1;         // At each clock tick, execute this many (sub)steps
        /** @type (_time: number) => void */
        this._onFrame = (_time) => {};        // Called 1x per (requestAnimation)frame => machine dependent!
        this._lastTime = performance.now();
        this._framesPerSecond = 0;

        if (headUpDisplay)
            this._initHud();

        if (infoPanel.text)
            this._viewport.infoPanelText = infoPanel.text;

        this._renderer.setAnimationLoop(this.animate);
    }

    /**
     * Get the width of the simulation viewport.
     *
     * @returns {number} The viewport width in pixels
     *
     * @example
     * const w = sim.width;
     */
    get width() { return this._viewport.width; }
    /**
     * @returns {number}
     */
    get height() { return this._viewport.height; }
    /**
     * @param {Vec3} position
     * @returns {this}
     */
    set cameraPosition(position) { this._renderer.cameraPosition = position; return this; }
    /**
     * @param {boolean} autoRotate
     * @returns {this}
     */
    set autoRotate(autoRotate) { this._renderer.autoRotate = autoRotate; return this; }
    /**
     * @param {boolean} visible
     * @returns {this}
     */
    set axesVisible(visible) { this._renderer.axesVisible = visible; return this; }
    /**
     * @param {boolean} orthographic
     * @returns {this}
     */
    set orthographic(orthographic) { this._renderer.orthographic = orthographic; return this; }

    /**
     * Add an object3D to the renderer.
     *
     * @param {Object3D} object3D - The Three.js object3D to add
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.addObject3D(new THREE.Mesh());
     */
    addObject3D(/** @type {Object3D} */ object3D) {
        this._renderer.add(object3D);
        return this;
    }

    /**
     * Remove axes from the renderer.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.removeAxes();
     */
    removeAxes() {
        this._renderer.removeAxes();
        return this;
    }

    /**
     * Set a LaTeX title in the viewport.
     *
     * @param {string} latex - The LaTeX string to display
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.setLatexTitle('E = mc^2');
     */
    setLatexTitle(/** @type {string} */ latex) {
        renderMath(this._viewport.titleDiv, latex);
        return this;
    }

    /**
     * Set an HTML title in the viewport.
     *
     * @param {string} text - The HTML text to display
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.setHtmlTitle('My Simulation');
     */
    setHtmlTitle(/** @type {string} */ text) {
        this._viewport.titleDiv.innerHTML = text;
        return this;
    }

    /**
     * Clear the title in the viewport.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.clearTitle();
     */
    clearTitle() {
        this._viewport.titleDiv.replaceChildren();
        return this;
    }

    /**
     * Set text at the bottom left of the viewport.
     *
     * @param {string} text - The text to display
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.setBottomText('100 iterations @ 60 fps');
     */
    setBottomText(/** @type {string} */ text) {
        this._viewport.bottomLeftText = text;
        return this;
    }

    /**
     * Determines how frequently simulation steps are executed
     * relative to real-world time.
     *
     * This controls the scheduling interval, not the amount of
     * simulated time advanced by each step.
     *
     * @param {number} dt Real-world time interval between simulation steps.
     */
    runsEvery(dt) {
        this._clock.realTimeStep = dt;
        return this;
    }

    /**
     * Determines how much simulated time passes during each
     * simulation step.
     *
     * This is independent of the real-world scheduling interval.
     *
     * @param {number} dt Simulated time increment per step.
     */
    advancesBy(dt) {
        this._clock.simulationTimeStep = dt;
        return this;
    }

    /**
     * Bind model to view.
     *
     * @param {Binding | ModelObjectsCollection } binding
     */
    bind(binding) {
        binding.addTo(this._bindings, this._renderer);
        return this;
    }

    _initHud() {
        this._hud = new Hud();
        this._hud.attach(this._viewport);
        this._hud.show('Click to start the simulation');
    }

    /** Show a message over the simulation viewport. */
    showHud(text, duration = -1) {
        if (!this._hud)
            this._initHud();
        this._hud.show(text, duration);
        return this;
    }

    /** Hide the message over the simulation viewport. */
    hideHud() {
        this._hud?.hide();
        return this;
    }

    /**
     * Influences how much simulation time passes per second.
     *
     * @param {number} timeScale For example, if timescale equals two, simulation time passes two times more quickly.
     */
    atSpeed(timeScale) {
        this._timeScale = timeScale;
        return this;
    }

    /**
     * @param {Renderable} anObject
     * @param {object} [options={}] Configuration for framing the scene.
     * @param {number} [options.padding=1.2]
     * @param {number} [options.translationY=0]
     * @param {number} [options.minDistance=2]
     * @param {Vec3} [options.viewDirection=new Vec3(1, 1, 1)]
     */
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

    /**
     * @param {Renderable} anObject object to place the axes around
     * @param {Object} [options={}] Configuration for the axes.
     * @param {string} [options.layoutType]
     * @param {number} [options.divisions]
     * @param {boolean} [options.frame] show axis frame
     * @param {boolean} [options.annotations]
     * @param {boolean} [options.tickLabels] show tick labels along axes
     * @param {boolean} [options.xyPlane] show the XY-plane
     * @param {boolean} [options.xzPlane] show the XZ-plane
     * @param {boolean} [options.yzPlane] show the YZ-plane
     * @param {string[]} [options.axisLabels] show the labels on the axes
     * @param {boolean} [options.positiveXZ]
     * @param {boolean} [options.bottomAlign] align the axes with the bottom of the object
     */
    provideAxesAround(anObject, {
        layoutType = Axes.Type.MATLAB,
        divisions = 10,
        frame = true,
        annotations = true,
        tickLabels = true,
        xyPlane = true,
        xzPlane = true,
        yzPlane = true,
        axisLabels = ['X', 'Y', 'Z'],
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
            this.append(this._axesUI.ui());
        }

        return this;
    }

    /**
     * Determines the amount of (integration) steps per clock tick.
     *
     * @param {number} substeps the number of steps for each clock tick dt.
     */
    substeps(substeps) {
        if (!Number.isInteger(substeps) || substeps < 1)
            throw new RangeError(`Substeps must be a positive integer, but received ${substeps}`);

        this._stepsPerClockTick = substeps;
        return this;
    }

    _updatePhysics() {
        let i = 0;
        const maxSteps = 10;
        const realTimeStep = this._clock.realTimeStep / this._stepsPerClockTick;
        const simulationTimeStep = this._clock.simulationTimeStep / this._stepsPerClockTick;

        while (this._clock.accumulator >= this._clock.realTimeStep && i < maxSteps) {
            for (let j = 0; j < this._stepsPerClockTick; j++) {
                this._stepFunction(this._clock, this._clock.simulationTimeStep);
                this._clock.tick(realTimeStep, simulationTimeStep);
            }

            i++;
        }
    }

    _tuneIterationsPerFrame(/** @type {number} */ timeStamp) {
        if (this._framesPerSecond < this._minimumFrameRate) {
            // The frame rate per second is lower than required => try to lower the iterations per frame
            if (this._iterationsPerFrame > 5) // do not drop below 5 iterations per frame
                this._iterationsPerFrame--;
        } else {
            // The frame rate per second is higher than required => try to increase the iterations per frame
            this._iterationsPerFrame++;
        }
    }

    /**
     * @param {number} timeStamp
     * @internal
     */
    animate = timeStamp => {
        if (this._status === Simulation.Status.RUNNING) {
            if (this._maxPerformanceFunction) {
                let iterations = 0;
                while (iterations < this._iterationsPerFrame) {
                    this._maxPerformanceFunction(this._clock);
                    iterations++;
                }
            }

            this._clock.updateWith(timeStamp, this._timeScale);
            if (this._stepFunction)
                this._updatePhysics();
        }

        this._framesPerSecond++;
        if (timeStamp - this._lastTime > 1000) {
            if (this._maxPerformanceFunction) {
                this._viewport.bottomLeftText = `${this._iterationsPerFrame} iterations @${this._framesPerSecond} fps`;
                this._tuneIterationsPerFrame(timeStamp);
            }
            this._framesPerSecond = 0;
            this._lastTime = timeStamp;
        }
        this._onFrame(timeStamp);

        // Sync model and views after model update
        for (const binding of this._bindings)
            binding.synchronize();

        this._renderer.render(timeStamp);
    };

    /**
     * The stepFunction is called with a frequency that is required to make the simulated time run
     * synchronously with the real clock time. This makes sure that these kind of simulations run
     * equally fast on different hardware. Suppose the frame rate is 60 frames / sec. So
     * elapsed time is approximately 0.0167, so the accumulator is incremented by this amount.
     * So, for example, with realTimeStep = 0.01, so 1/100 onStep() calls per second, the number of
     * onStep() calls per frame is approximately:
     * frame 1 -> step
     * frame 2 -> step + step
     * frame 3 -> step
     * frame 4 -> step + step
     *
     * @param {(clock: SimulationClock, dt: number) => void} stepFunction this function is called with the frequency that is required to make
     * the simulate time run synchronously with the real clock time.
     */
    onStep(stepFunction = (_clock, _dt) => {}) {
        if (this._maxPerformanceFunction)
            throw new Error('Cannot mix iteration mode and step mode');

        this._stepFunction = stepFunction;
        return this;
    }

    /**
     * Interaction / control with pointer (mouse, touch, pen).
     *
     * @param {string} action
     * @param {(x: number, y: number, event: PointerEvent) => void} callback
     * @param {AddEventListenerOptions} options
     * @returns {Simulation}
     */
    onPointer(action, callback, options = {}) {
        const canvas = this._viewport.canvas;

        // Pointer events unify mouse, pen, and touch. Disable browser gestures on
        // this interactive surface so touch movement is delivered as pointer events.
        canvas.style.touchAction = 'none';

        const eventHandler = event => {
            const bounds = canvas.getBoundingClientRect();
            if (!bounds.width || !bounds.height)
                return;

            const x = (event.clientX - bounds.left - bounds.width / 2) / bounds.width;
            const y = (bounds.top + bounds.height / 2 - event.clientY) / bounds.height;
            if (!Number.isFinite(x) || !Number.isFinite(y))
                return;

            // Keep drag interactions alive when the pointer moves beyond the canvas.
            if (action === 'pointerdown' && event.pointerId !== undefined)
                canvas.setPointerCapture?.(event.pointerId);

            callback(x, y, event);
            this.onUserInteractionEvent();
        };

        canvas.addEventListener(action, eventHandler, options);
        return this;
    }

    /**
     * Used to maximize CPU utilization.
     * Every second the system tries to optimize the CPU/computation cycles
     * per animation frame, within the minimum required frame rate constraint.
     *
     * @param {(time: SimulationClock) => void} maxPerformanceFunction The function that is called.
     * @param {number} minimumFrameRate The number of times per second requestAnimationFrame() needs to be invoked.
     * @param {number} iterationsPerFrame The initial iterations per frame, that subsequently gets tuned every second!
     */
    maxOutCpu(maxPerformanceFunction, minimumFrameRate = 30, iterationsPerFrame = 10) {
        if (this._stepFunction)
            throw new Error('Cannot mix iteration mode and step mode');

        this._maxPerformanceFunction = maxPerformanceFunction;
        this._iterationsPerFrame = iterationsPerFrame;
        this._minimumFrameRate = minimumFrameRate;
        return this;
    }

    /**
     * Called each (requestAnimation)frame.
     *
     * @param {(timeStamp: number) => void} callback the function that is called each (requestAnimation)frame.
     */
    onFrame(callback = (_timeStamp) => {}) {
        this._onFrame = callback;
        return this;
    }

    /**
     * Reset the simulation to its initial state.
     *
     * This resets the clock, clears all bindings, and calls the onReset callback if one has been set.
     * After calling this method, the simulation will be in a stopped state.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.reset();
     */
    reset() {
        this._clock.reset();

        for (const binding of this._bindings)
            binding.reset();

        this._onReset?.();
        return this;
    }

    /**
     * Add a mouse-click event listener to a simulation canvas. It defaults to start/stop.
     * When calling this function with a custom callback, the default start/stop functionality is
     * lost and needs to be re-added if needed!!
     *
     * @param {Event} _event - Internal event parameter (not used directly)
     * @internal
     */
    _defaultMouseClickCallback (_event) {
        if (this._status === Simulation.Status.STOPPED) {
            this._hud?.show('Running', 1000);
            this._status = Simulation.Status.RUNNING;
        } else if (this._status === Simulation.Status.RUNNING) {
            this._hud?.show('Click to reset the simulation');
            this._status = Simulation.Status.PAUSED;
        } else if (this._status === Simulation.Status.PAUSED) {
            this.reset();
            this._hud?.show('Click to restart the simulation');
            this._status = Simulation.Status.STOPPED;
        }
    }

    /**
     * @param {(event: Event) => void} callback
     * @returns {Simulation}
     */
    withMouseClickEventListener(callback = event => {}) {
        this._viewport.canvasWrapper.addEventListener('click', event => {
            this._defaultMouseClickCallback(event);
            callback(event);
        });
        return this;
    }

    /**
     * Start the simulation.
     *
     * Begins the animation loop and sets the status to RUNNING.
     * Also updates the run button text to show pause state.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.start();
     */
    start() {
        this._hud?.show('Running', 1000);
        this._status = Simulation.Status.RUNNING;
        this._runButton.withText('❚❚ Pause');
        return this;
    }

    /**
     * Stop the simulation.
     *
     * Halts the animation and sets the status to STOPPED.
     * Updates the run button text to show play state.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.stop();
     */
    stop() {
        this._hud?.show('Simulation stopped');
        this._status = Simulation.Status.STOPPED;
        this._runButton.withText('▶︎ Run');
        return this;
    }

    /**
     * @returns {boolean} True if the simulation is currently running
     *
     * @example
     * if (sim.isRunning) { ... }
     */
    get isRunning() { return this._status === Simulation.Status.RUNNING; }

    /**
     * Set a callback to be called when the simulation is reset.
     *
     * @param {Function} resetFunction - Function to call on reset. Called with no arguments.
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.onReset(() => console.log('Simulation reset'));
     */
    onReset(resetFunction = () => {}) {
        this._onReset = resetFunction;
        return this;
    }

    /**
     * Append an HTML control to the simulation.
     *
     * @param {HtmlControl} control Helion control to be appended
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * simulation.append(helionControl);
     */
    append(control) {
        if (!this._parameterDivExists) {
            this._viewport.createParameterDiv();
            this._parameterDivExists = true;
        }
        control.append(this._viewport.controlsDiv).to(this);
        this._viewport.enableParameterMenu();
        return this;
    }

    /**
     * Append the start/stop/reset UI controls to the simulation.
     *
     * Creates a compound control with a run/pause button and a reset button,
     * and appends it to the simulation's button container.
     *
     * @returns {this} This Simulation instance for chaining
     *
     * @example
     * sim.appendStartStopResetUI();
     */
    appendStartStopResetUI() {
        this._runButton
            .onClick(() => {
                if (this._status === Simulation.Status.RUNNING) {
                    this._hud?.show('Paused');
                    this._runButton.withText('▶︎ Run');
                    this.stop();
                } else {
                    this._hud?.show('Running', 1000);
                    this._runButton.withText('❚❚ Pause');
                    this.start();
                }
            })
            .togetherWith(new Button()
                .withText('⟳ Reset')
                .onClick(() => {
                    this._hud?.show('Reset', 1000);
                    this.reset();
                }));
        this._runButton.append(this._viewport.simulationButtonsDiv).to(this);
        return this;
    }

    /**
     * We enforce a new synchronization of ALL views after each user interaction.
     *
     * This method is called whenever the user interacts with the simulation
     * (e.g., clicking, dragging, using keyboard input). It forces all bound
     * models to synchronize their state with the view.
     *
     * @internal
     */
    onUserInteractionEvent() {
        for (const binding of this._bindings)
            binding.forceSynchronize();
    }

    /**
     * Append a pre-built graph (new pattern, like controls).
     * Graph lives in its own file/class; Simulation only attaches it.
     *
     * @param {UPlotGraph} graph
     * @returns {Simulation}
     */
    addGraph(graph) {
        if (!this._addOnsDivExists) {
            this._viewport.createAddOnsDiv();
            this._addOnsDivExists = true;
        }
        graph.attach(this._viewport.addOnsDiv);
        this._plot = graph;
        return this;
    }
}
