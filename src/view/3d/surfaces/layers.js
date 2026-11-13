import {
    Box3, BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry,
    DoubleSide, DynamicDrawUsage, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Line,
    LineBasicMaterial, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3
} from 'three';
import {Renderable3D} from '../../renderer.js';
import {DifferentialFrame} from '../../../model/math/numerics/diffgeometry.js';
import {AdaptiveSymmetricNormalizer, ColorLayer, HeightLayer, Normalizer} from './color_layers.js';
import {SurfaceResolution} from './visualization.js';
import {ColorMapper, ColorMappers} from '../../colormappers.js';
import {Registry} from '../../../core/utils.js';
import {Checkbox, DropdownMenu} from '../../../core/controls.js';
import {Interval} from '../../../model/math/math.js';

export class Layer extends Renderable3D {
    static material = () => new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true,
    });
    /**
     * @param {Object} [param0={}]
     * @param {SurfaceResolution} [param0.resolution=new SurfaceResolution(100, 100)]
     * @param {ColorLayer} [param0.colorLayer=new HeightLayer()]
     * @param {ColorMapper} [param0.colorMapper=new ColorMappers().get(ColorMappers.Gradient)()]
     * @param {Normalizer} [param0.normalizer=new AdaptiveSymmetricNormalizer()]
     */
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

        this._dirty = true;
    }

    get dirty() { return this._dirty; }

    /** @param {ColorMapper} colorMapper */
    set colorMapper(colorMapper) {
        this._colorMapper = colorMapper;
        this._dirty = true;
    }

    /** @param {ColorLayer} colorLayer */
    set colorLayer(colorLayer) {
        this._colorLayer = colorLayer;
        this._dirty = true;
    }

    /** @param {Normalizer} normalizer */
    set normalizer(normalizer) {
        this._normalizer = normalizer;
        this._normalizer.reset();
        this._dirty = true;
    }

    initialize(mathSurfaceDefinition) {
        this._normalizer.reset();
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

    rangeAt(model) {
        const range = new Interval(Infinity, -Infinity);
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.frameAt(u, v, this._frame);
                range.include(this._colorLayer.value(this._frame));
            }
        }
        return range;
    }

    updateNormalizerWith(model) {
        this._normalizer.adaptTo(this.rangeAt(model));
    }
}

class MeshLayer extends Layer {
    /**
     * @param {Object} [param0={}]
     * @param {SurfaceResolution} [param0.resolution=new SurfaceResolution(100, 100)]
     * @param {ColorLayer} [param0.colorLayer=new HeightLayer()]
     * @param {ColorMapper} [param0.colorMapper=new ColorMappers().get(ColorMappers.Gradient)()]
     * @param {Normalizer} [param0.normalizer=new AdaptiveSymmetricNormalizer()]
     */
    constructor({
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = new ColorMappers().get(ColorMappers.Gradient)(),
        normalizer = new AdaptiveSymmetricNormalizer(),
    } = {}) {
        super({resolution, colorLayer, colorMapper, normalizer});
        this._count = (resolution.u + 1) * (resolution.v + 1);
        this._colorArray = new Float32Array(this._count * 3);
        this._dirty = true;
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
        throw new Error('signalRefresh() must be implemented by subclass.');
    }

    updateMesh(index) {
        throw new Error('updateMesh() must be implemented by subclass.');
    }

