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
    DynamicDrawUsage, BufferAttribute, Box3, BoxGeometry, ConeGeometry, CapsuleGeometry, CylinderGeometry,
    IcosahedronGeometry
} from "three";
import { HeightScalarField, SurfaceScalarFields } from "../../../model/math/fields.js";
import { AdaptiveSymmetricNormalizer } from "../../../model/math/math.js";
import { NormalizedScalarField } from "../../../model/math/fields.js";
import { ColorMappers } from "../../colormappers.js";
import { Checkbox, DropdownMenu} from "../../../controller/controller.js";
import { Registry } from "../../../core/helion.js";

export class SurfaceResolution {
    constructor(uSegments = 50, vSegments = 50) {
        this.u = uSegments;
        this.v = vSegments;
    }
}

class SurfaceView extends Group {
    static UP = new Vector3(0, 1, 0);
    static material = new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true,
    });

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

    get dirty() { return this._dirty; }

    showColormapSelector() {
        new DropdownMenu().for(ColorMappers).addEventListener("change", (event) => {
            this._colorMapper = ColorMappers.get(event.target.value);
            this._dirty = true;
        });
    }

    showScalarFieldSelector() {
        new DropdownMenu().for(SurfaceScalarFields).addEventListener("change", (event) => {
            this._scalarField = SurfaceScalarFields.get(event.target.value);
            this._scalarField.surface = this._surface;
            this._normalizedScalarField = new NormalizedScalarField(this._scalarField, this._normalizer);
            this._normalizedScalarField.reset();
            this._colorMapper = this._scalarField.recommendedColorMapper;
            this._dirty = true;
        });
    }

    set normalizer(normalizer) { this._normalizer = normalizer; }

    bind(mathSurfaceDefinition) {
        // Sanity checks
        if (!mathSurfaceDefinition.sample)
            throw new Error("Surface does not implement sample(u, v, target), so it cannot be attached to this view.");

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

export class InstancedMeshSurfaceView extends SurfaceView {
    static Shape = Object.freeze({
        Box: {
            geometry: new BoxGeometry(.65, .65, .65),
            orientationAxis: new Vector3(0, 1, 0)
        },
        Capsule: {
            geometry: new CapsuleGeometry(.35, 1, 4, 8),
            orientationAxis: new Vector3(0, 1, 0)
        },
        Cylinder: {
            geometry: new CylinderGeometry(.35, .35, 2, 8),
            orientationAxis: new Vector3(0, 1, 0)
        },
        Cone: {
            geometry: new ConeGeometry(.5, 1, 8),
            orientationAxis: new Vector3(0, 1, 0)
        },
        Icosahedron: {
            geometry: new IcosahedronGeometry(.5),
            orientationAxis: new Vector3(0, 1, 0)
        },
        Plane: {
            geometry: new PlaneGeometry(1.25, 1.25),
            orientationAxis: new Vector3(0, 0, 1)
        },
        Sphere: {
            geometry: new SphereGeometry(.5, 6, 6),
            orientationAxis: null
        }
        // Box: "🟥 Box",
        // Capsule: "💊 Capsule",
        // Cone: "▲ Cone",
        // Sphere: "🔴 Sphere",
    });

    static Shapes = new Registry({
        id: "surfaceShapeSelect",
        label: "Element shape ",
        entries: InstancedMeshSurfaceView.Shape
    })

    constructor({
        shape = "Box",
        resolution = new SurfaceResolution(100, 100),
        opacity = 1.0,
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super({resolution, colorMapper, scalarField, normalizer});
        this._positionSample = new Vector3();
        this._scalarSample = new Vector3();
        this._dummy = new Object3D();
        this._color = new Color();
        this._normalVector = new Vector3();

        const count = (resolution.u + 1) * (resolution.v + 1);
        this._mesh = new InstancedMesh(new BoxGeometry(.65, .65, .65), SurfaceView.material, count);
        this._mesh.material.opacity = opacity;
        this.add(this._mesh);

        this._colorArray = new Float32Array(count * 3);
        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);

        this._orientationAxis = new Vector3(0, 0, 1);
        this.shape = shape;
    }

    showShapeSelector() {
        new DropdownMenu().for(InstancedMeshSurfaceView.Shapes).addEventListener("change",
            event => this.shape = event.target.value
        );
    }

    setGeometry(geometry) {
        const oldGeometry = this._mesh.geometry;
        this._mesh.geometry = geometry;

        if (oldGeometry)
            oldGeometry.dispose();

        this._dirty = true;
    }

    set shape(shapeType) {
        const shape = InstancedMeshSurfaceView.Shape[shapeType];
        if (shape.orientationAxis)
            this._orientationAxis.copy(shape.orientationAxis);
        this.setGeometry(shape.geometry);
    }

    render() {
        let index = 0;

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                this._surface.sample(u, v, this._positionSample);
                this._dummy.position.copy(this._positionSample);

                if (this._orientationAxis) {
                    this._surface.normalAt(i, j, this._normalVector);
                    this._dummy.quaternion.setFromUnitVectors(this._orientationAxis, this._normalVector);
                }

                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index, this._dummy.matrix);

                this._normalizedScalarField.sample(u, v, this._scalarSample);
                this._colorMapper.map(this._scalarSample.z, this._color);
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

export class StandardSurfaceView extends SurfaceView {
    constructor({
        material = SurfaceView.material,
        resolution = new SurfaceResolution(100, 100),
        contourResolution = new SurfaceResolution(20, 20),
        contourSegments = 100, // per line
        wireframe = false,
        contours = true,
        surface = true,
        opacity = 1,
        scalarField = new HeightScalarField(),
        colorMapper = scalarField.recommendedColorMapper,
        normalizer = new AdaptiveSymmetricNormalizer()
    } = {}) {
        super({resolution, colorMapper, scalarField, normalizer});

        // Contours
        this._contourSegments = contourSegments;
        this._contourResolution = contourResolution;
        this._contourMaterial = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: true,
            depthTest: true
        });
        this._uLines = [];
        this._vLines = [];

        // Surface
        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        this._mesh = new Mesh(geometry, material);
        this._mesh.material.wireframe = wireframe;
        this._mesh.material.opacity = opacity;
        this._mesh.material.vertexColors = true;
        this._mesh.material.transparent = true;
        this._mesh.material.side = DoubleSide;
        this.add(this._mesh);
        this._positions = geometry.attributes.position.array;
        this._colors = new Float32Array((resolution.u + 1) * (resolution.v + 1) * 3);
        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
        this._positionSample = new Vector3();
        this._scalarSample = new Vector3();
        this._color = new Color();

        this._showContours = contours;
        this._showSurface = surface;
    }

    showSurfaceControls() {
        const contoursCheckbox = new Checkbox()
            .on(this)
            .withLabel("Contours ")
            .checked(this._showContours)
            .withProperty("contoursVisible");

        Checkbox.togetherWith(contoursCheckbox)
            .on(this)
            .withLabel("Wireframe ")
            .withProperty("wireframe");
    }

    set surfaceVisible(value) {
        this._showSurface = value;
        this._mesh.visible = value;
    }

    get surfaceVisible() { return this._showSurface; }
    get contoursVisible() { return this._showContours; }

    set contoursVisible(value) {
        this._showContours = value;

        for (const entry of this._uLines)
            entry.line.visible = value;

        for (const entry of this._vLines)
            entry.line.visible = value;
    }

    set wireframe(value) { this._mesh.material.wireframe = value; }

    get boundingBox() {
        const box = new Box3();

        if (this._mesh.visible) {
            this._mesh.geometry.computeBoundingBox();
            if (this._mesh.geometry.boundingBox)
                box.union(this._mesh.geometry.boundingBox);
        }

        for (const entry of [...this._uLines, ...this._vLines]) {
            const geometry = entry.line.geometry;
            geometry.computeBoundingBox();
            if (geometry.boundingBox)
                box.union(geometry.boundingBox);
        }

        return box;
    }

    #createLine() {
        const geometry = new BufferGeometry();

        const positions = new Float32Array((this._contourSegments + 1) * 3);
        geometry.setAttribute("position", new BufferAttribute(positions, 3));

        const colors = new Float32Array((this._contourSegments + 1) * 3);
        geometry.setAttribute("color", new BufferAttribute(colors, 3));

        return new Line(geometry, this._contourMaterial);
    }

    initialize() {
        super.initialize();

        // u = constant
        for (let i = 0; i <= this._contourResolution.u; i++) {
            const line = this.#createLine();
            this.add(line);
            this._uLines.push({ line: line, u: i / this._contourResolution.u });
        }

        // v = constant
        for (let i = 0; i <= this._contourResolution.v; i++) {
            const line = this.#createLine();
            this.add(line);
            this._vLines.push({ line: line, v: i / this._contourResolution.v });
        }

        this.contoursVisible = this._showContours;
    }

    #updateLine(entry, sampleFn, colorFn) {
        const geometry = entry.line.geometry;
        const positions = geometry.attributes.position.array;

        const colors = geometry.attributes.color.array;
        for (let j = 0; j <= this._contourSegments; j++) {
            const k = 3 * j;
            sampleFn(j / this._contourSegments); // This call updates this._positionSample
            positions[k] = this._positionSample.x;
            positions[k + 1] = this._positionSample.y;
            positions[k + 2] = this._positionSample.z;

            colorFn(j / this._contourSegments);  // this call updates this._colorSample
            this._colorMapper.map(this._scalarSample.z, this._color);
            colors[k] = this._color.r;
            colors[k + 1] = this._color.g;
            colors[k + 2] = this._color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();
    }

    #renderContours() {
        for (const entry of this._uLines)
            this.#updateLine(entry,
                (v) => this._surface.sample(entry.u, v, this._positionSample),
                (v) => this._normalizedScalarField.sample(entry.u, v, this._scalarSample));

        for (const entry of this._vLines)
            this.#updateLine(entry,
                (u) => this._surface.sample(u, entry.v, this._positionSample),
                (u) => this._normalizedScalarField.sample(u, entry.v, this._scalarSample));
    }

    #renderSurface() {
        let k = 0;
        let c = 0;

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                this._surface.sample(u, v, this._positionSample);
                this._positions[k++] = this._positionSample.x;
                this._positions[k++] = this._positionSample.y;
                this._positions[k++] = this._positionSample.z;

                this._normalizedScalarField.sample(u, v, this._scalarSample);
                this._colorMapper.map(this._scalarSample.z, this._color);
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
    }

    render() {
        if (this._showSurface)
            this.#renderSurface();
        if (this._showContours)
            this.#renderContours();
        this._dirty = false;
    }
}
