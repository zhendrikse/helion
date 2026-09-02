import { Mesh, DoubleSide, MeshStandardMaterial, PlaneGeometry, Color, BufferAttribute, ShaderMaterial } from 'three';
import { Renderable3D } from "../../renderer.js";
import { AdaptiveSymmetricNormalizer, SurfaceResolution } from "./visualization.js";
import { Complex, Range} from "../../../model/math/math.js";
import { ComplexColorMappers} from "../../colormappers.js";
import { CompoundControl, DropdownMenu, Slider } from "../../../core/controls.js";
import {ComplexFunctionSample} from "../../../model/math/fields.js";

export class ComplexSurfaceView3D extends Renderable3D {
    constructor({
        normalizer = new AdaptiveSymmetricNormalizer(),
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsl),
        maxHeight = 4,
        opacity = 1,
        defaultResolution = new SurfaceResolution(200, 200),
    } = {}) {
        super();

        this._maxHeight = maxHeight;
        this._opacity = opacity;
        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._defaultResolution = defaultResolution;
        this._sample = new ComplexFunctionSample();
        this._color = new Color();

        this._mesh = null;      // To be determined in initialize()
        this._positions = null; // To be determined in initialize()
        this._colors = null;    // To be determined in initialize()
    }

    _getResolution(surface) {
        return surface.sampleResolution ?? this._defaultResolution;
    }

    initialize(complexSurface) {
        this.dispose();
        const { u, v } = this._getResolution(complexSurface);
        const geometry = new PlaneGeometry(1, 1, u, v);
        const vertexCount = (u + 1) * (v + 1);
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

    dispose() {
        if (!this._mesh)
            return;

        this.remove(this._mesh);

        this._mesh.geometry.dispose();
        this._mesh.material.dispose();

        this._mesh = null;
        this._positions = null;
        this._colors = null;
    }

    set maxHeight(value) { this._maxHeight = value; }

    canBindTo(complexSurface) {
        if (!complexSurface.sample)
            throw new Error("Surface visualization needs sample(), which is not supported by the current model.");
        return true;
    }

    setValueRange(complexSurface) {
        this._normalizer.reset();
        const { u, v } = this._getResolution(complexSurface);

        for (let i = 0; i <= u; i++) {
            const uu = i / u;

            for (let j = 0; j <= v; j++) {
                complexSurface.sample(uu, j / v, this._sample);
                const modulus = this._maxHeight * Math.tanh(this._sample.abs / this._maxHeight);
                this._normalizer.include(modulus);
            }
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

    synchronizeWith(complexSurface) {
        this.setValueRange(complexSurface);
        let index = 0;
        const { u, v } = this._getResolution(complexSurface);

        for (let i = 0; i <= u; i++) {
            const uu = i / u;

            for (let j = 0; j <= v; j++) {
                complexSurface.sample(uu, j / v, this._sample);
                this.updateMeshAt(index++);
            }
        }

        this._positions.needsUpdate = true;
        this._colors.needsUpdate = true;
        this._mesh.geometry.computeVertexNormals();
        this._mesh.geometry.computeBoundingBox();
    }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ComplexColorMappers())
                .addEventListener("change", event =>
                    this._colorMapper = ComplexColorMappers.get(event.target.value)
            ))
            .add(new Slider("🪟 Opacity ")
                .withRange(new Range(0, 1, 0.01))
                .withValue(1)
                .addEventListener("input", event =>
                    this._mesh.material.opacity = Number(event.target.value)
            ));
    }

    get boundingBox() {
        this._mesh.geometry.computeBoundingBox();
        return this._mesh.geometry.boundingBox;
    }
}

export class WaveFunctionView extends Renderable3D {
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
        super();
        this._showPhaseColor = showPhaseColor;
        this._brightness = brightness;
        this._zScale = zScale;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
        this._sample = new ComplexFunctionSample();
        this._colorData = { phase: 0, modulus: 0 }
        this._fieldIsDiscrete = false;
        this._resolution = defaultResolution;

        this._mesh = null;      // To be determined at initialize()
        this._positions = null; // To be determined at initialize()
        this._colors = null;    // To be determined at initialize()
        this._alphas = null;    // To be determined at initialize()
    }

    set phaseColor(showPhaseColor) { this._showPhaseColor = showPhaseColor; }
    set zScale(value) { this._zScale = value; }
    get zScale() { return this._zScale; }

    resolution(field) {
        return {
            width: this._fieldIsDiscrete ? field.nx : this._resolution.u,
            height: this._fieldIsDiscrete ? field.ny : this._resolution.v,
        }
    }

    initialize(field) {
        const { width, height } = this.resolution(field);
        const geometry = new PlaneGeometry(1, 1, width, height);
        const material = new ShaderMaterial({
            vertexShader: WaveFunctionView.vertexShader,
            fragmentShader: WaveFunctionView.fragmentShader,
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

    synchronizeWith(field) {
        const { width, height } = this.resolution(field);
        const zScale = this._zScale;
        const showPhaseColor = this._showPhaseColor;

        const pos = this._positions;
        const colors = this._colors;
        const alphas = this._alphas;
        const sample = this._sample;
        const rgb = this._rgb;
        const isDiscrete = this._fieldIsDiscrete;

        const xOffset = width / 2;
        const yOffset = height / 2;
        for (let y = 0; y < height; y++) {
            const z = y - yOffset;

            for (let x = 0; x < width; x++) {
                const i = y * height + x;
                const colorIndex = i * 3;

                if (isDiscrete)
                    field.valueAt(x, y, sample);
                else
                    field.sample(x / width, y / height, sample);
                const modulus = sample.magnitude;
                const displayHeight = Math.log1p(20 * modulus);

                pos.setXYZ(i, x - xOffset, displayHeight * zScale, z);

                this._colorData.phase = showPhaseColor ? sample.phase : 0.65;
                this._colorData.modulus = modulus;
                this._colorMapper.map(this._colorData, rgb);
                const lighting = 0.6 + 0.4 * Math.cos(sample.phase);
                const intensity = Math.sqrt(modulus) * lighting;
                colors[colorIndex]     = rgb.r * intensity;
                colors[colorIndex + 1] = rgb.g * intensity;
                colors[colorIndex + 2] = rgb.b * intensity;
                alphas[i] = Math.tanh(4.0 * modulus);
            }
        }

        pos.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
        this._mesh.geometry.attributes.alpha.needsUpdate = true;
    }

    canBindTo(field) {
        this._fieldIsDiscrete = field.nx !== undefined && field.ny !== undefined;

        if (this._fieldIsDiscrete)
            if (!field.valueAt)
                throw new Error("Surface view needs fieldAt() method on discrete field to obtain data");
            else
            if (!field.sample)
                throw new Error("Surface view needs sample() method on continuous field to obtain data");

        return true;
    }
}