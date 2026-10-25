import {
    ModelObject, Checkbox, Polygon, Range, Simulation, Slider, PolygonView, Vec2, Renderable2D, Vec3, Colour
} from '../../../src/index.js';
import {
    BufferGeometry, Color, DoubleSide, Float32BufferAttribute,
    LineBasicMaterial, LineSegments as ThreeLineSegments, Mesh, MeshBasicMaterial
} from 'three';

const cos = Math.cos;
const sin = Math.sin;

class TreeElement {
    constructor(depth, polygon) {
        this.depth = depth;
        this.polygon = polygon;
    }
}

/** Model for a Pythagoras tree, independent of the renderer. */
class PythagorasTree extends ModelObject {
    constructor() {
        super();
        this.iterations = 12;
        this.angle = 40;
        this.showTriangles = true;
        this.shapes = [];
        this.rebuild();
    }

    rebuild() {
        this.shapes.length = 0;
        this._grow(new Vec2(-.25, -2.75), 0, 1, this.angle * Math.PI / 180, 0);
    }

    _grow(origin, rotation, side, alpha, depth) {
        if (depth >= this.iterations)
            return;

        const u = new Vec2(cos(rotation), sin(rotation)).multiplyScalar(side);
        const v = new Vec2(-sin(rotation), cos(rotation)).multiplyScalar(side);

        const p0 = origin.clone();
        const p1 = origin.clone().add(u);
        const p2 = p1.clone().add(v);
        const p3 = origin.clone().add(v);
        this.shapes.push(new TreeElement(depth, new Polygon([p0, p1, p2, p3])));

        const apex = origin.clone()
            .add(u.clone().multiplyScalar(cos(alpha) * cos(alpha)))
            .add(v.clone().multiplyScalar(1 + sin(alpha) * cos(alpha)));

        if (this.showTriangles && depth < this.iterations - 1)
            this.shapes.push(new TreeElement(depth, new Polygon([p2, p3, apex])));

        this._grow(p3, rotation + alpha, side * cos(alpha), alpha, depth + 1);
        this._grow(apex, rotation + alpha - Math.PI / 2, side * sin(alpha), alpha, depth + 1);
    }
}

/**
 * Batch all filled polygons into one mesh and all outlines into one line object.
 * This keeps high recursion depths practical while using the same polygon
 * triangulation exposed by the reusable Square and Triangle primitives.
 */
class PythagorasTreeView extends Renderable2D {
    constructor(lineColor = new Colour(0xeeeeee)) {
        super();
        this.hue = 120;
        this._fillGeometry = new BufferGeometry();
        this._lineGeometry = new BufferGeometry();
        this._fillMaterial = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
        this._lineMaterial = new LineBasicMaterial();
        lineColor.asThreeJsColor(this._lineMaterial.color);
        this._fillMesh = new Mesh(this._fillGeometry, this._fillMaterial);
        this._lines = new ThreeLineSegments(this._lineGeometry, this._lineMaterial);
        this._positions = [];
        this._colors = [];
        this._linePositions = [];
        this.add(this._fillMesh, this._lines);
    }

    canBindTo(model) {
        if (model.shapes === undefined || model.iterations === undefined)
            throw new Error('PythagorasTreeView needs a PythagorasTree model.');
        return true;
    }

    _depthToColor = (depth, iterations) => new Color().setHSL(
        this.hue / 360,
        Math.min(1, depth / Math.max(1, iterations)),
        0.45
    );

    _draw(polygon, depth, iterations) {
        const color = this._depthToColor(depth, iterations);
        const before = this._positions.length / 3;
        PolygonView.appendTriangles(this._positions, polygon);
        for (let i = before; i < this._positions.length / 3; i++)
            this._colors.push(color.r, color.g, color.b);

        for (let i = 0; i < polygon.vertexCount; i++) {
            const from = polygon.vertexAt(i);
            const to = polygon.vertexAt((i + 1) % polygon.vertexCount);
            this._linePositions.push(from.x, from.y, 0.02, to.x, to.y, 0.02);
        }
    }

    synchronizeWith(tree) {
        this._positions.length = 0;
        this._colors.length = 0;
        this._linePositions.length = 0;

        tree.shapes.forEach(shape => this._draw(shape.polygon, shape.depth, tree.iterations));

        this._fillGeometry.setAttribute('position', new Float32BufferAttribute(this._positions, 3));
        this._fillGeometry.setAttribute('color', new Float32BufferAttribute(this._colors, 3));
        this._lineGeometry.setAttribute('position', new Float32BufferAttribute(this._linePositions, 3));
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
        htmlDivId: 'pythagorasTreeContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: { controls: false, orthographic: true, position: new Vec3(0, 0, 5.25) },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌳 Pythagoras tree</strong><br/>' +
                '🎯 Each square produces two smaller squares on the sides of a right triangle.<br/>' +
                '🧠 Idea based on <a href=\"https://library.fridoverweij.com/codelab/pytagoras_tree/index.html\">library.fridoverweij.com</a><br/>'
        }
    })
    .bind(tree.alwaysWith(treeView));

tree.rebuild();
