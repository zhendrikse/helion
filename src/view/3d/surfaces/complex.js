import { Mesh, DoubleSide, MeshStandardMaterial, PlaneGeometry, Color, BufferAttribute, ShaderMaterial } from 'three';
import { Renderable3D } from "../../renderer.js";
import { AdaptiveSymmetricNormalizer, SurfaceResolution } from "./visualization.js";
import { Complex, Range} from "../../../model/math/math.js";
import { ComplexColorMappers} from "../../colormappers.js";
import { CompoundControl, DropdownMenu, Slider } from "../../../core/controls.js";
import {ComplexFunctionSample} from "../../../model/math/fields.js";

/**
 * Base for all complex-field surface views.
 * Holds the shared contract: model.sample(u,v, ComplexFunctionSample{input,output})
 * and common mesh lifecycle. Subclasses provide height mapping, material and
 * resolution semantics. Discrete subclasses may override canBindTo/synchronizeWith
 * to use the fast valueAt() path when available (performance).
 */
export class ComplexFieldViewable extends Renderable3D {
    constructor(defaultResolution = new SurfaceResolution(400, 400)) {
        super();
        this._fieldIsDiscrete = false;
        this._sample = new ComplexFunctionSample();
        this._mesh = null;
        this._positions = null;
        this._colors = null;
        this._resolution = defaultResolution;
    }

    resolution(field) {
        return {
            width: this._fieldIsDiscrete ? field.nx : this._resolution.u,
            height: this._fieldIsDiscrete ? field.ny : this._resolution.v,
        }
    }

    dispose() {
        if (!this._mesh) return;
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._mesh.material.dispose();
        this._mesh = null;
        this._positions = null;
        this._colors = null;
        // subclasses with alpha buffer clear it as well
        if (this._alphas) this._alphas = null;
    }

    canBindTo(field) {
        this._fieldIsDiscrete = field.nx !== undefined && field.ny !== undefined;

        if (this._fieldIsDiscrete) {
            if (!field.valueAt)
                throw new Error("Surface view needs valueAt() on discrete field");
        } else {
            if (!field.sample)
                throw new Error("Surface view needs sample() on continuous field");
        }

        return true;
    }

    set colorMapper(mapper) { this._colorMapper = mapper; }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ComplexColorMappers())
                .addEventListener("change", event => this.colorMapper = ComplexColorMappers.get(event.target.value))
            )
            .add(new Slider("🪟 Opacity ")
                .withRange(new Range(0, 1, 0.01))
                .withValue(1)
                .addEventListener("input", event => this._mesh.material.opacity = Number(event.target.value))
            );
    }

    get boundingBox() {
        if (!this._mesh) return new Box3();
        this._mesh.geometry.computeBoundingBox();
        return this._mesh.geometry.boundingBox;
    }
}

/**
 * 3D surface view of a complex function, with height given by the modulus and color given by the phase.
 * The modulus is compressed using a hyperbolic tangent to prevent poles and large values from dominating the visualization.
 * 
 * Note: The displayed height is therefore not the exact modulus for large values.
 */
export class ComplexSurfaceView3D extends ComplexFieldViewable {
    constructor({
        normalizer = new AdaptiveSymmetricNormalizer(),
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsv),
        maxHeight = 4,
        opacity = 1,
        defaultResolution = new SurfaceResolution(400, 400),
    } = {}) {
        super(defaultResolution);

        this._maxHeight = maxHeight;
        this._opacity = opacity;
        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._color = new Color();
    }

    get colorMapper() { return this._colorMapper; }
    set colorMapper(mapper) { this._colorMapper = mapper; }

    initialize(field) {
        this.dispose();
        const { width, height } = this.resolution(field);
        const geometry = new PlaneGeometry(1, 1, width, height);
        const vertexCount = (width + 1) * (height + 1);
        geometry.setAttribute("color", new BufferAttribute(new Float32Array(vertexCount * 3), 3));
        this._mesh = new Mesh(geometry, new MeshStandardMaterial({
            side: DoubleSide,
            roughness: .95,
            emissive: true,
            vertexColors: true,
            transparent: true,
            opacity: this._opacity
        }));

        this.add(this._mesh);
        this._positions = geometry.attributes.position;
        this._colors = this._mesh.geometry.attributes.color
    }

    set maxHeight(value) { this._maxHeight = value; }

    setValueRange(field) {
        this._normalizer.reset();
        const { width, height } = this.resolution(field);

        for (let i = 0; i <= width; i++)
            for (let j = 0; j <= height; j++) {
                if (this._fieldIsDiscrete)
                    field.valueAt(i, j, this._sample);
                else
                    field.sample(i / width, j / height, this._sample);

                const modulus = this._maxHeight * Math.tanh(this._sample.abs / this._maxHeight);
                this._normalizer.include(modulus);
            }
    }

    updateMeshAt(index) {
        // --- compress modulus to prevent poles from dominating the height ---
        const modulus = this._maxHeight * Math.tanh(this._sample.abs / this._maxHeight);
        this._positions.array[index * 3] = this._sample.input.re;
        this._positions.array[index * 3 + 1] = modulus;
        this._positions.array[index * 3 + 2] = this._sample.input.im;

        const value = {
            phase: this._sample.phase,
            modulus: this._normalizer.normalize(modulus)
        };

        this._colorMapper.map(value, this._color);
        this._colors.setXYZ(index, this._color.r, this._color.g, this._color.b);
    }

    synchronizeWith(field) {
        this.setValueRange(field);
        let index = 0;
        const { width, height } = this.resolution(field);

        for (let i = 0; i <= width; i++) {
            const uu = i / width;

            for (let j = 0; j <= height; j++) {
                if (this._fieldIsDiscrete)
                    field.valueAt(i, j, this._sample);
                else
                    field.sample(uu, j / height, this._sample);
                this.updateMeshAt(index++);
            }
        }

        this._positions.needsUpdate = true;
        this._colors.needsUpdate = true;
        this._mesh.geometry.computeVertexNormals();
        this._mesh.geometry.computeBoundingBox();
    }

}

