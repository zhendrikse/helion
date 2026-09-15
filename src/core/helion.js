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
    constructor({ id = generateUUID(), label = "registryLabel", entries = {} }) { this._entries = entries; this._label = label; this._id = id; }
    get(name) { return this._entries[name]; }
    get label() { return this._label; }
    get id() { return this._id; }
    get names() { return Object.keys(this._entries); }
    add(name, value) { this._entries[name] = value; }
}

export class Transformation { applyTo(body) {} }

export class MathPhysicsModelBehavior {
    alwaysWith(view) { return new Binding(this, view, Binding.Mode.ALWAYS); }
    onceWith(view) { return new Binding(this, view, Binding.Mode.ONCE); }
    apply(transformation) { transformation.applyTo(this); return this; }
    reset() {}
}

export class Binding {
    static Mode = Object.freeze({ ALWAYS: "always", ONCE: "once" });
    constructor(model, view, mode = Binding.Mode.ALWAYS) { this.model = model; this.view = view; this.mode = mode; }
    forceSynchronize(atClockTime) { this.view.synchronizeWith(this.model, atClockTime); }
    synchronize() { const viewNeedsSynchronization = this.mode === Binding.Mode.ALWAYS || this.view?.dirty; if (viewNeedsSynchronization && this.view.visible) this.view.synchronizeWith(this.model); }
    initialize() { if (!this.view.canBindTo(this.model)) throw new Error("Helion cannot bind this view to this model"); this.view.initialize(this.model); this.view.synchronizeWith(this.model); }
    reset() { this.model.reset?.(); this.view.reset?.(); }
}

class SimulationClock {
    constructor({ realTimeStep = 0.01, simulationTimeStep = realTimeStep, maxAccumulatedTime = 0.25 } = {}) { this.realTimeStep = realTimeStep; this.simulationTimeStep = simulationTimeStep; this.clockTime = 0; this.previousClockTime = 0; this.elapsedTime = 0; this.simulatedTime = 0; this.accumulator = 0; this._maxAccumulatedTime = maxAccumulatedTime; }
    reset() { this.simulatedTime = 0; this.accumulator = 0; this.elapsedTime = 0; this.previousClockTime = 0; this.clockTime = 0; }
    tick() { this.accumulator -= this.realTimeStep; this.simulatedTime += this.simulationTimeStep; }
    updateWith(clockTime, timeScale) { this.previousClockTime = this.clockTime; this.clockTime = clockTime; this.elapsedTime = (this.clockTime - this.previousClockTime) * 1e-3; this.elapsedTime = Math.min(this.elapsedTime, this._maxAccumulatedTime); this.accumulator += this.elapsedTime * timeScale; }
}

