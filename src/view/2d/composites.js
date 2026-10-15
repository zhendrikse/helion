import {
    MeshBasicMaterial, Color, BufferGeometry, LineSegments, DoubleSide,
    LineBasicMaterial, Line, Mesh, Float32BufferAttribute, Vector3, BufferAttribute
} from "three";
import { Vec2 } from "../../model/math/objects.js";
import { Renderable, Renderable2D } from "../renderer.js";
import { ComplexFunctionSample } from "../../model/math/fields.js";
import { Colour, hsvToRgb } from "../colormappers.js";
import { WaveFunction } from "../../model/phys/quantum/wavefunction.js";
import { OneDimensionalWaveFunctionArrows } from "../3d/composite/composites.js";
import { RadioGroup } from "../../core/controls.js";

export class StreamlinesView extends Renderable2D {
    /**
     * @param {{
     * color?: {Colour}
     * scaleFactor:? {number}
     * seedSpacing?: {number}
     * numberOfSegments?: {number}
     * visible:? {boolean}
     * }} [options]
     */
    constructor({
        numberOfSegments = 15,
        seedSpacing = 5,
        scaleFactor = 1e-2,
        color = new Colour(.175, .175, .175),
        visible = true
    } = {}) {
        super();
        this._scaleFactor = scaleFactor;
        this._numberOfSegments = numberOfSegments;
        this._seedSpacing = seedSpacing;
        this._geometry = new BufferGeometry();
        this._material = new LineBasicMaterial();
        color.asThreeJsColor(this._material.color);
        this._lines = new LineSegments(this._geometry, this._material);
        this.add(this._lines);
        this._allocatedSegmentCount = 0;
        this._position = new Vec2();
        this._velocity = new Vec2();
        this._vector = new Vec2();
        this._halfWidth = 0;
        this._halfHeight = 0;
        this.visible = visible;
    }

    set seedSpacing(seedSpacing) { this._seedSpacing = seedSpacing; }

    canBindTo(/** @type {{nx: number, ny: number, gridSpacing: number}} */ model) {
        if (model.nx === undefined ||
            model.ny === undefined ||
            model.gridSpacing === undefined)
            throw new Error('Fluid streamlines view can only bind to discrete models');

        return true;
    }

    _newGeometry(/** @type {number} */ maxSegmentCount) {
        this._geometry.dispose();
        this._geometry = new BufferGeometry();
        this._geometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(maxSegmentCount * 2 * 3), 3)
        );
        this._lines.geometry = this._geometry;
        this._allocatedSegmentCount = maxSegmentCount;
    }

    initialize(/** @type {{nx: number, ny: number, gridSpacing: number}} */ model) {
        this._halfWidth = 0.5 * model.nx * model.gridSpacing;
        this._halfHeight = 0.5 * model.ny * model.gridSpacing;
    }

    _positionNeedsClipping() {
        return this._position.x < -this._halfWidth ||
            this._position.x > this._halfWidth     ||
            this._position.y < -this._halfHeight   ||
            this._position.y > this._halfHeight;
    }

    synchronizeWith(/** @type {{nx: number, ny: number, gridSpacing: number }} */ fluid) {
        // Scene changes can resize the fluid grid without reinitializing this view.
        // Ensure the position buffer matches the current grid before writing into it.
        const seedCountX = Math.ceil((fluid.nx - 2) / this._seedSpacing);
        const seedCountY = Math.ceil((fluid.ny - 2) / this._seedSpacing);
        const maxSegmentCount = seedCountX * seedCountY * this._numberOfSegments;
        if (maxSegmentCount !== this._allocatedSegmentCount)
            this._newGeometry(maxSegmentCount);

        const positions = this._geometry.getAttribute('position').array;
        let segmentCount = 0;

        const halfWidth = .5 * fluid.nx;
        const halfHeight = .5 * fluid.ny;
        const gridSpacing = fluid.gridSpacing;
        for (let i = 1; i < fluid.nx - 1; i += this._seedSpacing)
            for (let j = 1; j < fluid.ny - 1; j += this._seedSpacing) {
                this._position.set((i - halfWidth) * gridSpacing, (j - halfHeight) * gridSpacing);

                for (let n = 0; n < this._numberOfSegments; n++) {
                    if (this._positionNeedsClipping())
                        break;
                    this._drawLine(fluid, segmentCount++, positions);
                    this._position.copy(this._vector);
                }
            }

        this._geometry.getAttribute('position').needsUpdate = true;
        this._geometry.setDrawRange(0, segmentCount * 2);
        this._geometry.computeBoundingSphere();
    }

    _drawLine(fluid, segmentCount, positions) {
        fluid.sample(this._position, this._velocity);
        this._vector.copy(this._position);
        this._vector.addScaledVector(this._velocity, this._scaleFactor);

        const offset = segmentCount * 6;
        positions[offset    ] = this._position.x; // from.x
        positions[offset + 1] = this._position.y; // from.y
        positions[offset + 2] = 0.005;            // from.z
        positions[offset + 3] = this._vector.x    // to.x
        positions[offset + 4] = this._vector.y    // to.y
        positions[offset + 5] = 0.005;            // to.z
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
    }
}