    synchronizeWith(model) {
        this.updateNormalizerWith(model);

        let index = 0;
        // PlaneGeometry stores vertices with v as the outer loop and u as the inner loop.
        // Keep the same order here so positions and texture UVs address the same vertices.
        for (let j = 0; j <= this._resolution.v; j++) {
            const v = j / this._resolution.v;
            for (let i = 0; i <= this._resolution.u; i++) {
                const u = i / this._resolution.u;
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
    /**
     * @param {{
     *  glyphType?: string
     *  resolution?: SurfaceResolution
     *  colorLayer?: ColorLayer
     *  colorMapper?: ColorMapper
     *  normalizer?: Normalizer
     *  material?: Material
     *  vertexColors?: boolean
     *  opacity?: number
     *  glyphScale?: number
     * }} param0
     */
    constructor({
        resolution = new SurfaceResolution(100, 100),
        colorLayer = new HeightLayer(),
        colorMapper = new ColorMappers().get(ColorMappers.Gradient)(),
        normalizer = new AdaptiveSymmetricNormalizer(),
        material = Layer.material(),
        vertexColors = true,
        opacity = 1
    } = {}) {
        super({ resolution, colorLayer, colorMapper, normalizer });

        const geometry = new PlaneGeometry(1, 1, resolution.u, resolution.v);
        this._mesh = new Mesh(geometry, material);
        this._mesh.material.vertexColors = vertexColors;
        this._mesh.material.transparent = true;
        this._mesh.material.side = DoubleSide;
        this._mesh.material.opacity = opacity;
        this.add(this._mesh);
        this._positions = geometry.attributes.position.array;
        geometry.setAttribute('color', new BufferAttribute(this._colorArray, 3));
    }

    ui() {
        return new Checkbox('Wireframe ')
            .on(this)
            .withProperty('wireframe');
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
        BOXES: 'Box',
        CAPSULES: 'Capsule',
        CYLINDERS: 'Cylinder',
        CONES: 'Cone',
        ICOSAHEDRONS: 'Icosahedron',
        TILES: 'Plane',
        SPHERES: 'Sphere'
    });

    static Glyphs = new Registry({
        label: '𓅓 Glyph ',
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

    /**
     * @param {{
     *  glyphType?: string
     *  resolution?: SurfaceResolution
     *  colorLayer?: ColorLayer
     *  colorMapper?: ColorMapper
     *  normalizer?: Normalizer
     *  material?: Material
     *  opacity?: number
     *  glyphScale?: number
     * }} param0
     */
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
            .onChange(value => this.shape = value);
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
        Curvature: 'curvature',
        Direction: 'direction'
    });

    constructor({
        resolution = new SurfaceResolution(30, 30),
        scale = 0.2,
        showSecondDirection = true,
        colorMode = PrincipalDirectionsLayer.ColorMode.Direction,
        material = new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
        })
    } = {}) {
        super({resolution});
        this._scale = scale;
        this._showSecondDirection = showSecondDirection;
        this._colorMode = colorMode;
        this._tempColor = new Color();
        this._material = material;
        this._uVectors = [];
        this._vVectors = [];
        this._frame = new DifferentialFrame();
    }

    initialize(model) {
        super.initialize(model);
        this.disposeGeometry();
    }

    #ensureLineCount(count) {
        while (this._uVectors.length < count) {
            const line1 = this.#makeLine();
            const line2 = this.#makeLine();
            this.add(line1, line2);
            this._uVectors.push({line: line1});
            this._vVectors.push({line: line2});
        }

        while (this._uVectors.length > count) {
            const u = this._uVectors.pop().line;
            const v = this._vVectors.pop().line;
            this.remove(u, v);
            u.geometry.dispose();
            v.geometry.dispose();
        }
    }

    #updateLine(line, frame, direction, curvature) {
        const geometry = line.geometry;
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color.array;
        const point = frame.position;

        positions[0] = point.x;
        positions[1] = point.y;
        positions[2] = point.z;
        positions[3] = point.x + direction.x * this._scale;
        positions[4] = point.y + direction.y * this._scale;
        positions[5] = point.z + direction.z * this._scale;

        if (this._colorMode === PrincipalDirectionsLayer.ColorMode.Curvature) {
            const t = Math.min(Math.abs(curvature) / 5, 1);
            this._tempColor.setHSL(0.6 - 0.6 * t, 0.8, 0.5);
        } else {
            this._tempColor.setRGB(Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z));
        }

        for (let i = 0; i < 2; i++) {
            const offset = i * 3;
            colors[offset] = this._tempColor.r;
            colors[offset + 1] = this._tempColor.g;
            colors[offset + 2] = this._tempColor.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
    }

    /**
     * Synchronize from frames supplied by any differential-geometry source.
     * Frame positions must use the same coordinate space as this layer.
     * @param {Iterable<DifferentialFrame>} frames
     */
    synchronizeWithFrames(frames) {
        const frameList = Array.from(frames);
        this.#ensureLineCount(frameList.length);

        frameList.forEach((frame, index) => {
            const first = this._uVectors[index].line;
            const second = this._vVectors[index].line;
            first.visible = true;
            second.visible = this._showSecondDirection;
            this.#updateLine(first, frame, frame.d1, frame.k1);
            if (this._showSecondDirection)
                this.#updateLine(second, frame, frame.d2, frame.k2);
        });
    }

    synchronizeWith(model) {
        const frames = [];
        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                const frame = new DifferentialFrame();
                model.frameAt(u, v, frame);
                frames.push(frame);
            }
        }
        this.synchronizeWithFrames(frames);
    }

    disposeGeometry() {
        for (const entry of this._uVectors) {
            this.remove(entry.line);
            entry.line.geometry.dispose();
        }
        for (const entry of this._vVectors) {
            this.remove(entry.line);
            entry.line.geometry.dispose();
        }
        this._uVectors.length = 0;
        this._vVectors.length = 0;
    }

    get boundingBox() {
        const box = new Box3();
        for (const entry of this._uVectors)
            if (entry.line.visible) box.expandByObject(entry.line);
        for (const entry of this._vVectors)
            if (entry.line.visible) box.expandByObject(entry.line);
        return box;
    }

    #makeLine() {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(6), 3));
        return new Line(geometry, this._material);
    }
}

