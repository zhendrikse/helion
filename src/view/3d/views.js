import {Mesh, PlaneGeometry, MeshPhongMaterial, Color, DoubleSide,
    BufferAttribute, BoxGeometry, MeshBasicMaterial, InstancedMesh, Object3D
} from "three";

import { Renderable3D } from "../../../src/index.js";
import { hsvToRgb } from "../../../src/index.js";

export class ComplexScalarFieldSurfaceRaster extends Renderable3D {
    constructor({
        width = 200,
        height = 200,
        scale = 20,
        zScale = 40,
        showPhaseColor = true,
        brightness = 1
    } = {}) {
        super();
        this._width = width;
        this._height = height;
        this._scale = scale;
        this._zScale = zScale;
        this._phaseColor = showPhaseColor;
        this._brightness = brightness;
        this._numColors = 256;
        this._hsvTable = new Array(this._numColors);
        for (let i = 0; i < this._numColors; i++) {
            this._hsvTable[i] = hsvToRgb(i / this._numColors, 1.0, 1.0);
        }

        // subdivided plane
        const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
        const material = new MeshPhongMaterial({
            vertexColors: true,
            side: DoubleSide,
            transparent: true
        });

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
        this._positions = geometry.attributes.position;
        this._colors = new Float32Array(this._positions.count * 3);
        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
    }

    canBindTo(field) {
        return field.sample && field.nx && field.ny;
    }

    synchronizeWith(field) {
        const pos = this._positions;
        let idx = 0;

        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const i = y * field.nx + x;
                const re = field.real[i];
                const im = field.imag[i];
                const mag = Math.sqrt(re * re + im * im);
                const phase = Math.atan2(im, re);

                // Height is real part
                pos.setXYZ(i, x - this._width / 2, re * this._zScale, y - this._height / 2);

                // Color is phase
                const phaseIndex = Math.floor(((phase + Math.PI) / (2 * Math.PI)) * this._numColors);
                const rgb = this._hsvTable[Math.max(0, Math.min(this._numColors - 1, phaseIndex))];
                this._colors[idx++] = rgb.r * mag * this._brightness;
                this._colors[idx++] = rgb.g * mag * this._brightness;
                this._colors[idx++] = rgb.b * mag * this._brightness;
            }

        this._positions.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
    }
}

export class PotentialField3DRaster extends Renderable3D {
    constructor({
        width = 200,
        height = 200,
        heightScale = 100,
        color = 0xff0033,
        opacity = 0.35
    }) {
        super();

        this._heightScale = heightScale;
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({
            transparent: true,
            opacity,
            color
        });

        this._mesh = new InstancedMesh(geometry, material, width * height);
        this.add(this._mesh);
        this._dummy = new Object3D();
    }

    canBindTo(field) {
        return field.sample && field.nx && field.ny;
    }

    synchronizeWith(field) {
        let index = 0;

        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const i = y * field.nx + x;
                const v = field._data[i];

                // skip empty space → HUGE performance win
                if (v === 0) {
                    this._dummy.scale.set(0, 0, 0);
                    this._dummy.updateMatrix();
                    this._mesh.setMatrixAt(index++, this._dummy.matrix);
                    continue;
                }

                this._dummy.position.set(x - field.nx / 2, v, y - field.ny / 2);
                this._dummy.scale.set(1, this._heightScale, 1);
                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index++, this._dummy.matrix);
            }

        this._mesh.instanceMatrix.needsUpdate = true;
    }
}