export class VelocitiesView extends Renderable2D {
    /**
     * @param{{
     * stepSize?: {number}
     * color?: {Colour}
     * scaleFactor?: {number}
     * visible?: {boolean}
     * }} [options]
     */
    constructor({
        scaleFactor = 1.5e-2,
        visible = true,
        color = new Colour(0.0, 0.125, 0.125),
        stepSize = 1
    } = {}) {
        super();
        this._scaleFactor = scaleFactor;
        this._stepSize = stepSize;
        this._geometry = new BufferGeometry();
        this._material = new LineBasicMaterial();
        color.asThreeJsColor(this._material.color);
        this._lines = new LineSegments(this._geometry, this._material);
        this.add(this._lines);
        this._allocatedSegmentCount = 0;
        this._velocity = new Vec2();
        this.visible = visible;
    }

    set stepSize(stepSize) { this._stepSize = stepSize; }

    canBindTo(/** @type {{nx: number, ny: number, gridSpacing: number, valueAt:(i: number, j:number, target: Vec2) => Vec2}} */ model) {
        if (model.valueAt === undefined ||
            model.nx === undefined ||
            model.ny === undefined ||
            model.gridSpacing === undefined)
            throw new Error('Fluid velocities view can only bind to models that behave as a fluid model');

        return true;
    }

    _newGeometry(/** @type {number} */ maxSegmentCount) {
        this._geometry.dispose();
        this._geometry = new BufferGeometry();
        this._geometry.setAttribute(
            'position',
            new BufferAttribute(new Float32Array(maxSegmentCount * 2 * 3), 3)
        );
        this._lines.geometry = this._geometry;
        this._allocatedSegmentCount = maxSegmentCount;
    }

    synchronizeWith(/** @type {{nx: number, ny: number, gridSpacing: number, velocityAt:(i: number, j: number, target: Vec2) => Vec2}} */ fluid) {
        const maxSegmentCount = fluid.nx * fluid.ny * 2;
        if (maxSegmentCount !== this._allocatedSegmentCount)
            this._newGeometry(maxSegmentCount);

        const positions = this._geometry.getAttribute('position').array;
        const h = fluid.gridSpacing;
        let segmentCount = 0;

        const halfWidth = .5 * fluid.nx;
        const halfHeight = .5 * fluid.ny;
        for (let i = 0; i < fluid.nx; i++) {
            if (i % this._stepSize) continue;
            for (let j = 0; j < fluid.ny; j++) {
                if (j % this._stepSize) continue;
                fluid.valueAt(j, i, this._velocity);
                const x0 = (i - halfWidth) * h;
                const x1 = x0 + this._velocity.x * this._scaleFactor;
                const y = (j - halfHeight + 0.5) * h;

                this._writeSegment(positions, segmentCount++, x0, y, x1, y);

                const x = (i - halfWidth + 0.5) * h;
                const y0 = (j - halfHeight) * h;
                const y1 = y0 + this._velocity.y * this._scaleFactor;

                this._writeSegment(positions, segmentCount++, x, y0, x, y1);
            }
        }
        this._geometry.getAttribute('position').needsUpdate = true;
        this._geometry.setDrawRange(0, segmentCount * 2);
        this._geometry.computeBoundingSphere();
    }

