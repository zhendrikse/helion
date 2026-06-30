/**
 * Surface drawing:
 *     SurfaceView -> Surface.sample() -> ScalarField.scalarValueAt()
 *
 * Coloring:    ↓
 *     ColorMapper -> NormalizedScalarField -> Normalizer.normalize() -> SurfaceScalarField.scalarValueAt()
 */
import {
    Box3, BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry,
    DoubleSide, DynamicDrawUsage, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Line,
    LineBasicMaterial, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3
} from "three";
import {Renderable3D} from "../../renderer.js";
import {DifferentialFrame} from "../../../model/math/numerics/diffgeometry.js";
import {AdaptiveSymmetricNormalizer, HeightLayer, SurfaceResolution} from "./visualization.js";
import {ColorMappers} from "../../colormappers.js";
import {Registry} from "../../../core/helion.js";
import {Checkbox, DropdownMenu} from "../../../core/controls.js";
import {Vec3} from "../../../model/math/math.js";

export class Layer extends Renderable3D {
    static UP = new Vector3(0, 1, 0);
    static material = () => new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true,
    });

    constructor({
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = new ColorMappers().get(ColorMappers.Gradient)(),
        normalizer = new AdaptiveSymmetricNormalizer(),
    } = {}) {
        super();
        this._resolution = resolution;
        this._colorLayer = colorLayer;
        this._normalizer = normalizer;
        this._colorMapper = colorMapper;
        this._color = new Color();
        this._frame = new DifferentialFrame();

        this._dirty = true;                 // When surface definition has changed, this flag is raised
    }

    get dirty() { return this._dirty; }

    set colorMapper(colorMapper) {
        this._colorMapper = colorMapper;
        this._dirty = true;
    }

    set colorLayer(colorLayer) {
        this._colorLayer = colorLayer;
        this._dirty = true;
    }

    initialize(mathSurfaceDefinition) {
        this._dirty = true;
    }

    get boundingBox() {
        this.updateMatrixWorld(true);
        return new Box3().setFromObject(this);
    }

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

    updateNormalizerWith(model) {
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.frameAt(u, v, this._frame);
                this._normalizer.include(this._colorLayer.value(this._frame));
            }
        }
    }
}

class MeshLayer extends Layer {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = new ColorMappers().get(ColorMappers.Gradient)(),
        normalizer = new AdaptiveSymmetricNormalizer(),
    } = {}) {
        super({resolution, colorLayer, colorMapper, normalizer});
        this._normalizer = normalizer;

        this._count = (resolution.u + 1) * (resolution.v + 1);
        this._colorArray = new Float32Array(this._count * 3);
        this._dirty = true;                 // When surface definition has changed, this flag is raised
    }

    updateColor(index) {
        const normalized = this._normalizer.normalize(this._colorLayer.value(this._frame));
        this._colorMapper.map(normalized, this._color);
        this._colorArray[index    ] = this._color.r;
        this._colorArray[index + 1] = this._color.g;
        this._colorArray[index + 2] = this._color.b;
    }

    set opacity(opacity) {
        this._mesh.material.opacity = opacity;
        this._dirty = true;
    }

    get opacity() { return this._mesh.material.opacity; }

    signalRefresh() {
        throw new Error("signalRefresh() must be implemented by subclass.");
    }

    updateMesh(index) {
        throw new Error("updateMesh() must be implemented by subclass.");
    }

    synchronizeWith(model) {
        this.updateNormalizerWith(model);

        let index = 0;
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.frameAt(u, v, this._frame);
                this.updateMesh(index);
                this.updateColor(index);
                index += 3;
            }
        }

        this.signalRefresh();
    }
}

export class SurfaceLayer extends MeshLayer {
    constructor({
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = new ColorMappers().get(ColorMappers.Gradient)(),
        normalizer = new AdaptiveSymmetricNormalizer(),
        material = Layer.material(),
        opacity = 1
    } = {}) {
        super({ resolution, colorLayer, colorMapper, normalizer });

        // Surface
        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        this._mesh = new Mesh(geometry, material);
        this._mesh.material.vertexColors = true;
        this._mesh.material.transparent = true;
        this._mesh.material.side = DoubleSide;
        this._mesh.material.opacity = opacity;
        this.add(this._mesh);
        this._positions = geometry.attributes.position.array;
        geometry.setAttribute("color", new BufferAttribute(this._colorArray, 3));
    }

    ui() {
        return new Checkbox("Wireframe ")
            .on(this)
            .withProperty("wireframe");
    }

    set wireframe(value) { this._mesh.material.wireframe = value; }

    get boundingBox() {
        const box = new Box3();

        this._mesh.geometry.computeBoundingBox();
        if (this._mesh.geometry.boundingBox)
            box.union(this._mesh.geometry.boundingBox);

        return box;
    }

    initialize(model) {
        super.initialize(model);
    }

    updateMesh(index) {
        this._positions[index] = this._frame.position.x;
        this._positions[index + 1] = this._frame.position.y;
        this._positions[index + 2] = this._frame.position.z;
    }

