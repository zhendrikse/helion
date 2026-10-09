import {
    Mesh, PlaneGeometry, MeshBasicMaterial, DataTexture, RGBAFormat, Color, Box3, CircleGeometry, DoubleSide,
    Points, PointsMaterial, BufferGeometry, Float32BufferAttribute
} from 'three';

import { Renderable2D } from '../renderer.js';
import { CompoundControl, DropdownMenu } from '../../core/controls.js';
import { ColorMapper, Colour, ComplexColorMappers, HexValueColorMapper, WavelengthColorMapper} from '../colormappers.js';
import { AdaptiveSymmetricNormalizer, SurfaceResolution} from '../3d/surfaces/visualization.js';
import { ComplexFunctionSample, DiscreteScalarField, DiscreteComplexField} from '../../model/math/fields.js';
import { Normalizer} from '../3d/surfaces/visualization.js';
import { RadialSymmetricBody } from '../../model/phys/bodies.js';

export class DiscreteFieldSurfaceView extends Renderable2D {
    /**
     * @param {{
     *   colorMapper?: ColorMapper
     *   normalizer?: Normalizer
     *   opacityFunction?: (fieldValue: number) => number
     *   scale?: number
     * }} param0 
     */
    constructor({
        colorMapper = new WavelengthColorMapper({ lambdaInNanos: 525}),
        opacityFunction = (/** @type {number} */ fieldValue) => Math.sqrt(fieldValue),
        normalizer = new AdaptiveSymmetricNormalizer(),
        scale = 1
    } = {}) {
        super();
        this.scale.set(scale, scale, 1);
        this._colorMapper = colorMapper;
        this._opacityFunction = opacityFunction;
        this._mesh = null;
        this._pixels = new Uint8Array();
        this._texture = null;
        this._rgb = new Color();
        this._normalizer = normalizer;
    }

    /** @param {DiscreteScalarField} scalarField */
    initialize(scalarField) {
        const width = scalarField.nx;
        const height = scalarField.ny;
        this._pixels = new Uint8Array(width * height * 4);
        this._texture = new DataTexture(this._pixels, width, height, RGBAFormat);
        this._texture.needsUpdate = true;
        this._mesh = new Mesh(
            new PlaneGeometry(width, height),
            new MeshBasicMaterial({ map: this._texture, transparent: true, side: DoubleSide })
        );
        this.add(this._mesh);
    }

    /** @param {DiscreteScalarField} discreteScalarField */
    canBindTo(discreteScalarField) {
        if (discreteScalarField.valueAt === undefined || discreteScalarField.rangeAt === undefined)
            throw new Error('This view needs valueAt() and rangeAt() methods to display surface');
        return true;
    }

    /** @param {DiscreteScalarField} scalarField */
    synchronizeWith(scalarField) {
        const width = scalarField.nx;
        const height = scalarField.ny;
        this._normalizer.adaptTo(scalarField.rangeAt());
        let index = 0;

        for(let j = 0; j < height; j++)
            for(let i = 0; i < width; i++) {
                const value = this._normalizer.normalize(scalarField.valueAt(i, j));
                this._colorMapper?.map(value, this._rgb);
                this._pixels[index++] = 255 * this._rgb.r;
                this._pixels[index++] = 255 * this._rgb.g;
                this._pixels[index++] = 255 * this._rgb.b;
                this._pixels[index++] = 255 * this._opacityFunction(value);
            }

        this._texture.needsUpdate = true;
        this._mesh.material.map.needsUpdate = true;
    }
}

/**
 * Visualizes the edge of a pixel raster as a
 * vertical plane perpendicular to the intensity pixel raster itself.
 */
