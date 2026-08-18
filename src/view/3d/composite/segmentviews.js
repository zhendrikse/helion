import {
    Color, MeshBasicMaterial, InstancedMesh, MeshStandardMaterial, CylinderGeometry, BoxGeometry, Object3D, Vector2
} from "three";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {Renderable3D} from "../../renderer.js";
import {Vec3} from "../../../model/math/math.js";
import {LineSegment, Segments} from "../../../model/math/objects.js";

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
        this._mesh = new InstancedMesh(
            this.createGeometry(),
            this._material,
            segments.count
        );

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
        visible = true
    } = {}) {
        super();

        this._geometry = new LineSegmentsGeometry();
        this._material = new LineMaterial({
            linewidth: lineWidth,
            vertexColors: true,
            resolution: new Vector2(window.innerWidth, window.innerHeight)
        });

        this._line = new LineSegments2(this._geometry, this._material);

        this.add(this._line);
        this.visible = visible;
    }

    canBindTo(model) {
        if (!(model instanceof LineSegment))
            throw new Error("This view can only be bound to a LineSegment");
        return true;
    }

    synchronizeWith(segment) {
        this._geometry.setPositions([
            segment.from.x, segment.from.y, segment.from.z,
            segment.to.x, segment.to.y, segment.to.z
        ]);

        this._geometry.setColors([
            segment.color.r, segment.color.g, segment.color.b,
            segment.color.r, segment.color.g, segment.color.b
        ]);
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
        visible = true
    } = {}) {
        super({lineWidth, visible});
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
                segment.from.x, segment.from.y, segment.from.z,
                segment.to.x, segment.to.y, segment.to.z
            );

            const colour = new Color(segment.color);
            colors.push(
                colour.r, colour.g, colour.b,
                colour.r, colour.g, colour.b
            );
        }

        this._geometry.setPositions(positions);
        this._geometry.setColors(colors);
    }
}