export class Simulation {
    static Status = Object.freeze({ RUNNING: "Running", PAUSED: "Paused", STOPPED: "Stopped", })
    static viewportFromHtmlDiv = (htmlDivId, parameterMenuCollapsed, aspectRatio) => { let canvasWrapper = document.getElementById(htmlDivId); if (!canvasWrapper) { console.warn(`No HTML div with ID = \"${htmlDivId}\" found: creating Helion div automatically!`); canvasWrapper = document.createElement("div"); canvasWrapper.id = generateUUID(); document.body.appendChild(canvasWrapper); } return new Viewport(canvasWrapper, parameterMenuCollapsed, aspectRatio); }
    static with({ htmlDivId, viewport = { aspectRatio: "1 / 1" }, camera = { position: new Vec3(3, 3, 3), target: new Vec3(0, 0, 0), fieldOfView: 50, controls: true, autoRotate: false, orthographic: false }, scene = { background: ThreeJsScene.Background.TRANSPARENT, backgroundColor: 0x0088ff, scale: 1 }, lighting = { enabled: true, shadows: false }, headUpDisplay = { enabled: true }, infoPanel = { text: "" }, parameterMenuCollapsed = true } = {}) { const viewPort = Simulation.viewportFromHtmlDiv(htmlDivId, parameterMenuCollapsed, viewport.aspectRatio); const renderer = new ThreeJsRenderer({ camera, viewport, lighting, scene }); renderer.attach(viewPort); return new Simulation(viewPort, renderer, headUpDisplay.enabled, infoPanel); }
    constructor(viewport, renderer, headUpDisplay, infoPanel) { this._viewport = viewport; this._renderer = renderer; this._bindings = []; this._plot = null; this._hud = null; this._onReset = () => {}; this._status = Simulation.Status.STOPPED; this._axesUI = null; this._timeScale = 1; this._clock = new SimulationClock(); this._maxPerformanceFunction = null; this._iterationsPerFrame = 10; this._minimumFrameRate = 30; this._stepFunction = null; this._stepsPerClockTick = 1; this._onFrame = (time) => {}; this._lastTime = performance.now(); this._framesPerSecond = 0; if (headUpDisplay) this._initHud(); if (infoPanel.text) this._viewport.infoPanelText = infoPanel.text; requestAnimationFrame(this.animate); }
    get width() { return this._viewport.width; } get height() { return this._viewport.height; }
    set cameraPosition(position) { this._renderer.cameraPosition = position; } set autoRotate(autoRotate) { this._renderer.autoRotate = autoRotate; } set axesVisible(visible) { this._renderer.axesVisible = visible; } set orthographic(orthographic) { this._renderer.orthographic = orthographic; }
    addObject3D(object3D) { this._renderer.add(object3D); return this; } removeAxes() { this._renderer.removeAxes(); return this; }
    setLatexTitle(latex) { renderMath(this._viewport.titleDiv, latex); return this; } setTextTitle(text) { this._viewport.titleDiv.textContent = text; return this; } clearTitle() { this._viewport.titleDiv.replaceChildren(); return this; }
    runsEvery(dt) { this._clock.realTimeStep = dt; return this; } advancesBy(dt) { this._clock.simulationTimeStep = dt; return this; }
    bind(binding) { const existingIndex = this._bindings.findIndex(b => b.view === binding.view); if (existingIndex >= 0) { const old = this._bindings[existingIndex]; old.view.reset?.(); this._bindings[existingIndex] = binding; binding.initialize(); } else { this._renderer.add(binding.view); this._bindings.push(binding); binding.initialize(); } return this; }
    _initHud() { this._hud = new Hud(); this._hud.attach(this._viewport); this._hud.show("Click to start the simulation"); }
    atSpeed(timeScale) { this._timeScale = timeScale; return this; }
    frameSceneOn(anObject, { padding = 1.2, translationY = 0, minDistance = 2, viewDirection = new Vec3(1, 1, 1) } = {}) { if (!anObject.boundingBox) throw new Error('Trying to provide axes for an object that does not have a boundingBox property'); this._renderer.frameSceneOn(anObject, { padding, translationY, minDistance, viewDirection }); return this; }
    provideAxesAround(anObject, { layoutType = Axes.Type.MATLAB, divisions = 10, frame = true, annotations = true, tickLabels = true, xyPlane = true, xzPlane = true, yzPlane = true, axisLabels = ["X", "Y", "Z"], positiveXZ = false, bottomAlign = true } = {}) { if (!anObject.boundingBox) throw new Error('Trying to provide axes for an object that does not have a boundingBox property'); const axes = this._renderer.provideAxesAround(anObject, { layoutType, divisions, frame, annotations, tickLabels, xyPlane, xzPlane, yzPlane, axisLabels, positiveXZ, bottomAlign }); if (this._axesUI) this._axesUI.axes = axes; else { this._axesUI = new AxesUI(axes); this.append(this._axesUI.ui()) } return this; }
    substeps(substeps) { this._stepsPerClockTick = substeps; return this; }
    _updatePhysics() { let i = 0; const maxSteps = 10; while (this._clock.accumulator >= this._clock.realTimeStep && i < maxSteps) { for (let j = 0; j < this._stepsPerClockTick; j++) { this._stepFunction(this._clock, this._clock.simulationTimeStep); this._clock.tick(); } i++; } }
    _tuneIterationsPerFrame(timeStamp) { if (this._framesPerSecond < this._minimumFrameRate) this._iterationsPerFrame--; else this._iterationsPerFrame++; this._framesPerSecond = 0; this._lastTime = timeStamp; }
    animate = (timeStamp) => { if (this._status === Simulation.Status.RUNNING) { if (this._maxPerformanceFunction) { if (timeStamp - this._lastTime > 1000) this._tuneIterationsPerFrame(timeStamp); let iterations = 0; while (iterations < this._iterationsPerFrame) { this._maxPerformanceFunction(this._clock); iterations++; } this._framesPerSecond++; } if (this._stepFunction) { this._clock.updateWith(timeStamp, this._timeScale); this._updatePhysics(); } } this._onFrame(timeStamp); for (const binding of this._bindings) binding.synchronize(); this._renderer.render(timeStamp); requestAnimationFrame(this.animate); };
    onStep(stepFunction = (clock, dt) => {}) { if (this._maxPerformanceFunction) throw new Error("Cannot mix iteration mode and step mode"); this._stepFunction = stepFunction; return this; }
    maxOutCpu(maxPerformanceFunction, minimumFrameRate = 30, iterationsPerFrame = 10) { if (this._stepFunction) throw new Error("Cannot mix iteration mode and step mode"); this._maxPerformanceFunction = maxPerformanceFunction; this._iterationsPerFrame = iterationsPerFrame; this._minimumFrameRate = minimumFrameRate; return this; }
    onFrame(callback = (timeStamp) => {}) { this._onFrame = callback; return this; }
    reset() { this._clock.reset(); for (const binding of this._bindings) binding.reset(); this._onReset?.(); }
    defaultMouseClickCallback(event) { if (this._status === Simulation.Status.STOPPED) { this._hud?.show("Running", 1000); this._status = Simulation.Status.RUNNING; } else if (this._status === Simulation.Status.RUNNING) { this._hud?.show("Click to reset the simulation"); this._status = Simulation.Status.PAUSED; } else if (this._status === Simulation.Status.PAUSED) { this.reset(); this._hud?.show("Click to restart the simulation"); this._status = Simulation.Status.STOPPED; } }
    withMouseClickEventListener(callback = event => this.defaultMouseClickCallback(event)) { this._viewport.canvasWrapper.addEventListener("click", event => callback(event)); return this; }
    start() { this._hud?.show("Running", 1000); this._status = Simulation.Status.RUNNING; return this; }
    stop() { this._hud?.show("Simulation stopped"); this._status = Simulation.Status.STOPPED; return this; }
    get isRunning() { return this._status === Simulation.Status.RUNNING; }
    onReset(resetFunction = () => {}) { this._onReset = resetFunction; return this }
    append(control) { control.append(this._viewport.controlsDiv).to(this); this._viewport.enableParameterMenu(); return this; }
    appendStartStopResetUI() { const runButton = new Button().withText("▶︎ Run"); runButton.addEventListener("click", () => { if (this._status === Simulation.Status.RUNNING) { this._hud?.show("Paused"); runButton.withText("▶︎ Run"); this.stop(); } else { this._hud?.show("Running", 1000); runButton.withText("❚❚ Pause"); this.start(); } }).togetherWith(new Button().addEventListener("click", () => { this._hud?.show("Reset", 1000); this.reset(); }).withText("⟳ Reset")); runButton.append(this._viewport.simulationButtonsDiv).to(this); return this; }
    onUserInteraction(event) { for (const binding of this._bindings) binding.forceSynchronize(this._clock.clockTime); }
    setupGraphWith({ dataDefinition, width = this._viewport.width, height = this._viewport.height, title="", xLabel="", yLabel="", maxPoints = 500, labelColor = "green" } = {}) { const plotParentDiv = this._viewport.addOnsDiv; this._plot = new UPlotGraph({ plotParentDiv, dataDefinition, width, height, title, xLabel, yLabel, maxPoints, labelColor }); return this; }
    plot(variables) { for (let i = 0; i < variables.length; ++i) this._plot.graphData[i].push(variables[i]); this._plot.update(); }
}