export class FieldEdgeIntensityPixelRaster extends Renderable2D {
    /**
     * @param {{
     * edgeHeight?: number
     * colorMapper?: ColorMapper
     * opacityFunction?: (fieldValue: number) => number
     * }} param0 
     */
    constructor({
        edgeHeight = 100,
        colorMapper = new WavelengthColorMapper({ lambdaInNanos: 525 }),
        opacityFunction = (/** @type {number} */ intensity) => Math.sqrt(intensity)
    } = {}) {
        super();
        this._opacityFunction = opacityFunction;
        this._texture = null;
        this._pixels = new Uint8Array();
        this._mesh = null;
        this._colorMapper = colorMapper;
        this._edgeHeight = edgeHeight;
        this._rgb = new Color();
    }

    /** @param {DiscreteScalarField} scalarField */
    initialize(scalarField) {
        this._pixels = new Uint8Array(scalarField.nx * 4);
        this._texture = new DataTexture(this._pixels, scalarField.nx, 1, RGBAFormat);
        this._texture.needsUpdate = true;

        this._mesh = new Mesh(
            new PlaneGeometry(scalarField.nx, this._edgeHeight),
            new MeshBasicMaterial({
                map: this._texture,
                transparent: true,
                side: DoubleSide
            })
        );

        this._mesh.rotation.x = Math.PI * 0.5; // Put edge straight up
        this._mesh.position.y = scalarField.ny * 0.5;
        this.add(this._mesh);    
    }

    /** @param {DiscreteScalarField} discreteScalarField */
    canBindTo(discreteScalarField) {
        if (discreteScalarField.valueAt === undefined || discreteScalarField.rangeAt === undefined)
            throw new Error('This view needs valueAt() and rangeAt() methods to display surface');
        return true;
    }

    /** @param {DiscreteScalarField} scalarField */
    synchronizeWith(scalarField) {
        const interval = scalarField.rangeAt();
        const j = scalarField.ny - 1;
        let index = 0;

        for (let i = 0; i < scalarField.nx; i++) {
            const value = interval.normalize(scalarField.valueAt(i, j));
            this._colorMapper?.map(value, this._rgb);
            this._pixels[index++] = 255 * this._rgb.r;
            this._pixels[index++] = 255 * this._rgb.g;
            this._pixels[index++] = 255 * this._rgb.b;
            this._pixels[index++] = 255 * this._opacityFunction(value);
        }

        this._texture.needsUpdate = true;
    }
}

/**
 * Base for 2D complex-field views (DataTexture).
 * Mirrors ComplexFieldViewable (3D) for 2D: same sample/valueAt contract,
 * same resolution() and canBindTo() with valueAt fast-path for discrete grids.
 */
export class ComplexFieldViewable2D extends Renderable2D {
    /** @param {SurfaceResolution} defaultResolution */
    constructor(defaultResolution = new SurfaceResolution(200, 200)) {
        super();
        this._fieldIsDiscrete = false;
        this._sample = new ComplexFunctionSample();
        this._resolution = defaultResolution;
        this._mesh = null;
        this._pixels = new Uint8Array();
        this._texture = null;
    }

    /** @param {DiscreteComplexField} field */
    resolution(field) {
        return {
            width: this._fieldIsDiscrete ? field.nx : this._resolution.u,
            height: this._fieldIsDiscrete ? field.ny : this._resolution.v,
        };
    }

    /** @param {DiscreteComplexField} field */
    canBindTo(field) {
        this._fieldIsDiscrete = field.nx !== undefined && field.ny !== undefined;
        if (this._fieldIsDiscrete) {
            if (!field.valueAt)
                throw new Error('2D complex view needs valueAt() on discrete field');
        } else {
            if (!field.sample)
                throw new Error('2D complex view needs sample() on continuous field');
        }
        return true;
    }

    dispose() {
        if (!this._mesh) return;
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._mesh.material.dispose();
        if (this._texture) this._texture.dispose();
        this._mesh = null;
        this._pixels = new Uint8Array();
        this._texture = null;
    }

    get boundingBox() {
        if (!this._mesh) return new Box3();
        this._mesh.geometry.computeBoundingBox();
        return this._mesh.geometry.boundingBox;
    }
}

