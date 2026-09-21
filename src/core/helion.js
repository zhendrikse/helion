import { Hud } from './hud.js';
import { ThreeJsRenderer} from '../view/3d/renderer.js';
import { Axes } from '../view/3d/composite/backgrounds.js';
import { generateUUID, Vec3 } from '../model/math/math.js';
import { UPlotGraph } from './uplot.js';
import { AxesUI, Button, HtmlControl } from './controls.js';
import { renderMath } from '../view/mathrenderer.js';
import { Viewport } from './viewport.js';
import { ThreeJsScene } from '../view/3d/scene.js';
import { Renderable, Renderer } from '../view/renderer.js';
import { Colour } from '../view/colormappers.js';

class SimulationClock {
    /**
     * @param {Object} [options]
     * @param {number} [options.realTimeStep=0.01]
     * @param {number} [options.simulationTimeStep=options.realTimeStep]
     * @param {number} [options.maxAccumulatedTime=0.25]
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

    reset() {
        this.simulatedTime = 0;
        this.accumulator = 0;
        this.elapsedTime = 0;
        this.previousClockTime = 0;
        this.clockTime = 0;
    }

    tick() {
        this.accumulator -= this.realTimeStep;
        this.simulatedTime += this.simulationTimeStep;
    }

    /** 
     * @param {number} clockTime 
     * @param {number} timeScale
     */
    updateWith(clockTime, timeScale) {
        this.previousClockTime = this.clockTime;
        this.clockTime = clockTime;
        this.elapsedTime = (this.clockTime - this.previousClockTime) * 1e-3;
        this.elapsedTime = Math.min(this.elapsedTime, this._maxAccumulatedTime);
        this.accumulator += this.elapsedTime * timeScale;
    }
}

export class Simulation {
    static Status = Object.freeze({
        RUNNING: 'Running',
        PAUSED: 'Paused',
        STOPPED: 'Stopped',
    });

    /**
     * @param {string} htmlDivId 
     * @param {boolean} parameterMenuCollapsed 
     * @param {string} aspectRatio 
     * @returns {Viewport}
     */
    static viewportFromHtmlDiv = (htmlDivId, parameterMenuCollapsed, aspectRatio) => {
        let canvasWrapper = document.getElementById(htmlDivId);
        if (!canvasWrapper) {
            console.warn(`No HTML div with ID = \'${htmlDivId}\' found: creating Helion div automatically!`);
            canvasWrapper = document.createElement('div');
            canvasWrapper.id = generateUUID();
            document.body.appendChild(canvasWrapper);
        }

        return new Viewport(canvasWrapper, parameterMenuCollapsed, aspectRatio);
    };

