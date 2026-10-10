import {Renderable2D, Renderable3D} from '../renderer.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { Vec2 } from '../../model/math/objects.js';
import { Colour } from '../colormappers.js';
import { Body, RadialSymmetricBody } from '../../model/phys/bodies.js'
import {
    Float32BufferAttribute, DoubleSide, MeshBasicMaterial, BufferGeometry, Mesh, Color,
    CircleGeometry, RingGeometry
} from 'three';

export class Arrow2D extends Renderable3D {
    static HeadStyle = Object.freeze({
        Open: 'open',
        Filled: 'filled'
    });

    /**
     * @typedef {object} Arrow2DOptions
     * @property {Colour} [color]
     * @property {number} [size]
     * @property {number} [lineWidth]
     * @property {number} [headWidth]
     * @property {number} [headLength]
     * @property {string} [headStyle]
     */
    /** @param {Arrow2DOptions} [options] */
    constructor({
        color = Colour.Red,
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
            color: color.asThreeJsColor(),
            linewidth: lineWidth,
            resolution: new Vec2(window.innerWidth, window.innerHeight)
        });
        this._headMaterial = new MeshBasicMaterial({
            color: color.asThreeJsColor(),
            side: DoubleSide
        });

        this._headStyle = headStyle;
        this._headGeometry = new BufferGeometry();
        this._headGeometry.setAttribute('position', new Float32BufferAttribute(9, 3));
        this._head = new Mesh(this._headGeometry, this._headMaterial);


        this._shaft = this.#line();
        this._headLeft = this.#line();
        this._headRight = this.#line();
        this.add(this._shaft, this._headLeft, this._headRight, this._head);
    }

    #line() {
        return new LineSegments2(new LineSegmentsGeometry(), this._material);
    }

    canBindTo(/** @type {{position: Vec2, axis: Vec2}} */ model) {
        if (!model.position || !model.axis)
            throw new Error('Arrow2D can only bind to models with a position and an axis.');

        return true;
    }

    synchronizeWith(/** @type {{position: Vec2, axis: Vec2}} */ model) {
        this.setVector(model.position, model.axis);
    }

    setVector(/** @type {Vec2} */ position, /** @type {Vec2} */ vector) {
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

    set color(/** @type {Color} */ color) {
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

export class Circle extends Renderable2D {
    /**
     * @param {object} [param0]
     * @param {number} [param0.radiusOffset] additional increment in radius size
     * @param {Colour} [param0.fillColor]
     * @param {Colour} [param0.borderColor]
     * @param {number} [param0.borderWidth]
     * @param {number} [param0.segments]
     */
    constructor({
        radiusOffset = 0,
        fillColor = new Colour(0x131313),
        borderColor = Colour.Black,
        borderWidth = 0.05,
        segments = 64
    } = {}) {
        super();
        this._radiusOffset = radiusOffset;
        this._radius = -1;

        this._fillMaterial = new MeshBasicMaterial({ side: DoubleSide });
        this._outlineMaterial = new MeshBasicMaterial({ side: DoubleSide });
        fillColor.asThreeJsColor(this._fillMaterial.color);
        borderColor.asThreeJsColor(this._outlineMaterial.color);

        this._fillMesh = new Mesh(new CircleGeometry(1, segments), this._fillMaterial);
        this._outlineMesh = new Mesh(
            new RingGeometry(1, 1 + borderWidth, segments),
            this._outlineMaterial
        );
        this.add(this._fillMesh, this._outlineMesh);
    }

    set fillColor(/** @type {Colour} */ colour) { colour.asThreeJsColor(this._fillMaterial.color); }
    set radiusOffset(/** @type {number} */ value) { this._radiusOffset = value; }

    canBindTo(/** @type {RadialSymmetricBody} */ model) {
        if (model.radius === undefined || model.position === undefined)
            throw new Error('Circle can only bind to models that have both a position and radius property');
        return true;
    }

    synchronizeWith(/** @type {RadialSymmetricBody} */ obstacle) {
        const radius = obstacle.radius + this._radiusOffset;
        this._fillMesh.scale.setScalar(radius);
        this._outlineMesh.scale.setScalar(radius);
        this.position.set(obstacle.position.x, obstacle.position.y, 0.01);
    }
}