    _writeSegment(positions, segmentIndex, x0, y0, x1, y1) {
        const offset = segmentIndex * 6;
        positions[offset    ] = x0;    // from.x
        positions[offset + 1] = y0;    // from.y
        positions[offset + 2] = 0.004; // from.z
        positions[offset + 3] = x1;    // to.x
        positions[offset + 4] = y1;    // to.y
        positions[offset + 5] = 0.004; // to.z
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
    }
}

export class OneDimensionalWaveFunctionPlot extends Renderable2D {
    static Mode = Object.freeze({
        DENSITY_PHASE: "densityPhase",
        REAL_IMAG: "realImag"
    });

    /**
     * @param {{
     *  worldWidth?: number,
     *  worldHeight?: number,
     *  amplitude?: number,
     *  showImaginary?: boolean,
     *  mode?: string,
     *  nColors?: number
     * }} [options]
     */
    constructor(options = {}) {
        const {
            worldWidth = 20,
            worldHeight = 10,
            amplitude = 5,
            showImaginary = true,
            mode = OneDimensionalWaveFunctionPlot.Mode.DENSITY_PHASE,
            nColors = 360
        } = options;

        super();

        this._worldWidth = worldWidth;
        this._worldHeight = worldHeight;
        this._amplitudeScale = amplitude;
        this._densityBaseline = -worldHeight * 0.4;
        this._showImaginary = showImaginary;
        this._mode = mode;
        this._nColors = nColors;

        this._sample = new ComplexFunctionSample();
        this._colors = Array.from({ length: nColors + 1 }, (_, index) =>
            new Color().copy(hsvToRgb(index / nColors, 1, 0.5))
        );

        this._axis = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x808080 }));
        this._real = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffc000 }));
        this._imag = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x00d0ff }));
        this._phase = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
        this.add(this._axis, this._real, this._imag, this._phase);

        this._createStaticGeometry();
    }

    /** @param {WaveFunction} waveFunction */
    canBindTo(waveFunction) {
        if (waveFunction.ny !== 1 || typeof waveFunction.sample !== "function")
            throw new Error("OneDimensionalWaveFunctionPlot needs a one-dimensional complex field.");
        return true;
    }

    /** @param {string} mode */
    set mode(mode) {
        this._mode = mode;
        this._updateVisibility();
    }

    _createStaticGeometry() {
        this._axis.geometry.setAttribute("position", new Float32BufferAttribute([
            -this._worldWidth * 0.5, 0, 0,
             this._worldWidth * 0.5, 0, 0
        ], 3));
    }

    /** @param {number} sampleCount */
    _createWaveGeometry(sampleCount) {
        const positions = new Float32Array(sampleCount * 3);
        const positionAttribute = new Float32BufferAttribute(positions, 3);

        this._real.geometry.setAttribute("position", positionAttribute.clone());
        this._imag.geometry.setAttribute("position", positionAttribute.clone());

        const segmentCount = sampleCount - 1;
        const phasePositions = new Float32Array(segmentCount * 6 * 3);
        const phaseColors = new Float32Array(segmentCount * 6 * 3);

        this._phase.geometry.setAttribute("position", new Float32BufferAttribute(phasePositions, 3));
        this._phase.geometry.setAttribute("color", new Float32BufferAttribute(phaseColors, 3));
    }

    /** @param {WaveFunction} waveFunction */
    initialize(waveFunction) {
        this._real.geometry.dispose();
        this._imag.geometry.dispose();
        this._phase.geometry.dispose();
        this._real.geometry = new BufferGeometry();
        this._imag.geometry = new BufferGeometry();
        this._phase.geometry = new BufferGeometry();
        this._createWaveGeometry(waveFunction.nx);
    }

    /**
     * @param {number} x
     * @param {WaveFunction} waveFunction
     */
    _densityPhaseColor(x, waveFunction) {
        waveFunction.sample(x, 0, this._sample);
        const phase = (this._sample.phase % 1 + 1) % 1;
        return {
            density: this._sample.absSquared * this._amplitudeScale * 2,
            phase: phase,
            color: this._colors[Math.floor(phase * this._nColors)],
            x0: (x - 0.5) * this._worldWidth
        }
    }

    /** @param {WaveFunction} waveFunction */
    _updatePhaseGeometry(waveFunction) {
        const positions = this._phase.geometry.attributes.position.array;
        const colors = this._phase.geometry.attributes.color.array;
        const baseline = this._densityBaseline;

        const sampleCount = waveFunction.nx - 1;
        for (let x = 0; x < sampleCount; x++) {
            const densityPhaseColor0 = this._densityPhaseColor(x / sampleCount, waveFunction);
            const densityPhaseColor1 = this._densityPhaseColor((x + 1) / sampleCount, waveFunction);

            const y0 = baseline + densityPhaseColor0.density;
            const y1 = baseline + densityPhaseColor1.density;
            const vertexOffset = x * 18;
            positions.set([
                densityPhaseColor0.x0, baseline, -0.01,
                densityPhaseColor1.x0, baseline, -0.01,
                densityPhaseColor1.x0, y1, -0.01,

                densityPhaseColor0.x0, baseline, -0.01,
                densityPhaseColor1.x0, y1, -0.01,
                densityPhaseColor0.x0, y0, -0.01
            ], vertexOffset);

            for (let vertex = 0; vertex < 6; vertex++) {
                const color = vertex === 0 || vertex === 3 || vertex === 5 ? densityPhaseColor0.color : densityPhaseColor1.color;
                const colorOffset = (x * 6 + vertex) * 3;
                colors[colorOffset    ] = color.r;
                colors[colorOffset + 1] = color.g;
                colors[colorOffset + 2] = color.b;
            }
        }

        this._phase.geometry.attributes.position.needsUpdate = true;
        this._phase.geometry.attributes.color.needsUpdate = true;
    }

    _updateVisibility() {
        const realImag = this._mode === OneDimensionalWaveFunctionPlot.Mode.REAL_IMAG;
        const densityPhase = this._mode === OneDimensionalWaveFunctionPlot.Mode.DENSITY_PHASE;

        this._axis.visible = realImag;
        this._real.visible = realImag;
        this._imag.visible = realImag && this._showImaginary;
        this._phase.visible = densityPhase;
    }

    /** @param {WaveFunction} waveFunction */
    initializeWith(waveFunction) {
        this._updateVisibility();
    }

    /**
     * @param {number} x
     * @param {WaveFunction} waveFunction
     * @param {import("three").TypedArray} realPositions
     * @param {import("three").TypedArray} imagPositions
     */
    _drawRealImagCoordinates(x, waveFunction, realPositions, imagPositions) {
        const centerY = 0;
        const normalizedX = x / (waveFunction.nx - 1);
        waveFunction.sample(normalizedX, 0, this._sample);

        const worldX = -this._worldWidth * 0.5 + normalizedX * this._worldWidth;
        const offset = x * 3;

        realPositions[offset] = worldX;
        realPositions[offset + 1] = centerY + this._sample.output.re * this._amplitudeScale;
        realPositions[offset + 2] = 0.01;

        imagPositions[offset] = worldX;
        imagPositions[offset + 1] = centerY + this._sample.output.im * this._amplitudeScale;
        imagPositions[offset + 2] = 0.01;
    }

    /** @param {WaveFunction} waveFunction */
    synchronizeWith(waveFunction) {
        const realPositions = this._real.geometry.attributes.position.array;
        const imagPositions = this._imag.geometry.attributes.position.array;

        for (let x = 0; x < waveFunction.nx; x++)
            this._drawRealImagCoordinates(x, waveFunction, realPositions, imagPositions);

        this._real.geometry.attributes.position.needsUpdate = true;
        this._imag.geometry.attributes.position.needsUpdate = true;

        if (this._mode === OneDimensionalWaveFunctionPlot.Mode.DENSITY_PHASE)
            this._updatePhaseGeometry(waveFunction);
    }

    dispose() {
        for (const object of [this._axis, this._real, this._imag, this._phase]) {
            object.geometry.dispose();
            object.material.dispose();
        }

        this.clear();
    }
}