    static with(
        /**
         * @param {{
         *   htmlDivId?: string,
         *   viewport?: { aspectRatio?: string },
         *   camera?: {
         *     position?: Vec3,
         *     target?: Vec3,
         *     fieldOfView?: number,
         *     controls?: boolean,
         *     autoRotate?: boolean,
         *     orthographic?: boolean
         *   },
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
         *   infoPanel?: { text?: string },
         *   parameterMenuCollapsed?: boolean
         * }} [options]
         */
        {
            // @ts-ignore htmlDivId is part of the documented options object.
            htmlDivId,
            viewport = {
                aspectRatio: '1 / 1'
            },
            camera = {
                position: new Vec3(3, 3, 3),
                target: new Vec3(0, 0, 0),
                fieldOfView: 50,
                controls: true,
                autoRotate: false,
                orthographic: false
            },
            scene = {
                background: ThreeJsScene.Background.TRANSPARENT,
                backgroundColor: new Colour(0x0088ff),
                scale: 1
            },
            lighting = {
                enabled: true,
                shadows: false
            },
            headUpDisplay = {
                enabled: true
            },
            infoPanel = {
                text: ''
            },
            parameterMenuCollapsed = true
        } = {htmlDivId: '', camera: {}, viewport: {}, scene: {}, lighting: {}, headUpDisplay: {}, infoPanel: {}}) {
        const viewPort = Simulation.viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed, viewport.aspectRatio);
        const renderer = new ThreeJsRenderer({ camera, viewport, lighting, scene });
        renderer.attach(viewPort);
        return new Simulation(viewPort, renderer, headUpDisplay.enabled, infoPanel);
    }

    /**
     * @param {Viewport} viewport 
     * @param {Renderer} renderer 
     * @param {boolean} headUpDisplay 
     * @param {boolean} infoPanel 
     */
    constructor(viewport, renderer, headUpDisplay, infoPanel) {
        this._viewport = viewport;
        this._renderer = renderer;
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

    /** @param {Binding} binding */
    bind(binding) {
        // See if this view is already attached to some binding
        const existingIndex = this._bindings.findIndex(
            b => b.view === binding.view
        );

        if (existingIndex >= 0) {
            const old = this._bindings[existingIndex];

            // Reset old view before it is being reused
            old.view.reset?.();

            // Replace existing binding
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

    /** @param {number} timeStamp */
    _tuneIterationsPerFrame(timeStamp) {
        if (this._framesPerSecond <= this._minimumFrameRate)
            if (this._iterationsPerFrame > 5) // do not drop below 5 iterations per frame
                this._iterationsPerFrame--;
        else
            this._iterationsPerFrame++;
        this._viewport.bottomLeftText = `${this._iterationsPerFrame} iterations @${this._framesPerSecond} fps`;

        // start new measurement time interval
        this._framesPerSecond = 0;
        this._lastTime = timeStamp;
    }

    /** @param {number} timeStamp */
    animate = timeStamp => {
        if (this._status === Simulation.Status.RUNNING) {
            if (this._maxPerformanceFunction) {
                if (timeStamp - this._lastTime > 1000) // Update iterations per RAF every second
                    this._tuneIterationsPerFrame(timeStamp);

                let iterations = 0;
                while (iterations < this._iterationsPerFrame) {
                    this._maxPerformanceFunction(this._clock);
                    iterations++;
                }

                this._framesPerSecond++;
            }

            this._clock.updateWith(timeStamp, this._timeScale);
            if (this._stepFunction)
                this._updatePhysics();
        }

        this._onFrame(timeStamp);

        // Sync model and views after model update
        for (const binding of this._bindings)
            binding.synchronize();

        this._renderer.render(timeStamp);
        requestAnimationFrame(this.animate);
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
     * @param {Event} _event
     */
    defaultMouseClickCallback (_event) {
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
     *
     * @param {(event: Event) => void} callback
     * @returns {Simulation}
     */
    withMouseClickEventListener(callback = event => this.defaultMouseClickCallback(event)) {
        this._viewport.canvasWrapper.addEventListener('click', event => callback(event) );
        return this;
    }

    start() {
        this._hud?.show('Running', 1000);
        this._status = Simulation.Status.RUNNING;
        this._runButton.withText('❚❚ Pause');
        return this;
    }

    stop() {
        this._hud?.show('Simulation stopped');
        this._status = Simulation.Status.STOPPED;
        this._runButton.withText('▶︎ Run');
        return this;
    }

    get isRunning() { return this._status === Simulation.Status.RUNNING; }

    onReset(resetFunction = () => {}) {
        this._onReset = resetFunction;
        return this;
    }

    /**
     * @param {HtmlControl} control
     * @returns {Simulation}
     */
    append(control) {
        control.append(this._viewport.controlsDiv).to(this);
        this._viewport.enableParameterMenu();
        return this;
    }

    appendStartStopResetUI() {
        this._runButton
            .addEventListener('click', () => {
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
                .addEventListener('click', () => {
                    this._hud?.show('Reset', 1000);
                    this.reset();
                }));
        this._runButton.append(this._viewport.simulationButtonsDiv).to(this);
        return this;
    }

    /** @param {Event} _event */
    onUserInteraction(_event) {
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
        graph.attach(this._viewport.addOnsDiv);
        this._plot = graph;
        return this;
    }
}
