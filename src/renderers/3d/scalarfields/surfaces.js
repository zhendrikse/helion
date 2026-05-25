import {
    Group, Vector3, LineBasicMaterial, Line, BufferGeometry, DoubleSide, PlaneGeometry, Color,
    Object3D, Mesh, SphereGeometry, MeshStandardMaterial, InstancedMesh, InstancedBufferAttribute,
    DynamicDrawUsage, BufferAttribute
} from "three";
import {SurfaceColorMapper} from "./colormappers.js";

export class SurfaceView extends Group {
    constructor({
        uSegments = 100,
        vSegments = 100,
        colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.GRADIENT),
        normalizer = (position) => position.y
    } = {}) {
        super();
        this._uSegments = uSegments;
        this._vSegments = vSegments;
        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._surface = null;
    }

    attachTo(mathSurfaceDefinition) {
        // Sanity checks
        if (!mathSurfaceDefinition.sample)
            throw new Error("Surface does not implement sample(), hence it cannot be attached to this view.");

        this._surface = mathSurfaceDefinition;
    }
}

export class IsoparametricContoursView extends SurfaceView {
    constructor({
        uSegments = 20,
        vSegments = 20,
        segments = 100,
        colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.GRADIENT),
        normalizer = (position) => position.y
    } = {}) {
        super({uSegments, vSegments, colorMapper, normalizer});
        this._segments = segments;
        this._material = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: true,
            depthTest: true
        });
        this._uLines = [];
        this._vLines = [];

        this._target = new Vector3();
        this._color = new Color();
    }
    attachTo(surface) {
        super.attachTo(surface);
        this.#build();
    }

    #createLine() {
        const geometry = new BufferGeometry();

        const positions = new Float32Array((this._segments + 1) * 3);
        geometry.setAttribute("position", new BufferAttribute(positions, 3));

        const colors = new Float32Array((this._segments + 1) * 3);
        geometry.setAttribute("color", new BufferAttribute(colors, 3));

        return new Line(geometry, this._material);
    }

    #build() {
        // u = constant
        for (let i = 0; i <= this._uSegments; i++) {
            const line = this.#createLine();
            this.add(line);
            this._uLines.push({ line: line, u: i / this._uSegments });
        }

        // v = constant
        for (let i = 0; i <= this._vSegments; i++) {
            const line = this.#createLine();
            this.add(line);
            this._vLines.push({ line: line, v: i / this._vSegments });
        }
    }

    #updateLine(entry, sampleFn) {
        const geometry = entry.line.geometry;
        const positions = geometry.attributes.position.array;

        const colors = geometry.attributes.color.array;
        for (let j = 0; j <= this._segments; j++) {
            sampleFn(j / this._segments);
            const k = 3 * j;

            // position
            positions[k] = this._target.x;
            positions[k + 1] = this._target.y;
            positions[k + 2] = this._target.z;

            // color
            const t = this._normalizer(this._target);
            this._colorMapper.map(t, this._color);
            colors[k] = this._color.r;
            colors[k + 1] = this._color.g;
            colors[k + 2] = this._color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();
    }

    render() {
        for (const entry of this._uLines)
            this.#updateLine(entry, (v) => this._surface.sample(entry.u, v, this._target));

        for (const entry of this._vLines)
            this.#updateLine(entry, (u) => this._surface.sample(u, entry.v, this._target));
    }
}

export class SphereSurfaceView extends SurfaceView {
    constructor({
        uSegments = 40,
        vSegments = 40,
        radius = 0.08,
        opacity = 1.0,
        colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.GRADIENT),
        normalizer = (position) => position.y
    } = {}) {
        super({uSegments, vSegments, colorMapper, normalizer});
        this._target = new Vector3();
        this._dummy = new Object3D();
        this._color = new Color();

        const geometry = new SphereGeometry(radius, 8, 8);
        const material = new MeshStandardMaterial({
            side: DoubleSide,
            roughness: 0.25,
            metalness: 0.0,
            transparent: true,
            opacity: opacity
        });
        const count = (uSegments + 1) * (vSegments + 1);
        this._mesh = new InstancedMesh(geometry, material, count);
        this.add(this._mesh);

        this._colorArray = new Float32Array(count * 3);
        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);
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
                this._mesh.setMatrixAt(index, this._dummy.matrix);

                const t = this._normalizer(this._target);
                this._colorMapper.map(t, this._color);
                const k = 3 * index;
                this._colorArray[k] = this._color.r;
                this._colorArray[k + 1] = this._color.g;
                this._colorArray[k + 2] = this._color.b;

                index++;
            }
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }
}

export class PlaneSurfaceView extends SurfaceView {
    constructor({
        uSegments = 100,
        vSegments = 100,
        wireframe = false,
        colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.GRADIENT),
        normalizer = (position) => position.y
    } = {}) {
        super({uSegments, vSegments, colorMapper, normalizer});
        const geometry = new PlaneGeometry(1, 1, uSegments, vSegments);
        const material = new MeshStandardMaterial({
            side: DoubleSide,
            wireframe,
            vertexColors: true
        });

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
        this._positions = geometry.attributes.position.array;
        this._colors = new Float32Array((uSegments + 1) * (vSegments + 1) * 3);
        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
        this._target = new Vector3();
        this._color = new Color();
    }

    render() {
        let k = 0;
        let c = 0;

        for (let i = 0; i <= this._uSegments; i++) {
            const u = i / this._uSegments;
            for (let j = 0; j <= this._vSegments; j++) {
                const v = j / this._vSegments;
                this._surface.sample(u, v, this._target);
                this._positions[k++] = this._target.x;
                this._positions[k++] = this._target.y;
                this._positions[k++] = this._target.z;

                const t = this._normalizer(this._target);
                this._colorMapper.map(t, this._color);
                this._colors[c++] = this._color.r;
                this._colors[c++] = this._color.g;
                this._colors[c++] = this._color.b;
            }
        }

        const geometry = this._mesh.geometry;
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeVertexNormals();
    }
}