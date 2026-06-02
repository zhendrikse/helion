/**
 * Surface drawing:
 *     SurfaceView -> Surface.sample() -> ScalarField.scalarValueAt()
 *
 * Coloring:    ↓
 *     ColorMapper -> NormalizedScalarField -> Normalizer.normalize() -> SurfaceScalarField.scalarValueAt()
 */
import {
    Group, Vector3, LineBasicMaterial, Line, BufferGeometry, DoubleSide, PlaneGeometry, Color,
    Object3D, Mesh, SphereGeometry, MeshStandardMaterial, InstancedMesh, InstancedBufferAttribute,
    DynamicDrawUsage, BufferAttribute, Box3
} from "three";
import { HeightScalarField } from "../../../model/math/surface.js";
import {AdaptiveSymmetricNormalizer, NormalizedScalarField} from "../../../model/math/math.js";

export class SurfaceResolution {
    constructor(uSegments = 50, vSegments = 50) {
        this.u = uSegments;
        this.v = vSegments;
    }
}

export class SurfaceView extends Group {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super();
        this._resolution = resolution;
        this._scalarField = scalarField;    // Scalar field that is defined by this surface (e.g. mean curvature)
        this._normalizer = normalizer;      // Normalizes scalar field values used by the color mapper
        this._colorMapper = colorMapper;

        this._normalizedScalarField = null; // Scalar field used to generate scalar values for the color mapper
        this._surface = null;               // Mathematical surface definition to generate surface with
        this._dirty = true;                 // When surface definition has changed, this flag is raised
    }

    set colorMapper(colorMapper) { this._colorMapper = colorMapper; }
    set scalarField(scalarField) {
        this._scalarField = scalarField;
        this._scalarField.surface = this._surface;
        this._normalizedScalarField = new NormalizedScalarField(this._scalarField, this._normalizer);
        this._normalizedScalarField.reset();
        this._colorMapper = scalarField.recommendedColorMapper;
    }

    attachTo(mathSurfaceDefinition) {
        // Sanity checks
        if (!mathSurfaceDefinition.sample)
            throw new Error("Surface does not implement sample(), hence it cannot be attached to this view.");

        this._surface = mathSurfaceDefinition;
        this._scalarField.surface = mathSurfaceDefinition; // The scalar field that is defined by this surface
        this._normalizedScalarField = new NormalizedScalarField(this._scalarField, this._normalizer);
        this._normalizedScalarField.reset();
        this._dirty = true;
    }

    get boundingBox() {
        this.updateMatrixWorld(true);
        return new Box3().setFromObject(this);
    }

    initialize() {
        this.render();
    }

    render() {}

    dispose() {
        this.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material)
                if (Array.isArray(obj.material))
                    obj.material.forEach(m => m.dispose?.());
                else
                    obj.material.dispose?.();
        });

        this.removeFromParent?.();
    }
}

export class IsoparametricContoursView extends SurfaceView {
    constructor({
        resolution = new SurfaceResolution(20, 20),
        segments = 100, // per line
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super({resolution, scalarField, colorMapper, normalizer});
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

    get boundingBox() {
        const box = new Box3();

        for (const entry of [...this._uLines, ...this._vLines]) {
            const geometry = entry.line.geometry;
            geometry.computeBoundingBox();
            const bbox = geometry.boundingBox;
            if (bbox)
                box.union(bbox);
        }

        return box;
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
        for (let i = 0; i <= this._resolution.u; i++) {
            const line = this.#createLine();
            this.add(line);
            this._uLines.push({ line: line, u: i / this._resolution.u });
        }

        // v = constant
        for (let i = 0; i <= this._resolution.v; i++) {
            const line = this.#createLine();
            this.add(line);
            this._vLines.push({ line: line, v: i / this._resolution.v });
        }
    }

    #updateLine(entry, sampleFn, colorFn) {
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
            this._colorMapper.map(colorFn(j / this._segments), this._color);
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
            this.#updateLine(entry,
                (v) => this._surface.sample(entry.u, v, this._target),
                (v) => this._normalizedScalarField.scalarValueAt(entry.u, v));

        for (const entry of this._vLines)
            this.#updateLine(entry,
                (u) => this._surface.sample(u, entry.v, this._target),
                (u) => this._normalizedScalarField.scalarValueAt(u, entry.v));


        this._dirty = false;
    }
}

export class SphereSurfaceView extends SurfaceView {
    constructor({
        resolution = new SurfaceResolution(40, 40),
        radius = 0.08,
        opacity = 1.0,
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super({resolution, colorMapper, scalarField, normalizer});
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
        const count = (resolution.u + 1) * (resolution.v + 1);
        this._mesh = new InstancedMesh(geometry, material, count);
        this.add(this._mesh);

        this._colorArray = new Float32Array(count * 3);
        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);
    }

    get boundingBox() {
        const box = new Box3();
        for (let i = 0; i < this._mesh.count; i++) {
            this._mesh.getMatrixAt(i, this._dummy.matrix);
            this._dummy.position.setFromMatrixPosition(this._dummy.matrix);
            box.expandByPoint(this._dummy.position);
        }

        return box;
    }

    render() {
        let index = 0;

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                this._surface.sample(u, v, this._target);
                this._dummy.position.copy(this._target);
                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index, this._dummy.matrix);

                this._colorMapper.map(this._normalizedScalarField.scalarValueAt(u, v), this._color);
                const k = 3 * index;
                this._colorArray[k] = this._color.r;
                this._colorArray[k + 1] = this._color.g;
                this._colorArray[k + 2] = this._color.b;

                index++;
            }
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
        this._dirty = false;
    }
}

export class PlaneSurfaceView extends SurfaceView {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        wireframe = false,
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super({resolution, colorMapper, scalarField, normalizer});
        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        const material = new MeshStandardMaterial({
            side: DoubleSide,
            wireframe,
            vertexColors: true
        });

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);
        this._positions = geometry.attributes.position.array;
        this._colors = new Float32Array((resolution.u + 1) * (resolution.v + 1) * 3);
        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
        this._target = new Vector3();
        this._color = new Color();
    }

    set wireframe(value) { this._mesh.material.wireframe = value; }

    render() {
        let k = 0;
        let c = 0;

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                this._surface.sample(u, v, this._target);
                this._positions[k++] = this._target.x;
                this._positions[k++] = this._target.y;
                this._positions[k++] = this._target.z;

                this._colorMapper.map(this._normalizedScalarField.scalarValueAt(u, v), this._color);
                this._colors[c++] = this._color.r;
                this._colors[c++] = this._color.g;
                this._colors[c++] = this._color.b;
            }
        }

        const geometry = this._mesh.geometry;
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeVertexNormals();
        if (this._dirty) {
            this._mesh.geometry.computeBoundingBox();
        }
        this._dirty = false;
    }
}

export class SurfaceVectorFieldView extends Group {
    constructor({
        resolution = new SurfaceResolution(20, 20),
        vectorField = null
    } = {}) {
        super();

        this._resolution = resolution;
        this._vectorField = vectorField;
        this._surface = null;

        this._arrowField = null;
    }

    attachTo(surface) {
        this._surface = surface;

        if (this._vectorField)
            this._vectorField.surface = surface;

        this._dirty = true;
    }

    render() {
        if (!this._dirty)
            return;

        // later
    }
}