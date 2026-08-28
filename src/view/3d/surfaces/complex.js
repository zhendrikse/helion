import { Mesh, DoubleSide, MeshStandardMaterial, PlaneGeometry, Color, BufferAttribute } from 'three';
import {Renderable3D} from "../../renderer.js";
import {SurfaceResolution} from "./visualization.js";
import {Complex, Interval} from "../../../model/math/math.js";

export class ComplexSurfaceView extends Renderable3D {
    constructor({
                    resolution = new SurfaceResolution(100, 100),
                    maxHeight = 4
                } = {}) {
        super();

        this._resolution = resolution;
        this._sample = { in: new Complex(), out: new Complex() };
        this._color = new Color();

        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        const vertexCount = (resolution.u + 1) * (resolution.v + 1);
        geometry.setAttribute("color", new BufferAttribute(new Float32Array(vertexCount * 3), 3));
        this._mesh = new Mesh(geometry, new MeshStandardMaterial({
            side: DoubleSide,
            vertexColors: true
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

    getRange(model) {
        let mMin = Infinity, mMax = -Infinity;
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;

            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.sample(u, v, this._sample);
                const modulus = this._sample.out.abs;
                if (modulus < mMin) mMin = modulus;
                if (modulus > mMax) mMax = modulus;
            }
        }
        return new Interval(mMin, mMax);
    }

    updateMeshAt(index, range) {
        // --- compress modulus to prevent poles from dominating the height ---
        const modulus = this._maxHeight * Math.tanh(this._sample.out.abs / this._maxHeight);
        this._positions.array[index * 3] = this._sample.in.re;
        this._positions.array[index * 3 + 1] = modulus;
        this._positions.array[index * 3 + 2] = this._sample.in.im;

        const hue = this._sample.out.phase + 0.5;
        const t = Math.sqrt(range.normalize(modulus)); // --- modulus → brightness ---
        this._color.setHSL(hue, 1.0, 0.35 + 0.25 * t);
        this._colors.setXYZ(index, this._color.r, this._color.g, this._color.b);
    }

    synchronizeWith(model) {
        const range = this.getRange(model);
        let index = 0;
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.sample(u, v, this._sample);
                this.updateMeshAt(index++, range);
            }
        }

        this._positions.needsUpdate = true;
        this._colors.needsUpdate = true;
        this._mesh.geometry.computeVertexNormals();
        this._mesh.geometry.computeBoundingBox();
    }

    get boundingBox() {
        this._mesh.geometry.computeBoundingBox();
        return this._mesh.geometry.boundingBox;
    }
}