export class ComplexSurfaceView2D extends ComplexFieldViewable2D {
    /**
    * @param {{
    * showPhaseColour?: boolean, 
    * brightnessFunction?: (modulus: number) => number, 
    * colorMapper?: ColorMapper, 
    * defaultResolution?: SurfaceResolution}} [param0]
     */
    constructor({
        showPhaseColour = true,
        brightnessFunction = (/** @type {number} */ modulus) => modulus > 1.0 ? 1.0 : modulus,
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsv),
        defaultResolution = new SurfaceResolution(400, 400),
    } = {}) {
        super(defaultResolution);
        this._brightnessFunction = brightnessFunction;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
        this._colorData = { phase: 0, modulus: 0 };
        this._phaseColor = showPhaseColour;
    }

    /** @param {ColorMapper} mapper */
    set colorMapper(mapper) { this._colorMapper = mapper; }

    /** @param {DiscreteComplexField} field */
    initialize(field) {
        this.dispose();
        const { width, height } = this.resolution(field);
        const pixels = new Uint8Array((width + 1) * (height + 1) * 4);
        const texture = new DataTexture(pixels, width + 1, height + 1, RGBAFormat);
        texture.needsUpdate = true;
        // World size: discrete keeps 1 world unit per texel, continuous uses 4x4 domain
        const worldWidth = this._fieldIsDiscrete ? width : 4;
        const worldHeight = this._fieldIsDiscrete ? height : 4;
        this._mesh = new Mesh(
            new PlaneGeometry(worldWidth, worldHeight),
            new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
        );
        this.add(this._mesh);

        this._pixels = pixels;
        this._texture = texture;
    }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ComplexColorMappers())
                .addEventListener('change', event => this._colorMapper = ComplexColorMappers.get(event.target.value))
            );
    }

    /** @param {boolean} showPhaseColour */
    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    /** @param {DiscreteComplexField} field */
    synchronizeWith(field) {
        const { width, height } = this.resolution(field);
        const sample = this._sample;
        const brightness = this._brightnessFunction;
        const sampleFunction = this._fieldIsDiscrete
            ? field.valueAt.bind(field)
            : field.sample.bind(field);

        let index = 0;
        for (let y = 0; y <= height; y++) {
            for (let x = 0; x <= width; x++) {
                this._fieldIsDiscrete ? 
                    sampleFunction(x, y, sample) : 
                    sampleFunction(x / width, y / height, sample);

                const intensity = 255 * brightness(sample.magnitude);
                if (this._phaseColor) {
                    this._colorData.phase = sample.phase;
                    this._colorData.modulus = sample.magnitude;
                    this._colorMapper.map(this._colorData, this._rgb);
                    // Modulate RGB with intensity, keep alpha opaque (no shine-through)
                    this._pixels[index++] = Math.round(this._rgb.r * intensity);
                    this._pixels[index++] = Math.round(this._rgb.g * intensity);
                    this._pixels[index++] = Math.round(this._rgb.b * intensity);
                } else {
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 0;
                }
                this._pixels[index++] = intensity;
            }
        }

        this._texture.needsUpdate = true;
        this._mesh.material.map.needsUpdate = true;
    }
}

export class ProbabilityDensityView2D extends Renderable2D {
    /**
     * Visualizes a discrete complex field as a Monte-Carlo probability cloud.
     * Samples are drawn directly from the numerical |psi(x,y)|^2 distribution.
     *
     * @param {{pointCount?: number, pointSize?: number, color?: Colour}} [param0]
     */
    constructor({
        pointCount = 30000,
        pointSize = 0.09,
        color = Colour.White
    } = {}) {
        super();
        this._pointCount = pointCount;
        this._material = new PointsMaterial({
            size: pointSize,
            transparent: true,
            opacity: 0.55,
            depthWrite: false
        });
        color.asThreeJsColor(this._material.color);
        this._geometry = new BufferGeometry();
        this._points = new Points(this._geometry, this._material);
        this.add(this._points);

        this._positions = new Float32Array(this._pointCount * 3);
    }

