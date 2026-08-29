import {
    Color, MeshBasicMaterial, InstancedMesh, MeshStandardMaterial, CylinderGeometry,
    BoxGeometry, Object3D, Vector2
} from "three";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { Renderable3D } from "../../renderer.js";
import { Vec3 } from "../../../model/math/math.js";
import { LineSegment, Segments } from "../../../model/math/objects.js";
import { ColorMappers } from "../../colormappers.js";

class InstancedSegmentsView extends Renderable3D {
    constructor({
        material,
        colorMapper = (segment, index, targetColor) => targetColor.setRGB(1, 1, 1),
        opacity = 1,
    } = {}) {
        super();

        this._mesh = null;
        this._material = material;
        this._material.opacity = opacity;
        this._colorMapper = colorMapper;

        this._dummy = new Object3D();
        this._instanceColor = new Color();
        this._instanceIndex = 0;
    }

    canBindTo(segments) {
        if (!(segments instanceof Segments))
            throw new Error("An instanced segments view can only be bound to a Segments collection.");
        return true;
    }

    initialize(segments) {
        this._mesh = new InstancedMesh(this.createGeometry(), this._material, segments.count);
        this.add(this._mesh);
    }

    createGeometry() {
        throw new Error("createGeometry() must be implemented");
    }

    updateTransform(segment) {
        throw new Error("updateTransform() must be implemented");
    }

    synchronizeWith(segments) {
        this._instanceIndex = 0;

        for (const segment of segments) {
            this.updateTransform(segment);
            this._dummy.updateMatrix();
            this._mesh.setMatrixAt(this._instanceIndex, this._dummy.matrix);
            this._colorMapper(segment, this._instanceIndex, this._instanceColor);
            this._mesh.setColorAt(this._instanceIndex, this._instanceColor);
            this._instanceIndex++;
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }
}

export class CylinderSegmentsView extends InstancedSegmentsView {
    constructor({
        material = new MeshStandardMaterial({ transparent: true }),
        colorMapper = (segment, index, targetColor) => targetColor.setRGB(1, .5, 0),
        opacity = 1,
    } = {}) {
        super({ material, colorMapper, opacity });

        this._direction = new Vec3();
    }

    createGeometry() {
        return new CylinderGeometry(1, 1, 1, 16);
    }

    updateTransform(segment) {
        this._dummy.position.copy(segment.position);
        this._direction.copy(segment.axis);
        const length = this._direction.length();
        this._dummy.scale.set(segment.radius, length, segment.radius);
        this._dummy.quaternion.setFromUnitVectors(new Vec3(0, 1, 0), this._direction.normalize());
    }
}

export class BoxSegmentsView extends InstancedSegmentsView {
    constructor({
        material = new MeshBasicMaterial({ transparent: true }),
        colorMapper = (segment, index, targetColor) => targetColor.setRGB(1, 1, 1),
        visibilityMapper = (segment, index) => true,
        opacity = 1,
    } = {}) {
        super({ material, colorMapper, opacity });

        this._visibilityMapper = visibilityMapper;
    }

    createGeometry() {
        return new BoxGeometry(1, 1, 1);
    }

    updateTransform(segment) {
        this._dummy.position.copy(segment.position);
        if (this._visibilityMapper(segment, this._instanceIndex))
            this._dummy.scale.copy(segment.size);
        else
            this._dummy.scale.set(0, 0, 0);
        this._dummy.quaternion.identity();
    }
}

export class LineSegmentView extends Renderable3D {
    constructor({
        lineWidth = 1,
        dashed = false,
        dashSize = 1,
        gapSize = 1,
        visible = true,
        colorMapper = ColorMappers.get(ColorMappers.Uniform, {color: 0xffffff})
    } = {}) {
        super();

        this._geometry = new LineSegmentsGeometry();
        this._material = new LineMaterial({
            linewidth: lineWidth,
            vertexColors: true,
            dashed,
            dashSize,
            gapSize,
            resolution: new Vector2(window.innerWidth, window.innerHeight)
        });
        this._3d = true;
        this._colorMapper = colorMapper;
        this._color = new Color();
        this._line = new LineSegments2(this._geometry, this._material);
        this.add(this._line);
        this.visible = visible;
    }

    initialize(segment) {
        this._3d = segment.from.z !== undefined && segment.to.z !== undefined;
    }

    canBindTo(model) {
        if (!(model instanceof LineSegment))
            throw new Error("This view can only be bound to a LineSegment");
        return true;
    }

    synchronizeWith(segment) {
        this._geometry.setPositions([
            segment.from.x, segment.from.y, this._3d ? segment.from.z : 0,
            segment.to.x, segment.to.y, this._3d ? segment.to.z : 0
        ]);

        this._colorMapper.map(segment.scalar, this._color);
        this._geometry.setColors([
            this._color.r, this._color.g, this._color.b,
            this._color.r, this._color.g, this._color.b
        ]);

        this._geometry.computeBoundingSphere();
        if (this._material.dashed)
            this._line.computeLineDistances();
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();

        this.remove(this._line);
        this._line = null;

        this.clear();
    }
}

export class LineSegmentsView extends LineSegmentView {
    constructor({
        lineWidth = 1,
        dashed = false,
        dashSize = 1,
        gapSize = 1,
        visible = true,
        colorMapper = ColorMappers.get(ColorMappers.Uniform, {color: new Color(0xffff00)})
    } = {}) {
        super({lineWidth, dashed, dashSize, gapSize, visible, colorMapper});
    }

    initialize(segments) {
        this._3d = true;

        for (const segment of segments)
            if (segment.from.z === undefined || segment.to.z === undefined) {
                this._3d = false;
                break;
            }
    }


    canBindTo(segments) {
        if (!(segments instanceof Segments))
            throw new Error("An instanced segments view can only be bound to a Segments collection.");
        return true;
    }

    synchronizeWith(segments) {
        const positions = [];
        const colors = [];

        for (const segment of segments) {
            positions.push(
                segment.from.x, segment.from.y, this._3d ? segment.from.z : 0,
                segment.to.x, segment.to.y, this._3d ? segment.to.z : 0
            );

            this._colorMapper.map(segment.scalar, this._color);
            colors.push(
                this._color.r, this._color.g, this._color.b,
                this._color.r, this._color.g, this._color.b
            );
        }

        this._geometry.setPositions(positions);
        this._geometry.setColors(colors);

        if (this._material.dashed)
            this._line.computeLineDistances();
    }
}