export class OneDimensionalWaveFunctionView extends Renderable {
    static Mode = Object.freeze({
        ARROWS: "arrows",
        REAL_IMAG: OneDimensionalWaveFunctionPlot.Mode.REAL_IMAG,
        DENSITY_PHASE: OneDimensionalWaveFunctionPlot.Mode.DENSITY_PHASE
    });

    /**
     * @param {{
     *  worldWidth?: number,
     *  worldHeight?: number,
     *  amplitude?: number,
     *  showImaginary?: boolean,
     *  arrowDistance?: number,
     *  arrowSize?: number,
     *  arrowOffsetX?: number,
     *  mode?: string
     * }} [options]
     */
    constructor({
        worldWidth = 20,
        worldHeight = 10,
        amplitude = 15,
        showImaginary = true,
        arrowDistance = 2,
        arrowSize = 1,
        arrowOffsetX = 0,
        mode = OneDimensionalWaveFunctionView.Mode.ARROWS
    } = {}) {
        super();

        this._arrows = new OneDimensionalWaveFunctionArrows({
            arrowDistance,
            size: arrowSize,
            amplitude
        });
        this._arrows.position.x = arrowOffsetX;

        this._plot = new OneDimensionalWaveFunctionPlot({
            worldWidth,
            worldHeight,
            amplitude,
            showImaginary,
            mode: OneDimensionalWaveFunctionPlot.Mode.REAL_IMAG
        });

        this.add(this._arrows, this._plot);
        this._mode = mode;
        this._updateVisibility();
    }