export class WaveFunctionSurface3D extends ComplexFieldViewable {
    static vertexShader = `
        attribute vec3 color;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
            vColor = color;
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `;
    static fragmentShader = `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uBrightness;
        
        void main() {
            float a = vAlpha * uBrightness;
            if (a < 0.01) discard;
            vec3 color = vColor;
            float alpha = vAlpha * uBrightness;            
            gl_FragColor = vec4(color, alpha);
        }
        `;
    constructor({
        zScale = 20,
        showPhaseColor = true,
        brightness = 1,
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Domain),
        defaultResolution = new SurfaceResolution(400, 400)
    } = {}) {
        super(defaultResolution);
        this._showPhaseColor = showPhaseColor;
        this._brightness = brightness;
        this._zScale = zScale;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
        // _sample already created by base
        this._colorData = { phase: 0, modulus: 0 }
        this._fieldIsDiscrete = false;

        this._alphas = null; // managed alongside base _mesh/_positions/_colors
    }

    set phaseColor(showPhaseColor) { this._showPhaseColor = showPhaseColor; }
    set zScale(value) { this._zScale = value; }
    get zScale() { return this._zScale; }

    initialize(field) {
        // ensure canBindTo has set _fieldIsDiscrete
        if (this._fieldIsDiscrete === undefined) this.canBindTo(field);
        this.dispose();
        const { width, height } = this.resolution(field);
        const geometry = new PlaneGeometry(1, 1, width, height);
        const material = new ShaderMaterial({
            vertexShader: WaveFunctionSurface3D.vertexShader,
            fragmentShader: WaveFunctionSurface3D.fragmentShader,
            transparent: true,
            side: DoubleSide,
            uniforms: {
                uBrightness: { value: this._brightness }
            }
        });

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);

        this._positions = geometry.attributes.position;
        this._colors = new Float32Array(this._positions.count * 3);
        this._alphas = new Float32Array(this._positions.count);

        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
        geometry.setAttribute("alpha", new BufferAttribute(this._alphas, 1));
    }

    dispose() {
        super.dispose();
        // _alphas already nulled by base; ensure geometry attribute is not leaked
        this._alphas = null;
    }

    setValueRange(field) {
        // Wave function uses fixed log/alpha mapping — no normalizer pass needed.
        // Kept for symmetry with ComplexSurfaceView3D so synchronizeWith has same shape.
    }

    updateMeshAt(index, x, y) {
        const sample = this._sample;
        const modulus = sample.magnitude;
        const displayHeight = Math.log1p(20 * modulus);

        this._positions.setXYZ(index, x, displayHeight * this._zScale, y);

        this._colorData.phase = this._showPhaseColor ? sample.phase : 0.65;
        this._colorData.modulus = modulus;
        this._colorMapper.map(this._colorData, this._rgb);

        const lighting = 0.6 + 0.4 * Math.cos(sample.phase);
        const intensity = Math.sqrt(modulus) * lighting;

        this._mesh.geometry.attributes.color.setXYZ(index, this._rgb.r * intensity, this._rgb.g * intensity, this._rgb.b * intensity);
        this._alphas[index] = Math.tanh(4.0 * modulus);
    }

    synchronizeWith(field) {
        this.setValueRange(field);
        const { width, height } = this.resolution(field);
        const xOffset = width / 2;
        const yOffset = height / 2;
        let index = 0;
        for (let y = 0; y < height; y++) {
            const z = y - yOffset;
            for (let x = 0; x < width; x++) {
                if (this._fieldIsDiscrete)
                    field.valueAt(x, y, this._sample);
                else
                    field.sample(x / width, y / height, this._sample);

                this.updateMeshAt(index++, x - xOffset, z);
            }
        }

        this._positions.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
        this._mesh.geometry.attributes.alpha.needsUpdate = true;
    }
}