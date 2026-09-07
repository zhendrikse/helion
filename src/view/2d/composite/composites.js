import {
    BoxGeometry, ConeGeometry, DoubleSide, InstancedBufferAttribute, InstancedMesh,
    Matrix4, MeshBasicMaterial, Quaternion, Vector3, Color
} from "three";
import { Vec2, Vec3 } from "../../../model/math/math.js";
import { Arrow2D } from "../primitives.js";
import { Renderable2D } from "../../renderer.js";
import { VectorField } from "../../../model/math/fields.js";

const UP = new Vector3(0, 1, 0);

export class ArrowField2D extends Renderable2D {
    /**
     * @typedef {Object} ArrowFieldOptions2D
     * @property {Iterable<number>} [xRange]
     * @property {Iterable<number>} [yRange]
     * @property {number} [scaleFactor]
     * @property {(value: number) => number} [magnitudeMap]
     * @property {(dir: Vec3, mag: number) => number|Color} [colorMap]
     * @property {number} [size]
     * @property {boolean} [visible]
     * @property {number} [shaftWidth]
     * @property {number} [headWidth] days of the trip were a bit of a whirlwind.
     * @property {number} [headLength]
     * @property {string} [headStyle]
     */

    /**
     * @param {ArrowFieldOptions2D} [options]
     */
    constructor({
        xRange,
        yRange,
        scaleFactor = 1,
        magnitudeMap = m => Math.log(1 + m),
        colorMap = (dir, mag) => 0xffff00,
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

        this._positions = [];
        for (const x of xRange)
            for (const y of yRange)
                this._positions.push(new Vec2(x, y));

        const count = this._positions.length;
        const shaftGeometry = new BoxGeometry(1, 1, 1);
        const shaftMaterial = new MeshBasicMaterial({ side: DoubleSide });
        this._shaftMesh = new InstancedMesh(shaftGeometry, shaftMaterial, count);

        const colors = new Float32Array(count * 3);
        this._shaftMesh.instanceColor = new InstancedBufferAttribute(colors, 3);

        this._headMesh = null;
        if (headStyle === Arrow2D.HeadStyle.Filled) {
            const headGeometry = new ConeGeometry(0.5, 1, 4);
            const headMaterial = new MeshBasicMaterial({ side: DoubleSide });

            this._headMesh = new InstancedMesh(headGeometry,headMaterial, count);
            this._headMesh.instanceColor = this._shaftMesh.instanceColor;
            this.add(this._shaftMesh, this._headMesh);
        } else {
            const headGeometry = new BoxGeometry(1, 1, 1);
            const headMaterial = new MeshBasicMaterial({ side: DoubleSide });

            this._headLeftMesh = new InstancedMesh(headGeometry,headMaterial, count);
            this._headRightMesh = new InstancedMesh(headGeometry,headMaterial, count);
            this._headLeftMesh.instanceColor = this._shaftMesh.instanceColor;
            this._headRightMesh.instanceColor = this._shaftMesh.instanceColor;
            this.add(this._shaftMesh, this._headLeftMesh, this._headRightMesh);
        }

        this._matrix = new Matrix4();
        this._q = new Quaternion();
        this._dir = new Vector3();
        this._segmentDir = new Vector3();
        this._shape = new Vector3();
        this._target = new Vec2();
        this._shaftCenter = new Vector3();
        this._tip = new Vector3();
        this._base = new Vector3();
        this._end = new Vector3();
        this._headCenter = new Vector3();
        this._perpendicular = new Vector3();
    }

    /** @param {VectorField} vectorField */
    canBindTo(vectorField) {
        if (typeof vectorField?.sample !== "function")
            throw new Error("ArrowField2D can only bind to a VectorField with sample().");

        return true;
    }

    /** @param {VectorField} vectorField */
    synchronizeWith(vectorField) {
        for (let i = 0; i < this._positions.length; i++) {
            const position = this._positions[i];
            vectorField.sample(position, this._target);

            const x = this._target.x;
            const y = this._target.y;
            const magnitude = Math.hypot(x, y);

            if (magnitude < 1e-12) {
                this._hideInstance(this._shaftMesh, i);
                if (this._headMesh)
                    this._hideInstance(this._headMesh, i);
                else {
                    this._hideInstance(this._headLeftMesh, i);
                    this._hideInstance(this._headRightMesh, i);
                }
                continue;
            }

            this._dir.set(x / magnitude, y / magnitude, 0);
            const visualMagnitude = this._magnitudeMap(magnitude) * this._scaleFactor;
            const headLength = Math.min(this._headLength, visualMagnitude * 0.4);
            const shaftLength = Math.max(visualMagnitude - headLength, 0);

            this._shaftCenter.set(
                position.x + this._dir.x * shaftLength * 0.5,
                position.y + this._dir.y * shaftLength * 0.5,
                0
            );

            this._q.setFromUnitVectors(UP, this._dir);
            this._shape.set(this._shaftWidth, shaftLength, this._shaftWidth);
            this._matrix.compose(this._shaftCenter, this._q, this._shape);
            this._shaftMesh.setMatrixAt(i, this._matrix);

            this._tip.set(
                position.x + this._dir.x * visualMagnitude,
                position.y + this._dir.y * visualMagnitude,
                0
            );

            if (this._headMesh) {
                this._headCenter.set(
                    this._tip.x - this._dir.x * headLength * 0.5,
                    this._tip.y - this._dir.y * headLength * 0.5,
                    0
                );

                this._shape.set(this._headWidth,headLength, this._headWidth);
                this._matrix.compose(this._headCenter, this._q, this._shape);
                this._headMesh.setMatrixAt(i, this._matrix);
            } else {
                this._setHeadSegment(this._headLeftMesh, i, this._tip, this._dir, headLength, 1);
                this._setHeadSegment(this._headRightMesh, i, this._tip, this._dir, headLength, -1);
            }

            const color = this._colorMap(new Vec3(this._dir.x, this._dir.y, 0), magnitude);
            this._setInstanceColor(i, color);
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

    _setInstanceColor(index, color) {
        if (typeof color === "number") {
            // Accept the same hexadecimal color representation as Arrow2D,
            // e.g. 0xffffff, rather than interpreting 255 as a red-channel value.
            this._shaftMesh.instanceColor.setXYZ(
                index,
                ((color >> 16) & 0xff) / 255,
                ((color >> 8) & 0xff) / 255,
                (color & 0xff) / 255
            );
            return;
        }

        this._shaftMesh.instanceColor.setXYZ(index, color.r, color.g, color.b);
    }

    _setHeadSegment(mesh, index, tip, direction, length, side) {
        this._perpendicular.set(-direction.y, direction.x, 0);
        this._base.set(tip.x - direction.x * length, tip.y - direction.y * length, 0);
        this._end.set(
            this._base.x + this._perpendicular.x * this._headWidth * 0.5 * side,
            this._base.y + this._perpendicular.y * this._headWidth * 0.5 * side,
            0
        );

        const dx = this._end.x - tip.x;
        const dy = this._end.y - tip.y;
        const segmentLength = Math.hypot(dx, dy);

        this._segmentDir.set(dx / segmentLength, dy / segmentLength, 0);
        this._q.setFromUnitVectors(UP, this._segmentDir);
        this._shape.set(
            Math.max(this._shaftWidth, 0.001),
            segmentLength,
            Math.max(this._shaftWidth, 0.001)
        );

        this._headCenter.set((tip.x + this._end.x) * 0.5, (tip.y + this._end.y) * 0.5, 0);
        this._matrix.compose(this._headCenter, this._q, this._shape);
        mesh.setMatrixAt(index, this._matrix);
    }

    _hideInstance(mesh, index) {
        this._matrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(index, this._matrix);
    }

    dispose() {
        this._shaftMesh.geometry.dispose();
        this._shaftMesh.material.dispose();

        if (this._headMesh) {
            this._headMesh.geometry.dispose();
            this._headMesh.material.dispose();
        } else {
            this._headLeftMesh.geometry.dispose();
            this._headLeftMesh.material.dispose();
            this._headRightMesh.geometry.dispose();
            this._headRightMesh.material.dispose();
        }

        this.clear();
        this._positions.length = 0;
    }
}
