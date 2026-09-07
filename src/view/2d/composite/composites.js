import { Color } from "three";
import { Vec2, Vec3 } from "../../../model/math/math.js";
import { Arrow2D } from "../primitives.js"
import { Renderable3D } from "../../renderer.js";
import { VectorField } from "../../../model/math/fields.js";
import { Range } from "../../../model/math/math.js"

export class ArrowField2D extends Renderable3D {
    /**
     * @typedef {Object} ArrowFieldOptions2D
     * @property {Range} [xRange]
     * @property {Range} [yRange]
     * @property {number} [scaleFactor]
     * @property {(value: number) => number} [magnitudeMap]
     * @property { (dir: Vec3, mag: number) => Color} [colorMap]
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
        if (xRange === null || yRange === null) 
            throw new Error("Cannot instantiate ArrowField without x- and y-ranges");
        this._scaleFactor = scaleFactor;
        this._magnitudeMap = magnitudeMap;
        this._colorMap = colorMap;

        this._arrows = [];
        this._positions = [];

        for (const x of xRange)
            for (const y of yRange) {
                const position = new Vec2(x, y);
                const arrow = new Arrow2D({
                    size,
                    headLength,
                    headWidth,
                    lineWidth,
                    headStyle
                });

                this._positions.push(position);
                this._arrows.push(arrow);
                this.add(arrow);
            }

        this._target = new Vec2();
        this._scaledTarget = new Vec2();
    }

    /** @param {VectorField} vectorField */
    canBindTo(vectorField) {
        if (typeof vectorField?.sample !== "function")
            throw new Error("ArrowField2D can only bind to a VectorField with sample().");

        return true;
    }

    /** @param {VectorField} vectorField */
    synchronizeWith(vectorField) {
        for (let i = 0; i < this._arrows.length; i++) {
            const position = this._positions[i];
            const arrow = this._arrows[i];

            vectorField.sample(position, this._target);
            const magnitude = Math.hypot(this._target.x, this._target.y);

            if (magnitude < 1e-12) {
                arrow.visible = false;
                continue;
            }

            arrow.visible = true;
            const visualMagnitude = this._magnitudeMap(magnitude) * this._scaleFactor;
            this._scaledTarget
                .copy(this._target)
                .normalize()
                .multiplyScalar(visualMagnitude);

            arrow.setVector(position, this._scaledTarget);
            arrow.color = this._colorMap(this._target.clone().normalize(), magnitude);
        }
    }

    dispose() {
        for (const arrow of this._arrows)
            arrow.dispose();

        this._arrows.length = 0;
        this._positions.length = 0;
        this.clear();
    }
}