    ui() {
        return new RadioGroup()
            .add('Arrows', () => this.mode = OneDimensionalWaveFunctionView.Mode.ARROWS)
            .add('Real/imag', () => this.mode = OneDimensionalWaveFunctionView.Mode.REAL_IMAG)
            .add('Density/phase', () => this.mode = OneDimensionalWaveFunctionView.Mode.DENSITY_PHASE)
            .checked(this.mode === OneDimensionalWaveFunctionView.Mode.ARROWS ? 0 : this.mode === OneDimensionalWaveFunctionView.Mode.REAL_IMAG ? 1 : 2);
    }

    /** @param {WaveFunction} waveFunction */
    canBindTo(waveFunction) {
        this._arrows.canBindTo(waveFunction);
        this._plot.canBindTo(waveFunction);
        return true;
    }

    /** @param {WaveFunction} waveFunction */
    initialize(waveFunction) {
        this._arrows.initialize(waveFunction);
        this._plot.initialize(waveFunction);
        this._plot.initializeWith(waveFunction);
    }

    /** @param {WaveFunction} waveFunction */
    synchronizeWith(waveFunction) {
        this._arrows.synchronizeWith(waveFunction);
        this._plot.synchronizeWith(waveFunction);
    }

    /** @param {string} mode */
    set mode(mode) {
        this._mode = mode;
        this._updateVisibility();
    }

    /** @param {number} amplitude */
    set amplitude(amplitude) {
        this._amplitude = amplitude;
        this._plot.amplitude = amplitude;
        this._arrows.amplitude = amplitude;
    }

    _updateVisibility() {
        const arrows = this._mode === OneDimensionalWaveFunctionView.Mode.ARROWS;
        const plot = !arrows;

        this._arrows.visible = arrows;
        this._plot.visible = plot;

        if (plot)
            this._plot.mode = this._mode;
    }

    dispose() {
        this._arrows.dispose();
        this._plot.dispose();
        this.clear();
    }
}
