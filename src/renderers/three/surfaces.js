import { Group, Vector3, LineBasicMaterial, Line, BufferGeometry, DoubleSide, PlaneGeometry,
    Object3D, Mesh, SphereGeometry, MeshStandardMaterial, InstancedMesh } from "three";

export class SurfaceCView extends Group {
    constructor() {
        super();
        this._surface = null;
    }

    attachTo(mathSurfaceDefinition) {
        // Sanity checks
        if (!mathSurfaceDefinition.sample)
            throw new Error("Surface does not implement sample(), hence it cannot be attached to this view.");

        this._surface = mathSurfaceDefinition;
    }
}

export class IsoparametricContoursSurface extends SurfaceCView {
    constructor({
        uCount = 20,
        vCount = 20,
        segments = 100,
        color = 0xffffff
    } = {}) {
        super();
        this._uCount = uCount;
        this._vCount = vCount;
        this._segments = segments;
        this._material = new LineBasicMaterial({
            color,
            transparent: true,
            depthWrite: true,
            depthTest: true
        });

        this._uLines = [];
        this._vLines = [];
    }

    attachTo(mathSurfaceDefinition) {
        super.attachTo(mathSurfaceDefinition);
        this.#build();
    }

    #build() {
        // u = constant
        for (let i = 0; i <= this._uCount; i++) {
            const geometry = new BufferGeometry();
            const line = new Line(geometry, this._material);
            this.add(line);
            this._uLines.push({ line, u: i / this._uCount });
        }

        // v = constant
        for (let i = 0; i <= this._vCount; i++) {
            const geometry = new BufferGeometry();
            const line = new Line(geometry, this._material);
            this.add(line);
            this._vLines.push({ line, v: i / this._vCount });
        }
    }

    render(transform) {
        const target = new Vector3();

        // u lines
        for (const entry of this._uLines) {
            const points = [];
            for (let j = 0; j <= this._segments; j++) {
                const v = j / this._segments;
                this._surface.sample(entry.u, v, target);
                points.push(target.clone());
            }

            entry.line.geometry.dispose();
            entry.line.geometry = new BufferGeometry().setFromPoints(points);
        }

        // v lines
        for (const entry of this._vLines) {
            const points = [];
            for (let j = 0; j <= this._segments; j++) {
                const u = j / this._segments;
                this._surface.sample(u, entry.v, target);
                points.push(target.clone());
            }

            entry.line.geometry.dispose();
            entry.line.geometry = new BufferGeometry().setFromPoints(points);
        }
    }
}

export class SphereSurfaceView extends SurfaceCView {
    constructor({
        uSegments = 40,
        vSegments = 40,
        radius = 0.08,
        color = 0x00ffff
    } = {}) {
        super();

        this._uSegments = uSegments;
        this._vSegments = vSegments;
        this._target = new Vector3();
        this._dummy = new Object3D();

        const geometry = new SphereGeometry(radius, 8, 8);
        const material = new MeshStandardMaterial({ color });

        const count = (uSegments + 1) * (vSegments + 1);
        this._mesh = new InstancedMesh(geometry, material, count);
        this.add(this._mesh);
    }

    render(transform) {
        let index = 0;

        for (let i = 0; i <= this._uSegments; i++) {
            const u = i / this._uSegments;
            for (let j = 0; j <= this._vSegments; j++) {
                const v = j / this._vSegments;
                this._surface.sample(u, v, this._target);
                this._dummy.position.copy(this._target);
                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index++, this._dummy.matrix);
            }
        }

        this._mesh.instanceMatrix.needsUpdate = true;
    }
}

export class PlaneSurfaceView extends SurfaceCView {
    constructor({
        uSegments = 100,
        vSegments = 100,
        color = 0x00ffff,
        wireframe = false
    } = {}) {
        super();

        this._uSegments = uSegments;
        this._vSegments = vSegments;

        const geometry = new PlaneGeometry(1, 1, uSegments, vSegments);
        const material = new MeshStandardMaterial({color, side: DoubleSide, wireframe});

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);

        this._positions = geometry.attributes.position.array;
        this._target = new Vector3();
    }

    render() {
        let k = 0;

        for (let i = 0; i <= this._uSegments; i++) {
            const u = i / this._uSegments;
            for (let j = 0; j <= this._vSegments; j++) {
                const v = j / this._vSegments;
                this._surface.sample(u, v, this._target);
                this._positions[k++] = this._target.x;
                this._positions[k++] = this._target.y;
                this._positions[k++] = this._target.z;
            }
        }

        this._mesh.geometry.attributes.position.needsUpdate = true;
        this._mesh.geometry.computeVertexNormals();
    }
}