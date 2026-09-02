import { Mesh, DoubleSide, MeshStandardMaterial, PlaneGeometry, Color, BufferAttribute, ShaderMaterial } from 'three';
import { Renderable3D } from "../../renderer.js";
import { AdaptiveSymmetricNormalizer, SurfaceResolution } from "./visualization.js";
import { Complex, Range} from "../../../model/math/math.js";
import { ComplexColorMappers} from "../../colormappers.js";
import { CompoundControl, DropdownMenu, Slider } from "../../../core/controls.js";
import {ComplexFunctionSample} from "../../../model/math/fields.js";

export class ContinuousComplexFieldView extends Renderable3D {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        normalizer = new AdaptiveSymmetricNormalizer(),
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsl),
        maxHeight = 4,
        opacity = 1
    } = {}) {
        super();

        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._resolution = resolution;
        this._sample = new ComplexFunctionSample();
        this._color = new Color();

        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        const vertexCount = (resolution.u + 1) * (resolution.v + 1);
        geometry.setAttribute("color", new BufferAttribute(new Float32Array(vertexCount * 3), 3));
        this._mesh = new Mesh(geometry, new MeshStandardMaterial({
            side: DoubleSide,
            roughness: .95,
            emissive: true,
            vertexColors: true,
            transparent: true,
            opacity: opacity
        }));

        this.add(this._mesh);
        this._maxHeight = maxHeight;
        this._positions = geometry.attributes.position;
        this._colors = this._mesh.geometry.attributes.color
    }

    set maxHeight(value) { this._maxHeight = value; }

    canBindTo(complexSurface) {
        if (!complexSurface.frameAt)
            throw new Error("Surface visualization needs frameAt(), which is not supported by the current model.");
        return true;
    }

    setValueRange(model) {
        this._normalizer.reset();

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;

            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.frameAt(u, v, this._sample);
                const modulus = this._maxHeight * Math.tanh(this._sample.abs / this._maxHeight);
                this._normalizer.include(modulus);
            }
        }
    }

    updateMeshAt(index) {
        // --- compress modulus to prevent poles from dominating the height ---
        const modulus = this._maxHeight * Math.tanh(this._sample.output.abs / this._maxHeight);
        this._positions.array[index * 3] = this._sample.input.re;
        this._positions.array[index * 3 + 1] = modulus;
        this._positions.array[index * 3 + 2] = this._sample.input.im;

        const value = {
            phase: this._sample.output.phase,
            modulus: this._normalizer.normalize(modulus)
        };

        this._colorMapper.map(value, this._color);
        this._colors.setXYZ(index, this._color.r, this._color.g, this._color.b);
    }

    synchronizeWith(complexSurface) {
        this.setValueRange(complexSurface);
        let index = 0;
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                complexSurface.sample(u, v, this._sample);
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

export class DiscreteComplexFieldSurfaceView extends Renderable3D {
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
        resolution = new SurfaceResolution(200, 200),
        zScale = 20,
        showPhaseColor = true,
        brightness = 1,
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Domain)
    } = {}) {
        super();
        this._showPhaseColor = showPhaseColor;
        this._resolution = resolution;
        this._brightness = brightness;
        this._zScale = zScale;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
        this._sample = new ComplexFunctionSample();
        this._colorData = { phase: 0, modulus: 0 }

        const width = resolution.u;
        const height = resolution.v;
        const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
        const material = new ShaderMaterial({
            vertexShader: DiscreteComplexFieldSurfaceView.vertexShader,
            fragmentShader: DiscreteComplexFieldSurfaceView.fragmentShader,
            transparent: true,
            //side: DoubleSide,
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

    set phaseColor(showPhaseColor) { this._showPhaseColor = showPhaseColor; }
    set zScale(value) { this._zScale = value; }
    get zScale() { return this._zScale; }

    synchronizeWith(complexSurface) {
        const u = this._resolution.u;
        const v = this._resolution.v;
        const zScale = this._zScale;
        const showPhaseColor = this._showPhaseColor;

        const pos = this._positions;
        const colors = this._colors;
        const alphas = this._alphas;
        const sample = this._sample;
        const colorMapper = this._colorMapper;
        const rgb = this._rgb;

        const xOffset = u / 2;
        const yOffset = v / 2;
        for (let y = 0; y < v; y++) {
            const z = y - yOffset;

            for (let x = 0; x < u; x++) {
                const i = y * u + x;
                const colorIndex = i * 3;

                complexSurface.frameAt(x, y, sample);
                const modulus = sample.magnitude;
                const phase = sample.phase;
                const height = Math.log1p(20 * modulus);

                pos.setXYZ(i, x - xOffset, height * zScale, z);

                const lighting = 0.6 + 0.4 * Math.cos(phase);
                const intensity = Math.pow(modulus, 0.45) * lighting;
                this._colorData.phase = showPhaseColor ? phase : 0.65;
                this._colorData.modulus = modulus;
                colorMapper.map(this._colorData, rgb);
                colors[colorIndex]     = rgb.r * intensity;
                colors[colorIndex + 1] = rgb.g * intensity;
                colors[colorIndex + 2] = rgb.b * intensity;
                alphas[i] = Math.tanh(3.0 * modulus);
            }
        }

        pos.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
        this._mesh.geometry.attributes.alpha.needsUpdate = true;
    }


    canBindTo(complexSurface) {
        console.log(complexSurface)
        if (!complexSurface.frameAt)
            throw new Error("Surface view needs frameAt() method to obtain data");
        return true;
    }
}