    /** @param {DiscreteComplexField} field */
    canBindTo(field) {
        if (field.nx === undefined || field.ny === undefined || !field.valueAt)
            throw new Error('ProbabilityDensityView2D needs a discrete complex field.');
        return true;
    }

    /** @param {DiscreteComplexField} field */
    synchronizeWith(field) {
        const width = field.nx;
        const height = field.ny;
        const cellCount = width * height;
        const cumulative = new Float64Array(cellCount);

        let total = 0;
        for (let i = 0; i < cellCount; i++) {
            const density = field.real[i] * field.real[i] + field.imag[i] * field.imag[i];
            total += density;
            cumulative[i] = total;
        }

        if (total === 0)
            return;

        for (let p = 0; p < this._pointCount; p++) {
            const target = Math.random() * total;
            let low = 0;
            let high = cellCount - 1;

            while (low < high) {
                const middle = (low + high) >> 1;
                if (cumulative[middle] < target)
                    low = middle + 1;
                else
                    high = middle;
            }

            const index = low;
            const x = index % width;
            const y = Math.floor(index / width);
            const offset = p * 3;

            this._positions[offset] = x + Math.random() - width * 0.5;
            this._positions[offset + 1] = 0;
            this._positions[offset + 2] = y + Math.random() - height * 0.5;
        }
        this._geometry.setAttribute('position', new Float32BufferAttribute(this._positions, 3));
        this._geometry.attributes.position.needsUpdate = true;
    }

    dispose() {
        this._geometry?.dispose();
        this._material.dispose();
        this._points && this.remove(this._points);
        this._points = null;
        this._geometry = null;
    }
}

export class ParticleView2D extends Renderable2D {
    /**
     * @param {{
     * segments?: number
     * colorFunction?: (property: any) => number
     * colorMapper?: ColorMapper
     * hasBorder?: boolean
     * borderColor?: Colour
     * }} [param0]
     */
    constructor({
        segments = 16,
        colorFunction = _particle => 0xffff00,
        colorMapper = new HexValueColorMapper(),
        hasBorder = false,
        borderColor = Colour.Yellow
    } = {}) {
        super();
        this._hasBorder = hasBorder;
        this._color = new Color();
        this._borderGeometry = new CircleGeometry(1.15, segments);
        this._borderMaterial = new MeshBasicMaterial({ color: borderColor.asThreeJsColor() });

        this._borderMesh = new Mesh(this._borderGeometry, this._borderMaterial);
        this.add(this._borderMesh);
        this._borderMesh.visible = hasBorder;

        this._geometry = new CircleGeometry(1, segments);
        this._material = new MeshBasicMaterial();
        this._mesh = new Mesh(this._geometry, this._material);
        this.add(this._mesh);
        this._colorFunction = colorFunction;
        this._colorMapper = colorMapper;
    }

    /** @param {(property: any) => number} fn */
    set colorFunction(fn) { this._colorFunction = fn; }
    
    /** @param {boolean} value */
    set hasBorder(value) {
        this._hasBorder = value;
        this._borderMesh.visible = this._hasBorder && this._mesh.visible;
    }

    /**
     * @param {RadialSymmetricBody} particle 
     * @returns {boolean}
     */
    canBindTo(particle) {
        if (!particle.position)
            throw new Error('ParticleView2D can only bind to particles with a position.');
        return true;
    }
    
    /**  @param {RadialSymmetricBody} particle */
    synchronizeWith(particle) {
        this._borderMesh.visible = this._hasBorder;
        this.position.copy(particle.position);
        this.scale.setScalar(particle.radius ?? 1);
        this._colorMapper.map(this._colorFunction(particle), this._color);
        this._material.color.copy(this._color);
    }

    dispose() {
        this._borderGeometry.dispose();
        this._borderMaterial.dispose();
        this._geometry.dispose();
        this._material.dispose();
        this.clear();
    }
}
