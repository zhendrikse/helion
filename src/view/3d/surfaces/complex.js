import { Mesh, DoubleSide, MeshStandardMaterial, PlaneGeometry, Color, BufferAttribute } from 'three';
import { Renderable3D } from "../../renderer.js";
import { AdaptiveSymmetricNormalizer, SurfaceResolution } from "./visualization.js";
import { Complex, Range} from "../../../model/math/math.js";
import {ColorMappers, ComplexColorMappers} from "../../colormappers.js";
import { CompoundControl, DropdownMenu, Slider } from "../../../core/controls.js";

export class ComplexSurfaceView extends Renderable3D {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        normalizer = new AdaptiveSymmetricNormalizer(),
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsv),
        maxHeight = 4,
        opacity = 1
    } = {}) {
        super();

        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._resolution = resolution;
        this._sample = { in: new Complex(), out: new Complex() };
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

    canBindTo(model) {
        if (!model.sample)
            throw new Error("Surface visualization needs sample(), which is not supported by the current model.");
        return true;
    }

    setValueRange(model) {
        this._normalizer.reset();

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;

            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.sample(u, v, this._sample);
                const modulus = this._maxHeight * Math.tanh(this._sample.out.abs / this._maxHeight);
                this._normalizer.include(modulus);
            }
        }
    }

    updateMeshAt(index) {
        // --- compress modulus to prevent poles from dominating the height ---
        const modulus = this._maxHeight * Math.tanh(this._sample.out.abs / this._maxHeight);
        this._positions.array[index * 3] = this._sample.in.re;
        this._positions.array[index * 3 + 1] = modulus;
        this._positions.array[index * 3 + 2] = this._sample.in.im;

        const value = {
            phase: this._sample.out.phase,
            modulus: this._normalizer.normalize(modulus)
        };

        this._colorMapper.map(value, this._color);
        this._colors.setXYZ(index, this._color.r, this._color.g, this._color.b);
    }

    synchronizeWith(model) {
        this.setValueRange(model);
        let index = 0;
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.sample(u, v, this._sample);
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