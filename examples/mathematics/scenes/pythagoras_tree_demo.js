import { Bindable, Polygon, Simulation, Square, Triangle, Vec2, Renderable2D } from '../../../src/index.js';
import {
    BufferGeometry, Color, DoubleSide, Float32BufferAttribute,
    LineBasicMaterial, LineSegments as ThreeLineSegments, Mesh, MeshBasicMaterial
} from 'three';

/** Model for a Pythagoras tree, independent of the renderer. */
class PythagorasTree extends Bindable {
    constructor() {
        super();
        this.iterations = 12;
        this.angle = 40;
        this.showTriangles = true;
        /** @type {{ kind: string, depth: number, polygon: Polygon }[]} */
        this.shapes = [];
        this.rebuild();
    }

    rebuild() {
        this.shapes.length = 0;
        const alpha = this.angle * Math.PI / 180;
        const cosAlpha = Math.cos(alpha);
        const sinAlpha = Math.sin(alpha);
        this._grow(new Vec2(-0.5, 0), 0, 1, alpha, cosAlpha, sinAlpha, 0);
    }

    _grow(origin, rotation, side, alpha, cosAlpha, sinAlpha, depth) {
        if (depth >= this.iterations)
            return;

        const u = new Vec2(Math.cos(rotation), Math.sin(rotation)).multiplyScalar(side);
        const v = new Vec2(-Math.sin(rotation), Math.cos(rotation)).multiplyScalar(side);

        const p0 = origin.clone();
        const p1 = origin.clone().add(u);
        const p2 = p1.clone().add(v);
        const p3 = origin.clone().add(v);
        this.shapes.push({ kind: 'square', depth, polygon: new Polygon([p0, p1, p2, p3]) });

        const apex = origin.clone()
            .add(u.clone().multiplyScalar(cosAlpha * cosAlpha))
            .add(v.clone().multiplyScalar(1 + sinAlpha * cosAlpha));

        if (this.showTriangles && depth < this.iterations - 1)
            this.shapes.push({ kind: 'triangle', depth, polygon: new Polygon([p2, p3, apex]) });

        this._grow(p3, rotation + alpha, side * cosAlpha, alpha, cosAlpha, sinAlpha, depth + 1);
        this._grow(apex, rotation + alpha - Math.PI / 2, side * sinAlpha, alpha, cosAlpha, sinAlpha, depth + 1);
    }
}

/**
 * Batch all filled polygons into one mesh and all outlines into one line object.
 * This keeps high recursion depths practical while using the same polygon
 * triangulation exposed by the reusable Square and Triangle primitives.
 */
class PythagorasTreeView extends Renderable2D {
    constructor() {
        super();
        this.hue = 120;
        this._fillGeometry = new BufferGeometry();
        this._lineGeometry = new BufferGeometry();
        this._fillMaterial = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
        this._lineMaterial = new LineBasicMaterial({ color: 0xeeeeee });
        this._fillMesh = new Mesh(this._fillGeometry, this._fillMaterial);
        this._lines = new ThreeLineSegments(this._lineGeometry, this._lineMaterial);
        this.add(this._fillMesh, this._lines);
    }

    canBindTo(model) {
        if (!Array.isArray(model.shapes))
            throw new Error('PythagorasTreeView needs a PythagorasTree model.');
        return true;
    }

    synchronizeWith(tree) {
        const positions = [];
        const colors = [];
        const linePositions = [];
        const color = new Color();

        for (const shape of tree.shapes) {
            const depthColor = color.setHSL(
                this.hue / 360,
                Math.min(1, shape.depth / Math.max(1, tree.iterations)),
                0.45
            );
            const polygon = shape.kind === 'square' ? Square : Triangle;
            const before = positions.length / 3;
            polygon.appendTriangles(positions, shape.polygon);
            for (let i = before; i < positions.length / 3; i++)
                colors.push(depthColor.r, depthColor.g, depthColor.b);

            for (let i = 0; i < shape.polygon.vertexCount; i++) {
                const from = shape.polygon.vertexAt(i);
                const to = shape.polygon.vertexAt((i + 1) % shape.polygon.vertexCount);
                linePositions.push(from.x, from.y, 0.02, to.x, to.y, 0.02);
            }
        }

        this._fillGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        this._fillGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        this._fillGeometry.computeBoundingBox();
        this._fillGeometry.computeBoundingSphere();
        this._lineGeometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
        this._lineGeometry.computeBoundingSphere();
    }

    dispose() {
        this._fillGeometry.dispose();
        this._lineGeometry.dispose();
        this._fillMaterial.dispose();
        this._lineMaterial.dispose();
        this.clear();
    }
}

const tree = new PythagorasTree();
const treeView = new PythagorasTreeView();
Simulation
    .with({
        htmlDivId: 'pythagorasTreeDemo',
        viewport: { aspectRatio: '4 / 3', parameterMenu: false },
        camera: {
            orthographic: true,
            controls: false
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌳 Pythagoras tree</strong><br/>' +
                '🎯 Each square produces two smaller squares on the sides of a right triangle.<br/>' +
                '🧠 Idea based on <a href=\"https://library.fridoverweij.com/codelab/pytagoras_tree/index.html\">library.fridoverweij.com</a><br/>'
        }
    })
    .bind(tree.alwaysWith(treeView))
    .frameSceneOn(treeView, { padding: .8 });

tree.rebuild();