    signalRefresh() {
        this._mesh.geometry.attributes.position.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
        this._mesh.geometry.computeVertexNormals();

        if (this._dirty)
            this._mesh.geometry.computeBoundingBox();

        this._dirty = false;
    }
}

export class GlyphLayer extends MeshLayer {
    static GlyphTypes = Object.freeze({
        BOXES: "Box",
        CAPSULES: "Capsule",
        CYLINDERS: "Cylinder",
        CONES: "Cone",
        ICOSAHEDRONS: "Icosahedron",
        TILES: "Plane",
        SPHERES: "Sphere"
    });

    static Glyphs = new Registry({
        label: "𓅓 Glyph ",
        entries: Object.freeze({
            Box: {
                geometry: new BoxGeometry(1, 1, 1),
                orientationAxis: new Vector3(0, 1, 0)
            },
            Capsule: {
                geometry: new CapsuleGeometry(.33, 1, 4, 8),
                orientationAxis: new Vector3(0, 1, 0)
            },
            Cylinder: {
                geometry: new CylinderGeometry(.33, .33, 2, 8),
                orientationAxis: new Vector3(0, 1, 0)
            },
            Cone: {
                geometry: new ConeGeometry(.5, 1, 8),
                orientationAxis: new Vector3(0, -1, 0)
            },
            Icosahedron: {
                geometry: new IcosahedronGeometry(.5),
                orientationAxis: new Vector3(0, 1, 0)
            },
            Plane: {
                geometry: new PlaneGeometry(1, 1),
                orientationAxis: new Vector3(0, 0, 1)
            },
            Sphere: {
                geometry: new SphereGeometry(.5, 6, 6),
                orientationAxis: null
            }
        })
    });

    constructor({
        glyphType = MeshLayer.GlyphTypes.BOXES,
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = colorLayer.preferredColorMapper(),
        normalizer = new AdaptiveSymmetricNormalizer(),
        material = Layer.material(),
        opacity = 1,
        glyphScale = 0.8
    } = {}) {
        super({resolution, colorLayer, colorMapper, normalizer});
        this._glyphScale = glyphScale;
        this._dummy = new Object3D();

        const geometry = GlyphLayer.Glyphs.get(glyphType).geometry;
        this._mesh = new InstancedMesh(geometry, material, this._count);
        this._mesh.material.opacity = opacity;
        this.add(this._mesh);

        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);

        this._orientationAxis = GlyphLayer.Glyphs.get(glyphType).orientationAxis;
        this.shape = glyphType;
    }

    setGeometry(geometry) {
        const oldGeometry = this._mesh.geometry;
        this._mesh.geometry = geometry;

        if (oldGeometry)
            oldGeometry.dispose();

        this._dirty = true;
    }

    set shape(glyphType) {
        const shape = GlyphLayer.Glyphs.get(glyphType);
        if (shape.orientationAxis)
            this._orientationAxis.copy(shape.orientationAxis);
        this.setGeometry(shape.geometry);
    }

    ui() {
        return new DropdownMenu()
            .for(GlyphLayer.Glyphs)
            .addEventListener("change", event => this.shape = event.target.value);
    }

    initialize(model) {
        super.initialize(model);
        const spacing = model.sampleSpacing(this._resolution);
        this._dummy.scale.set(spacing.x, spacing.y, spacing.x).multiplyScalar(this._glyphScale);
    }

    updateMesh(index) {
        this._dummy.position.copy(this._frame.position);
        if (this._orientationAxis)
            this._dummy.quaternion.setFromUnitVectors(this._orientationAxis, this._frame.normal);
        this._dummy.updateMatrix();
        this._mesh.setMatrixAt(index / 3, this._dummy.matrix);
    }

    signalRefresh() {
        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
        this._mesh.computeBoundingSphere();
        this._dirty = false;
    }
}

export class PrincipalDirectionsLayer extends Layer {
    static ColorMode = Object.freeze({
        Curvature: "curvature",
        Direction: "direction"
    });

