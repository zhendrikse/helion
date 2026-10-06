import {
    BoxGeometry, ConeGeometry, DoubleSide, InstancedBufferAttribute, InstancedMesh,
    Matrix4, MeshBasicMaterial, Quaternion, Color, BufferGeometry,
    LineBasicMaterial, Line, Mesh, Float32BufferAttribute, Vector3
} from "three";
import { Range } from "../../model/math/math.js";
import { Vec2, Vec3 } from "../../model/math/objects.js";
import { Arrow2D } from "./primitives.js";
import { Renderable, Renderable2D } from "../renderer.js";
import { VectorField, ComplexFunctionSample } from "../../model/math/fields.js";
import { Colour, hsvToRgb } from "../colormappers.js";
import { WaveFunction } from "../../model/phys/quantum/wavefunction.js";
import { OneDimensionalWaveFunctionArrows } from "../3d/composite/composites.js";

const UP = new Vector3(0, 1, 0);

export class ArrowField2D extends Renderable2D {
    /**
     * @param {{
     * xRange?: Range,
     * yRange?: Range,
     * scaleFactor?: number,
     * magnitudeMap?: (value: number) => number,
     * colorMap?: (dir: Vec3, mag: number) => Colour,
     * size?: number,
     * visible?: boolean,
     * shaftWidth?: number,
     * headLength?: number,
     * headWidth?: number,
     * headStyle?: string
     * }} options
     */
    constructor({
        xRange,
        yRange,
        scaleFactor = 1,
        magnitudeMap = m => Math.log(1 + m),
        colorMap = (dir, mag) => Colour.Yellow,
        size = 0.1,
        visible = true,
        shaftWidth = size * 0.35,
        headLength = size,
        headWidth = size * 0.6,
        headStyle = Arrow2D.HeadStyle.Open
    } = {}) {
        super();
        this.visible = visible;
        if (xRange == null || yRange == null)
            throw new Error("Cannot instantiate ArrowField2D without x- and y-ranges");

        this._scaleFactor = scaleFactor;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;
        this._headStyle = headStyle;

        this._shaftWidth = shaftWidth;
        this._headLength = headLength;
        this._headWidth = headWidth;

        this._xRange = xRange;
        this._yRange = yRange;

        const count = xRange.count * yRange.count;
        const shaftGeometry = new BoxGeometry(1, 1, 1);
        const shaftMaterial = new MeshBasicMaterial({ side: DoubleSide });
        this._shaftMesh = new InstancedMesh(shaftGeometry, shaftMaterial, count);

        const colors = new Float32Array(count * 3);
        this._shaftMesh.instanceColor = new InstancedBufferAttribute(colors, 3);

        this._headMesh = null;
        const headMaterial = new MeshBasicMaterial({ side: DoubleSide });
        const headGeometry = headStyle === Arrow2D.HeadStyle.Filled ? new ConeGeometry(0.5, 1, 4) : new BoxGeometry(1, 1, 1);
        this._headMesh = new InstancedMesh(headGeometry,headMaterial, count);
        this._headMesh.instanceColor = this._shaftMesh.instanceColor;
        this._headLeftMesh = new InstancedMesh(headGeometry,headMaterial, count);
        this._headRightMesh = new InstancedMesh(headGeometry,headMaterial, count);
        this._headLeftMesh.instanceColor = this._shaftMesh.instanceColor;
        this._headRightMesh.instanceColor = this._shaftMesh.instanceColor;

        if (headStyle === Arrow2D.HeadStyle.Filled) 
            this.add(this._shaftMesh, this._headMesh);
        else 
            this.add(this._shaftMesh, this._headLeftMesh, this._headRightMesh);

        this._matrix = new Matrix4();
        this._q = new Quaternion();
        this._dir = new Vec3();
        this._shape = new Vec3();
        this._position = new Vec2();
        this._target = new Vec3();
        this._shaftCenter = new Vec3();
        this._tip = new Vec3();
        this._base = new Vec3();
        this._end = new Vec3();
        this._headCenter = new Vec3();
        this._perpendicular = new Vec3();

        this._scratchVector = new Vec3();
    }

    /** @param {number} amplitude */
    set amplitude(amplitude) {
        this._amplitude = amplitude;
    }

    /** @param {VectorField} vectorField */
    canBindTo(vectorField) {
        if (typeof vectorField?.sample !== "function")
            throw new Error("ArrowField2D can only bind to a VectorField with sample().");

        return true;
    }

