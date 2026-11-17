import { ModelObject, Button, Simulation, Vec3, Renderable3D } from '../../../src/index.js';
import {
    BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute,
    Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, SphereGeometry,
    Vector3
} from 'three';

const radians = degrees => degrees * Math.PI / 180;

/** Holds the generated geometry data for both tree variations. */
class FractalTree extends ModelObject {
    constructor() {
        super();
        this.mode = 'nature';
        this.branches = [];
        this.lines = [];
        this.rebuild();
    }

    rebuild() {
        this.branches.length = 0;
        this.lines.length = 0;

        if (this.mode === 'nature')
            this._growNature(125, new Vector3(0, -125, 0), new Vector3(0, 1, 0));
        else
            this._growPythagoras(256, 360, -90, 12);
    }

    _growNature(length, position, direction) {
        if (length <= 5)
            return;

        if (length < 20) {
            this.branches.push({
                type: 'bud',
                start: position.clone(),
                direction: direction.clone().multiplyScalar(length),
                radius: 1.5 * length
            });
        } else {
            this.branches.push({
                type: 'branch',
                start: position.clone(),
                direction: direction.clone().multiplyScalar(length),
                radius: 0.1 * length
            });
        }

        const end = position.clone().addScaledVector(direction, length);
        const theta = radians(30);
        const left = direction.clone().applyAxisAngle(new Vector3(0, 0, 1), theta);
        const right = direction.clone().applyAxisAngle(new Vector3(0, 0, 1), -theta);

        this._growNature(length - 14.5, end, left);
        this._growNature(length - 14.5, end, right);
    }

    _growPythagoras(x, y, angle, depth) {
        if (depth <= 0)
            return;

        const nextX = x + Math.trunc(Math.cos(radians(angle)) * depth * 8);
        const nextY = y + Math.trunc(Math.sin(radians(angle)) * depth * 8);

        this.lines.push({
            start: new Vector3(x - 256, 410 - y, 0),
            end: new Vector3(nextX - 256, 410 - nextY, 0),
            hue: depth / 12
        });

        this._growPythagoras(nextX, nextY, angle - 17, depth - 1);
        this._growPythagoras(nextX, nextY, angle + 17, depth - 1);
    }
}

/** Builds the tree as a small number of Three.js objects. */
class FractalTreeView extends Renderable3D {
    constructor() {
        super();

        this._branchGeometry = new CylinderGeometry(1, 1, 1, 8);
        this._budGeometry = new SphereGeometry(1, 10, 8);
        this._branchMaterial = new MeshBasicMaterial({ color: 0x79502d });
        this._budMaterial = new MeshBasicMaterial({ color: 0x08752b });
        this._lineMaterial = new LineBasicMaterial({ vertexColors: true });
        this._group = null;
    }

    canBindTo(tree) {
        return tree.branches !== undefined && tree.lines !== undefined;
    }

    synchronizeWith(tree) {
        if (this._group) {
            this.remove(this._group);
            this._group.traverse(object => {
                if (object.geometry && object.geometry !== this._branchGeometry && object.geometry !== this._budGeometry)
                    object.geometry.dispose();
            });
        }

        this._group = new Group();

        if (tree.mode === 'nature')
            this._drawNature(tree);
        else
            this._drawPythagoras(tree);

        this.add(this._group);
    }

    _drawNature(tree) {
        // The elongated trunk in the original VPython example.
        this._addCylinder(
            new Vector3(0, -300, 0),
            new Vector3(0, 175, 0),
            12.5
        );

        tree.branches.forEach(branch => {
            if (branch.type === 'branch')
                this._addCylinder(branch.start, branch.direction, branch.radius);
            else {
                const bud = new Mesh(this._budGeometry, this._budMaterial);
                bud.position.copy(branch.start);
                bud.scale.setScalar(branch.radius);
                this._group.add(bud);
            }
        });
    }

    _addCylinder(start, direction, radius) {
        const mesh = new Mesh(this._branchGeometry, this._branchMaterial);
        const length = direction.length();
        mesh.position.copy(start).addScaledVector(direction, 0.5);
        mesh.quaternion.setFromUnitVectors(
            new Vector3(0, 1, 0),
            direction.clone().normalize()
        );
        mesh.scale.set(radius, length, radius);
        this._group.add(mesh);
    }

    _drawPythagoras(tree) {
        const positions = [];
        const colors = [];

        tree.lines.forEach(line => {
            positions.push(
                line.start.x, line.start.y, line.start.z,
                line.end.x, line.end.y, line.end.z
            );
            const color = new Color().setHSL(line.hue, 1, 0.5);
            colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        });

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        this._group.add(new LineSegments(geometry, this._lineMaterial));
    }

    dispose() {
        this._branchGeometry.dispose();
        this._budGeometry.dispose();
        this._branchMaterial.dispose();
        this._budMaterial.dispose();
        this._lineMaterial.dispose();
    }
}

const tree = new FractalTree();
const treeView = new FractalTreeView();

function showTree(mode) {
    tree.mode = mode;
    tree.rebuild();
    treeView.synchronizeWith(tree);
}

Simulation
    .with({
        htmlDivId: 'fractalTreeContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: {
            controls: false,
            orthographic: true,
            position: new Vec3(0, 50, 900),
            target: new Vec3(0, 50, 0)
        },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌳 Fractal tree</strong><br/>' +
                'Explore two recursive trees: a nature-like branching tree and a Pythagoras-style line tree.'
        }
    })
    .bind(tree.onceWith(treeView))
    .append(new Button('Nature tree').withText('Nature tree 🌳').onClick(() => showTree('nature')))
    .append(new Button('Pythagoras tree').withText('Pythagoras tree').onClick(() => showTree('pythagoras')));

tree.rebuild();