    constructor({
        resolution = new SurfaceResolution(30, 30),
        scale = 0.2,
        showSecondDirection = true,
        colorMode = PrincipalDirectionsLayer.ColorMode.Curvature,
        material = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
        })
    } = {}) {
        super({resolution});

        this._scale = scale;
        this._showSecondDirection = showSecondDirection;
        this._colorMode = colorMode;

        this._material = material;

        this._uVectors = [];
        this._vVectors = [];

        this._frame = new DifferentialFrame();
    }

    initialize(model) {
        super.initialize(model);

        this._uVectors = [];
        this._vVectors = [];

        for (let i = 0; i <= this._resolution.u; i++) {
            for (let j = 0; j <= this._resolution.v; j++) {
                const line1 = this.#makeLine();
                const line2 = this.#makeLine();

                this.add(line1);
                this.add(line2);

                this._uVectors.push({ i, j, line: line1 });
                this._vVectors.push({ i, j, line: line2 });
            }
        }
    }

    #updateLine(line, direction) {
        const g = line.geometry;
        const pos = g.attributes.position.array;
        const col = g.attributes.color.array;

        const p = this._frame.position;
        const p2 = new Vec3(
            p.x + direction.x * this._scale,
            p.y + direction.y * this._scale,
            p.z + direction.z * this._scale
        );

        pos[0] = p.x;
        pos[1] = p.y;
        pos[2] = p.z;

        pos[3] = p2.x;
        pos[4] = p2.y;
        pos[5] = p2.z;

        const color = this.#color(direction);
        col[0] = color.r;
        col[1] = color.g;
        col[2] = color.b;

        col[3] = color.r;
        col[4] = color.g;
        col[5] = color.b;

        g.attributes.position.needsUpdate = true;
        g.attributes.color.needsUpdate = true;
    }

    #color(dir) {
        if (this._colorMode === PrincipalDirectionsLayer.ColorMode.Curvature) {
            const k = Math.abs(this._frame.k1); // of k2
            const t = Math.min(k / 5, 1);
            return new Color().setHSL(0.6 - 0.6 * t, 0.8, 0.5);
        }

        // direction-based coloring
        return new Color().setRGB(Math.abs(dir.x), Math.abs(dir.y), Math.abs(dir.z));
    }

    synchronizeWith(model) {
        this.updateNormalizerWith(model);
        super.synchronizeWith(model);

        let idx = 0;
        for (let i = 0; i <= this._resolution.u; i++)
            for (let j = 0; j <= this._resolution.v; j++) {
                const u = i / this._resolution.u;
                const v = j / this._resolution.v;

                model.frameAt(u, v, this._frame);
                if (!this._frame) continue;

                // d1 direction
                this.#updateLine(this._uVectors[idx].line, this._frame.d1);

                // d2 direction
                if (this._showSecondDirection)
                    this.#updateLine(this._vVectors[idx].line, this._frame.d2);

                idx++;
            }
    }

    reset() {
        for (const v of this._uVectors) this.remove(v.line);
        for (const v of this._vVectors) this.remove(v.line);

        this._uVectors.length = 0;
        this._vVectors.length = 0;
    }

    get boundingBox() {
        const box = new Box3();

        for (const v of this._uVectors)
            box.expandByObject(v.line);

        for (const v of this._vVectors)
            box.expandByObject(v.line);

        return box;
    }

    #makeLine() {
        const geometry = new BufferGeometry();

        const positions = new Float32Array(2 * 3); // segment line
        geometry.setAttribute("position", new BufferAttribute(positions, 3));

        const colors = new Float32Array(2 * 3);
        geometry.setAttribute("color", new BufferAttribute(colors, 3));

        return new Line(geometry, this._material);
    }
}

export class ContoursLayer extends Layer {
    constructor({
        resolution = new SurfaceResolution(40, 40),
        colorLayer = new HeightLayer(),
        colorMapper = colorLayer.preferredColorMapper(),
        normalizer = new AdaptiveSymmetricNormalizer(),
        material = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: true,
            depthTest: true
        }),
        contourSegments = 100 // per line
    } = {}) {
        super({ resolution, colorLayer, colorMapper, normalizer });

        this._material = material;
        this._contourSegments = contourSegments;
        this._resolution = resolution;
        this._uLines = [];
        this._vLines = [];

        this._showContours = true;
    }

    reset() {
        for (const entry of [...this._uLines, ...this._vLines]) {
            this.remove(entry.line);

            entry.line.geometry.dispose();
            entry.line.material?.dispose?.();
        }

        this._uLines = [];
        this._vLines = [];
    }

    get contoursVisible() { return this._showContours; }

    set contoursVisible(value) {
        this._showContours = value;

        for (const entry of this._uLines)
            entry.line.visible = value;

        for (const entry of this._vLines)
            entry.line.visible = value;
    }

    get boundingBox() {
        const box = new Box3();

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

        return new Line(geometry, this._material);
    }

    initialize(model) {
        super.initialize(model);
        this._uLines = [];
        this._vLines = [];

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

        this.contoursVisible = this._showContours;
    }

    #updateLine(entry, sampleFn) {
        const geometry = entry.line.geometry;
        const positions = geometry.attributes.position.array;

        const colors = geometry.attributes.color.array;
        for (let j = 0; j <= this._contourSegments; j++) {
            const k = 3 * j;
            sampleFn(j / this._contourSegments); // This call updates this._frame
            positions[k    ] = this._frame.position.x;
            positions[k + 1] = this._frame.position.y;
            positions[k + 2] = this._frame.position.z;

            const normalized = this._normalizer.normalize(this._colorLayer.value(this._frame));
            this._colorMapper.map(normalized, this._color);
            colors[k    ] = this._color.r;
            colors[k + 1] = this._color.g;
            colors[k + 2] = this._color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();
    }

    synchronizeWith(model) {
        this.updateNormalizerWith(model);
        super.synchronizeWith(model);
        for (const entry of this._uLines)
            this.#updateLine(entry, (v) => model.frameAt(entry.u, v, this._frame));

        for (const entry of this._vLines)
            this.#updateLine(entry, (u) => model.frameAt(u, entry.v, this._frame));
    }
}