    /** @param {number} index */
    _updateVectorAt(index) {
        const x = -this._target.x;
        const y = -this._target.y;
        const magnitude = Math.hypot(x, y);

        if (magnitude < 1e-12) {
            this._hideInstance(this._shaftMesh, index);
            if (this._headMesh)
                this._hideInstance(this._headMesh, index);
            else {
                this._hideInstance(this._headLeftMesh, index);
                this._hideInstance(this._headRightMesh, index);
            }
            return;
        }

        this._dir.set(x / magnitude, y / magnitude, 0);
        const visualMagnitude = this._magnitudeMap(magnitude) * this._scaleFactor;
        const headLength = Math.min(this._headLength, visualMagnitude * 0.4);
        const shaftLength = Math.max(visualMagnitude - headLength, 0);

        this._scratchVector.set(this._position.x, this._position.y, 0).addScaledVector(this._dir, shaftLength * 0.5);
        this._q.setFromUnitVectors(UP, this._dir);
        this._shape.set(this._shaftWidth, shaftLength, this._shaftWidth);
        this._matrix.compose(this._scratchVector, this._q, this._shape);
        this._shaftMesh.setMatrixAt(index, this._matrix);

        this._scratchVector.set(this._position.x, this._position.y, 0);
        this._tip.copy(this._scratchVector.addScaledVector(this._dir, visualMagnitude));

        if (this._headMesh) {
            this._headCenter.copy(this._tip.clone().addScaledVector(this._dir, -headLength * 0.5));
            this._shape.set(this._headWidth,headLength, this._headWidth);
            this._matrix.compose(this._headCenter, this._q, this._shape);
            this._headMesh.setMatrixAt(index, this._matrix);
        } else {
            this._setHeadSegment(this._headLeftMesh, index, this._tip, this._dir, headLength, 1);
            this._setHeadSegment(this._headRightMesh, index, this._tip, this._dir, headLength, -1);
        }

        this._scratchVector.set(this._dir.x, this._dir.y, 0);
        const color = this._colorMap(this._scratchVector, magnitude);
        this._shaftMesh.instanceColor.setXYZ(index, color.r, color.g, color.b);
    }

    /** @param {VectorField} vectorField */
    synchronizeWith(vectorField) {
        let index = 0;
        for (const x of /** @type {Iterable<number>} */ (this._xRange))
            for (const y of /** @type {Iterable<number>} */ (this._yRange)) {
                this._position.set(x, y);
                vectorField.sample(this._position, this._target);
                this._updateVectorAt(index++);
        }

        this._shaftMesh.instanceMatrix.needsUpdate = true;
        this._shaftMesh.instanceColor.needsUpdate = true;

        if (this._headMesh) {
            this._headMesh.instanceMatrix.needsUpdate = true;
            return;
        }

        this._headLeftMesh.instanceMatrix.needsUpdate = true;
        this._headRightMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * @param {InstancedMesh} mesh
     * @param {number} index
     * @param {Vec3} tip
     * @param {Vec3} direction
     * @param {number} length
     * @param {number} side
     */
    _setHeadSegment(mesh, index, tip, direction, length, side) {
        this._perpendicular.set(-direction.y, direction.x, 0);
        this._base.copy(tip.clone().addScaledVector(direction, -length));
        this._end.copy(this._base.clone().addScaledVector(this._perpendicular, this._headWidth * 0.5 * side));

        const dx = this._end.x - tip.x;
        const dy = this._end.y - tip.y;
        const segmentLength = Math.hypot(dx, dy);

        this._scratchVector.set(dx / segmentLength, dy / segmentLength, 0);
        this._q.setFromUnitVectors(UP, this._scratchVector);
        this._shape.set(Math.max(this._shaftWidth, 0.001), segmentLength, Math.max(this._shaftWidth, 0.001));

        this._headCenter.set((tip.x + this._end.x) * 0.5, (tip.y + this._end.y) * 0.5, 0);
        this._matrix.compose(this._headCenter, this._q, this._shape);
        mesh.setMatrixAt(index, this._matrix);
    }

    /**
     * @param {InstancedMesh} mesh
     * @param {number} index
     */
    _hideInstance(mesh, index) {
        this._matrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(index, this._matrix);
    }

    dispose() {
        this._shaftMesh.geometry.dispose();
        this._shaftMesh.material.dispose();
        this._headMesh.geometry.dispose();
        this._headMesh.material.dispose();
        this._headLeftMesh.geometry.dispose();
        this._headLeftMesh.material.dispose();
        this._headRightMesh.geometry.dispose();
        this._headRightMesh.material.dispose();

        this.clear();
    }
}

class OneDimensionalWaveFunctionPlot extends Renderable2D {
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
