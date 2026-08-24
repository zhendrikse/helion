import { Renderable3D } from "../renderer.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { Vec2 } from "../../model/math/math.js";
import { Float32BufferAttribute, DoubleSide, MeshBasicMaterial, BufferGeometry, Mesh } from "three";

export class Arrow2D extends Renderable3D {
    static HeadStyle = Object.freeze({
        Open: "open",
        Filled: "filled"
    });

    constructor({
        color = 0xff0000,
        size = 0.1,
        headLength = size,
        headWidth = size * 0.6,
        lineWidth = 2,
        headStyle = Arrow2D.HeadStyle.Open
    } = {}) {
        super();

        this._size = size;
        this._headLength = headLength;
        this._headWidth = headWidth;

        this._material = new LineMaterial({
            color,
            linewidth: lineWidth,
            resolution: new Vec2(window.innerWidth, window.innerHeight)
        });
        this._headMaterial = new MeshBasicMaterial({color, side: DoubleSide});

        this._headStyle = headStyle;
        this._headGeometry = new BufferGeometry();
        this._headGeometry.setAttribute("position", new Float32BufferAttribute(9, 3));
        this._head = new Mesh(this._headGeometry, this._headMaterial);


        this._shaft = this.#line();
        this._headLeft = this.#line();
        this._headRight = this.#line();
        this.add(this._shaft, this._headLeft, this._headRight, this._head);
    }

    #line() {
        const geometry = new LineSegmentsGeometry();
        return new LineSegments2(geometry, this._material);
    }

    canBindTo(model) {
        if (!model.position || !model.axis)
            throw new Error("Arrow2D can only bind to models with a position and an axis.");

        return true;
    }

    synchronizeWith(model) {
        this.setVector(model.position, model.axis);
    }

    setVector(position, vector) {
        const x = vector.x;
        const y = vector.y;
        const magnitude = Math.hypot(x, y);

        if (magnitude < 1e-12) {
            this._shaft.visible = false;
            this._headLeft.visible = false;
            this._headRight.visible = false;
            this._head.visible = false;
            return;
        }

        this._shaft.visible = true;
        this._headLeft.visible = true;
        this._headRight.visible = true;

        const ux = x / magnitude;
        const uy = y / magnitude;

        // Perpendicular
        const px = -uy;
        const py = ux;

        const headLength = Math.min(this._headLength, magnitude * 0.4);
        const tipX = position.x + x;
        const tipY = position.y + y;
        const baseX = tipX - ux * headLength;
        const baseY = tipY - uy * headLength;

        const halfWidth = this._headWidth / 2;
        const leftX = baseX + px * halfWidth;
        const leftY = baseY + py * halfWidth;
        const rightX = baseX - px * halfWidth;
        const rightY = baseY - py * halfWidth;

        this._head.visible = this._headStyle === Arrow2D.HeadStyle.Filled;
        if (this._head.visible) {
            const positions = this._headGeometry.attributes.position.array;
            positions[0] = tipX;
            positions[1] = tipY;
            positions[2] = 0;

            positions[3] = leftX;
            positions[4] = leftY;
            positions[5] = 0;

            positions[6] = rightX;
            positions[7] = rightY;
            positions[8] = 0;
            this._headGeometry.attributes.position.needsUpdate = true;
        }

        this.#setLine(this._shaft, position.x, position.y, tipX, tipY);
        this.#setLine(this._headLeft, tipX, tipY, leftX, leftY);
        this.#setLine(this._headRight, tipX, tipY, rightX, rightY);
    }

    #setLine(line, x1, y1, x2, y2) {
        line.geometry.setPositions([
            x1, y1, 0,
            x2, y2, 0
        ]);

        line.geometry.computeBoundingSphere();
    }

    set color(color) {
        this._material.color.set(color);
        this._headMaterial.color.set(color);
    }

    dispose() {
        this._shaft.geometry.dispose();
        this._headLeft.geometry.dispose();
        this._headRight.geometry.dispose();
        this._material.dispose();
        this._headMaterial.dispose();

        this.clear();
    }
}