export class NormalsLayer extends Layer {
    constructor({
        resolution = new SurfaceResolution(30, 30),
        scale = 0.3,
        color = 0x00aaff,
        material = new LineBasicMaterial({ color, transparent: true })
    } = {}) {
        super({ resolution });

        this._scale = scale;
        this._material = material;
        this._lines = [];
    }

    initialize(model) {
        super.initialize(model);
        this.disposeGeometry?.();

        this._lines = [];
        for (let i = 0; i <= this._resolution.u; i++)
            for (let j = 0; j <= this._resolution.v; j++) {
                const line = this.#createLine();
                this.add(line);
                this._lines.push({ i, j, line });
            }
    }

    synchronizeWith(model) {
        let index = 0;

        for (let i = 0; i <= this._resolution.u; i++) {
            const u = i / this._resolution.u;
            for (let j = 0; j <= this._resolution.v; j++) {
                const v = j / this._resolution.v;
                model.frameAt(u, v, this._frame);
                this.#updateLine(this._lines[index++].line);
            }
        }
    }

    #updateLine(line) {
        const pos = line.geometry.attributes.position.array;

        const p = this._frame.position;
        const n = this._frame.normal;

        pos[0] = p.x;
        pos[1] = p.y;
        pos[2] = p.z;

        pos[3] = p.x + this._scale * n.x;
        pos[4] = p.y + this._scale * n.y;
        pos[5] = p.z + this._scale * n.z;

        line.geometry.attributes.position.needsUpdate = true;
    }

    #createLine() {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
        return new Line(geometry, this._material);
    }

    disposeGeometry() {
        for (const entry of this._lines) {
            this.remove(entry.line);
            entry.line.geometry.dispose();
        }

        this._lines = [];
    }

    reset() {}

    get boundingBox() {
        const box = new Box3();
        for (const entry of this._lines)
            box.expandByObject(entry.line);

        return box;
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
        contourSegments = 100
    } = {}) {
        super({ resolution, colorLayer, colorMapper, normalizer });

        this._material = material;
        this._contourSegments = contourSegments;
        this._resolution = resolution;
        /** @type {{line: Line, u: number}[]} */
        this._uLines = [];
        /** @type {{line: Line, u: number}[]} */
        this._vLines = [];

        this._showContours = true;
    }

    disposeGeometry() {
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
        geometry.setAttribute('position', new BufferAttribute(positions, 3));

        const colors = new Float32Array((this._contourSegments + 1) * 3);
        geometry.setAttribute('color', new BufferAttribute(colors, 3));

        return new Line(geometry, this._material);
    }

    initialize(model) {
        super.initialize(model);
        this.disposeGeometry();

        for (let i = 0; i <= this._resolution.u; i++) {
            const line = this.#createLine();
            this.add(line);
            this._uLines.push({ line: line, u: i / this._resolution.u });
        }

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
            sampleFn(j / this._contourSegments);
            positions[k] = this._frame.position.x;
            positions[k + 1] = this._frame.position.y;
            positions[k + 2] = this._frame.position.z;

            const normalized = this._normalizer.normalize(this._colorLayer.value(this._frame));
            this._colorMapper.map(normalized, this._color);
            colors[k] = this._color.r;
            colors[k + 1] = this._color.g;
            colors[k + 2] = this._color.b;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();
    }

    synchronizeWith(model) {
        this.updateNormalizerWith(model);

        for (const entry of this._uLines)
            this.#updateLine(entry, (v) => model.frameAt(entry.u, v, this._frame));

        for (const entry of this._vLines)
            this.#updateLine(entry, (u) => model.frameAt(u, entry.v, this._frame));
    }
}
