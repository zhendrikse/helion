import {
    BoxGeometry,
    ConeGeometry,
    DoubleSide,
    InstancedBufferAttribute,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    Quaternion,
    Vector3
} from "three";
import { Vec2, Vec3 } from "../../../model/math/math.js";
import { Arrow2D } from "../primitives.js";
import { Renderable3D } from "../../renderer.js";
import { VectorField } from "../../../model/math/fields.js";

const UP = new Vector3(0, 1, 0);

export class ArrowField2D extends Renderable3D {
    /**
     * @typedef {Object} ArrowFieldOptions2D
     * @property {Iterable<number>} [xRange]
     * @property {Iterable<number>} [yRange]
     * @property {number} [scaleFactor]
     * @property {(value: number) => number} [magnitudeMap]
     * @property {(dir: Vec3, mag: number) => number} [colorMap]
     * @property {number} [size]
     * @property {number} [lineWidth]
     * @property {number} [headWidth]
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
        colorMap = (dir, mag) => 0xff0000,
        size = 0.1,
        headLength = size,
        headWidth = size * 0.6,
        lineWidth = 2,
        headStyle = Arrow2D.HeadStyle.Open
    } = {}) {
        super();

        if (xRange == null || yRange == null)
            throw new Error("Cannot instantiate ArrowField2D without x- and y-ranges");

        this._scaleFactor = scaleFactor;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;
        this._headStyle = headStyle;

        this._headLength = headLength;
        this._headWidth = headWidth;

        this._positions = [];
        for (const x of xRange)
            for (const y of yRange)
                this._positions.push(new Vec2(x, y));

        const count = this._positions.length;

        // ArrowField2D deliberately uses instancing, just like ArrowField3D:
        // every arrow is represented by matrix/color data rather than by a
        // collection of individual Three.js objects and geometries.
        const shaftGeometry = new BoxGeometry(1, 1, 1);
        const shaftMaterial = new MeshBasicMaterial({
            side: DoubleSide,
            vertexColors: true
        });

        this._shaftMesh = new InstancedMesh(
            shaftGeometry,
            shaftMaterial,
            count
        );

        const colors = new Float32Array(count * 3);
        this._shaftMesh.instanceColor = new InstancedBufferAttribute(colors, 3);

        this._headMesh = null;
        if (headStyle === Arrow2D.HeadStyle.Filled) {
            const headGeometry = new ConeGeometry(0.5, 1, 4);
            const headMaterial = new MeshBasicMaterial({
                side: DoubleSide,
                vertexColors: true
            });

            this._headMesh = new InstancedMesh(
                headGeometry,
                headMaterial,
                count
            );
            this._headMesh.instanceColor = this._shaftMesh.instanceColor;
            this.add(this._shaftMesh, this._headMesh);
        } else {
            const headGeometry = new BoxGeometry(1, 1, 1);
            const headMaterial = new MeshBasicMaterial({
                side: DoubleSide,
                vertexColors: true
            });

            this._headLeftMesh = new InstancedMesh(
                headGeometry,
                headMaterial,
                count
            );
            this._headRightMesh = new InstancedMesh(
                headGeometry,
                headMaterial,
                count
            );
            this._headLeftMesh.instanceColor = this._shaftMesh.instanceColor;
            this._headRightMesh.instanceColor = this._shaftMesh.instanceColor;
            this.add(this._shaftMesh, this._headLeftMesh, this._headRightMesh);
        }

        this._matrix = new Matrix4();
        this._q = new Quaternion();
        this._dir = new Vector3();
        this._shape = new Vector3();
        this._target = new Vec2();

        // Keep lineWidth in the API for consistency with Arrow2D. For an
        // instanced field, shaft width is expressed in world units instead.
        this._shaftWidth = Math.max(size * 0.35, lineWidth * 0.001);
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

            const visualMagnitude =
                this._magnitudeMap(magnitude) * this._scaleFactor;

            const headLength = Math.min(
                this._headLength,
                visualMagnitude * 0.4
            );
            const shaftLength = Math.max(visualMagnitude - headLength, 0);

            const shaftCenter = new Vector3(
                position.x + this._dir.x * shaftLength * 0.5,
                position.y + this._dir.y * shaftLength * 0.5,
                0
            );

            this._q.setFromUnitVectors(UP, this._dir);
            this._shape.set(this._shaftWidth, shaftLength, this._shaftWidth);
            this._matrix.compose(shaftCenter, this._q, this._shape);
            this._shaftMesh.setMatrixAt(i, this._matrix);

            const tip = new Vector3(
                position.x + this._dir.x * visualMagnitude,
                position.y + this._dir.y * visualMagnitude,
                0
            );

            if (this._headMesh) {
                const headCenter = new Vector3(
                    tip.x - this._dir.x * headLength * 0.5,
                    tip.y - this._dir.y * headLength * 0.5,
                    0
                );

                this._q.setFromUnitVectors(UP, this._dir);
                this._shape.set(
                    this._headWidth,
                    headLength,
                    this._headWidth
                );
                this._matrix.compose(headCenter, this._q, this._shape);
                this._headMesh.setMatrixAt(i, this._matrix);
            } else {
                this._setHeadSegment(
                    this._headLeftMesh,
                    i,
                    tip,
                    this._dir,
                    headLength,
                    1
                );
                this._setHeadSegment(
                    this._headRightMesh,
                    i,
                    tip,
                    this._dir,
                    headLength,
                    -1
                );
            }

            const color = this._colorMap(
                new Vec3(this._dir.x, this._dir.y, 0),
                magnitude
            );
            this._shaftMesh.instanceColor.setXYZ(
                i,
                color.r ?? ((color >> 16) & 0xff) / 255,
                color.g ?? (((color >> 8) & 0xff) / 255),
                color.b ?? ((color & 0xff) / 255)
            );
        }

        this._shaftMesh.instanceMatrix.needsUpdate = true;
        this._shaftMesh.instanceColor.needsUpdate = true;

        if (this._headMesh)
            this._headMesh.instanceMatrix.needsUpdate = true;
        else {
            this._headLeftMesh.instanceMatrix.needsUpdate = true;
            this._headRightMesh.instanceMatrix.needsUpdate = true;
        }
    }

    _setHeadSegment(mesh, index, tip, direction, length, side) {
        const perpendicular = new Vector3(-direction.y, direction.x, 0);
        const base = new Vector3(
            tip.x - direction.x * length,
            tip.y - direction.y * length,
            0
        );
        const end = new Vector3(
            base.x + perpendicular.x * this._headWidth * 0.5 * side,
            base.y + perpendicular.y * this._headWidth * 0.5 * side,
            0
        );
        const start = tip;
        const center = new Vector3(
            (start.x + end.x) * 0.5,
            (start.y + end.y) * 0.5,
            0
        );
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const segmentLength = Math.hypot(dx, dy);

        this._q.setFromUnitVectors(
            UP,
            new Vector3(dx / segmentLength, dy / segmentLength, 0)
        );
        this._shape.set(
            Math.max(this._shaftWidth, 0.001),
            segmentLength,
            Math.max(this._shaftWidth, 0.001)
        );
        this._matrix.compose(center, this._q, this._shape);
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
