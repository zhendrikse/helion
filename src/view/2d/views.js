import {
    Mesh, PlaneGeometry, MeshBasicMaterial, DataTexture, RGBAFormat, InstancedMesh, InstancedBufferAttribute,
    DynamicDrawUsage, Object3D, Color, SphereGeometry, MeshStandardMaterial,
    DoubleSide, BoxGeometry, Vector3, Box3, IcosahedronGeometry, ConeGeometry, CylinderGeometry, CapsuleGeometry
} from "three";

import {Renderable2D, Renderable3D} from "../renderer.js";
import {CompoundControl, DropdownMenu, Slider} from "../../core/controls.js";
import { Registry } from "../../core/helion.js";
import { ComplexColorMappers, WavelengthColorMapper} from "../colormappers.js";
import {SurfaceResolution} from "../3d/surfaces/visualization.js";
import {ComplexFunctionSample} from "../../model/math/fields.js";
import {Interval} from "../../model/math/math.js";

export class ParticleCloudView extends Renderable3D {
    static material = new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
    });

    static Shape = Object.freeze({
        Box: new BoxGeometry(2, 2, 2),
        Capsule: new CapsuleGeometry(.75, 2.5),
        Cone: new ConeGeometry(1.5, 3),
        Cylinder: new CylinderGeometry(.75, .75, 2.5, 16),
        Icosahedron: new IcosahedronGeometry(1.5),
        Sphere: new SphereGeometry(1.25, 16, 16)
    });

    static Shapes = new Registry({
        id: "shapeSelector",
        label: "Particle shape ",
        entries: ParticleCloudView.Shape
    });

    constructor({
        particleCount = 5000,
        type = "Sphere"
    } = {}) {
        super();

        this._mesh = new InstancedMesh(ParticleCloudView.Shape[type], ParticleCloudView.material, particleCount);
        this.add(this._mesh);

        this._colorArray = new Float32Array(particleCount * 3);
        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);

        this._dummy = new Object3D();
        this._color = new Color();
        this._boundingBox = new Box3();
    }

    synchronizeWith(particleField) {
        let index = 0;
        this._boundingBox = new Box3();
        for (let i = 0; i < particleField.size; i++) {
            const pos = particleField.particleStateAt(i).position;
            const r = particleField.particleStateAt(i).size;
            const color = particleField.particleStateAt(i).color;

            this._boundingBox.expandByPoint(new Vector3(pos.x - r, pos.y - r, pos.z - r));
            this._boundingBox.expandByPoint(new Vector3(pos.x + r, pos.y + r, pos.z + r));

            this._dummy.position.set(pos.x, pos.y, 0);
            this._dummy.scale.setScalar(particleField.particleStateAt(i).size);
            this._dummy.updateMatrix();
            this._mesh.setMatrixAt(index, this._dummy.matrix);

            const k = 3 * index;
            this._colorArray[k]     = color.r;
            this._colorArray[k + 1] = color.g;
            this._colorArray[k + 2] = color.b;

            index++;
        }

        this._mesh.count = index;
        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }

    canBindTo(model) {
        return model.particleStateAt;
    }

    get boundingBox() { return this._boundingBox; }

    controls() {
        return new DropdownMenu()
            .for(ParticleCloudView.Shapes)
            .addEventListener("change", event => this.shape = event.target.value
        );
    }

    set shape(shapeType) {
        const oldGeometry = this._mesh.geometry;
        this._mesh.geometry = ParticleCloudView.Shape[shapeType];

        if (oldGeometry)
            oldGeometry.dispose();

        //this._dirty = true;
    }
}

export class PixelRasterView extends Renderable3D {
    constructor({
        width = 512,
        height = 512,
        transparent = false
    } = {}) {
        super();

        this._width = width;
        this._height = height;
        this._pixels = new Uint8Array(width * height * 4);
        this._texture = new DataTexture(this._pixels, width, height, RGBAFormat);
        this._texture.needsUpdate = true;
        this._mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({
            map: this._texture,
            transparent,
            side: DoubleSide
        }));

        this.add(this._mesh);
    }

    get width() { return this._width; }
    get height() { return this._height; }

    canBindTo(model) {
        return model.pixelAt || model.pixels;
    }

    setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= this._width || y < 0 || y >= this._height)
            return;

        const index = (y * this._width + x) * 4;

        this._pixels[index]     = r;
        this._pixels[index + 1] = g;
        this._pixels[index + 2] = b;
        this._pixels[index + 3] = a;
    }

    clear(r = 0, g = 0, b = 0, a = 255) {
        for (let i = 0; i < this._pixels.length; i += 4) {
            this._pixels[i]     = r;
            this._pixels[i + 1] = g;
            this._pixels[i + 2] = b;
            this._pixels[i + 3] = a;
        }

        this._texture.needsUpdate = true;
    }

    synchronizeWith(model) {
        if (model.pixels)
            this._pixels.set(model.pixels);
        else
            for (let y = 0; y < this._height; y++)
                for (let x = 0; x < this._width; x++) {
                    const color = model.pixelAt(x, y);
                    this.setPixel(x, y, color[0], color[1], color[2], color[3] ?? 255);
                }

        this._texture.needsUpdate = true;
    }

    resize(width, height) {
        this._width = width;
        this._height = height;

        this._pixels = new Uint8Array(width * height * 4);
        this._texture.dispose();
        this._texture = new DataTexture(this._pixels, width, height, RGBAFormat);
        this._texture.needsUpdate = true;

        this._mesh.geometry.dispose();
        this._mesh.geometry = new PlaneGeometry(width, height);
        this._mesh.material.map = this._texture;
        this._mesh.material.needsUpdate = true;
    }
}

export class DiscreteFieldSurfaceView extends Renderable2D {
    constructor({
        resolution = new SurfaceResolution(512, 512),
        colorMapper = new WavelengthColorMapper(525),
        brightnessFunction = intensity => 255 * Math.sqrt(intensity)
    } = {}) {
        super();
        this._width = resolution.u;
        this._height = resolution.v;
        this._colorMapper = colorMapper;
        this._brightnessFunction = brightnessFunction;

        const pixels = new Uint8Array(this._width * this._height * 4);
        const texture = new DataTexture(pixels, this._width, this._height, RGBAFormat);
        texture.needsUpdate = true;
        this._mesh = new Mesh(
            new PlaneGeometry(this._width, this._height),
            new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
        );
        this.add(this._mesh);

        this._pixels = pixels;
        this._texture = texture;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
    }

    set context(context) { this._context = context; }

    canBindTo(discreteScalarField) {
        if (discreteScalarField.valueAt === undefined || discreteScalarField.rangeAt === undefined)
            throw new Error("This view needs valueAt() and rangeAt() methods to display surface");
        return true;
    }

    synchronizeWith(scalarField) {
        const interval = scalarField.rangeAt();
        let index = 0;

        for(let j = 0; j < this._height; j++)
            for(let i = 0; i < this._width; i++) {
                const value = interval.normalize(scalarField.valueAt(i, j));
                this._colorMapper?.map(value, this._rgb);
                this._pixels[index++] = this._rgb.r;
                this._pixels[index++] = this._rgb.g;
                this._pixels[index++] = this._rgb.b;
                this._pixels[index++] = this._brightnessFunction(value);
            }

        this._texture.needsUpdate = true;
        this._mesh.material.map.needsUpdate = true;
    }
}

/**
 * Visualizes the edge of a pixel raster as a
 * vertical plane perpendicular to the intensity pixel raster itself.
 */
export class FieldEdgeIntensityPixelRaster extends Renderable3D {
    constructor({
        nx = 100,
        ny = 100,
        edgeHeight = 100,
        colorMapper = new WavelengthColorMapper(525),
        brightnessFunction = intensity => 255 * Math.sqrt(intensity)
    } = {}) {
        super();
        this._brightnessFunction = brightnessFunction;
        this._nx = nx;
        this._ny = ny;
        this._colorMapper = colorMapper;
        this._pixels = new Uint8Array(nx * 4);
        this._texture = new DataTexture(this._pixels, nx, 1, RGBAFormat);
        this._texture.needsUpdate = true;

        this._mesh = new Mesh(
            new PlaneGeometry(nx, edgeHeight),
            new MeshBasicMaterial({
                map: this._texture,
                transparent: true,
                side: DoubleSide
            })
        );

        this._mesh.rotation.x = Math.PI * 0.5; // Put edge straight up
        this._mesh.position.y = ny * 0.5;
        this.add(this._mesh);
        this._rgb = new Color();
    }

    canBindTo(discreteScalarField) {
        if (discreteScalarField.valueAt === undefined || discreteScalarField.rangeAt === undefined)
            throw new Error("This view needs valueAt() and rangeAt() methods to display surface");
        return true;
    }

    synchronizeWith(scalarField) {
        const interval = scalarField.rangeAt();
        const j = this._ny - 1;
        let index = 0;

        for (let i = 0; i < this._nx; i++) {
            const value = interval.normalize(scalarField.valueAt(i, j));
            this._colorMapper?.map(value, this._rgb);
            this._pixels[index++] = this._rgb.r;
            this._pixels[index++] = this._rgb.g;
            this._pixels[index++] = this._rgb.b;
            this._pixels[index++] = this._brightnessFunction(value);
        }

        this._texture.needsUpdate = true;
    }
}

/**
 * Base for 2D complex-field views (DataTexture).
 * Mirrors ComplexFieldViewable (3D) for 2D: same sample/valueAt contract,
 * same resolution() and canBindTo() with valueAt fast-path for discrete grids.
 */
export class ComplexFieldViewable2D extends Renderable2D {
    constructor(defaultResolution = new SurfaceResolution(200, 200)) {
        super();
        this._fieldIsDiscrete = false;
        this._sample = new ComplexFunctionSample();
        this._resolution = defaultResolution;
        this._mesh = null;
        this._pixels = null;
        this._texture = null;
    }

    resolution(field) {
        return {
            width: this._fieldIsDiscrete ? field.nx : this._resolution.u,
            height: this._fieldIsDiscrete ? field.ny : this._resolution.v,
        };
    }

    canBindTo(field) {
        this._fieldIsDiscrete = field.nx !== undefined && field.ny !== undefined;
        if (this._fieldIsDiscrete) {
            if (!field.valueAt)
                throw new Error("2D complex view needs valueAt() on discrete field");
        } else {
            if (!field.sample)
                throw new Error("2D complex view needs sample() on continuous field");
        }
        return true;
    }

    dispose() {
        if (!this._mesh) return;
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._mesh.material.dispose();
        if (this._texture) this._texture.dispose();
        this._mesh = null;
        this._pixels = null;
        this._texture = null;
    }

    get boundingBox() {
        if (!this._mesh) return new Box3();
        this._mesh.geometry.computeBoundingBox();
        return this._mesh.geometry.boundingBox;
    }
}

export class ComplexSurfaceView2D extends ComplexFieldViewable2D {
    constructor({
        showPhaseColour = true,
        brightnessFunction = modulus => modulus > 1.0 ? 1.0 : modulus,
        colorMapper = ComplexColorMappers.get(ComplexColorMappers.Hsv),
        defaultResolution = new SurfaceResolution(400, 400),
    } = {}) {
        super(defaultResolution);
        this._brightnessFunction = brightnessFunction;
        this._colorMapper = colorMapper;
        this._rgb = new Color();
        this._colorData = { phase: 0, modulus: 0 };
        this._phaseColor = showPhaseColour;
    }

    set colorMapper(mapper) { this._colorMapper = mapper; }

    initialize(field) {
        this.dispose();
        const { width, height } = this.resolution(field);
        const pixels = new Uint8Array((width + 1) * (height + 1) * 4);
        const texture = new DataTexture(pixels, width + 1, height + 1, RGBAFormat);
        texture.needsUpdate = true;
        // World size: discrete keeps 1 world unit per texel, continuous uses 4x4 domain
        const worldWidth = this._fieldIsDiscrete ? width : 4;
        const worldHeight = this._fieldIsDiscrete ? height : 4;
        this._mesh = new Mesh(
            new PlaneGeometry(worldWidth, worldHeight),
            new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
        );
        this.add(this._mesh);

        this._pixels = pixels;
        this._texture = texture;
    }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ComplexColorMappers())
                .addEventListener("change", event => this._colorMapper = ComplexColorMappers.get(event.target.value))
            );
    }

    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    synchronizeWith(field) {
        const { width, height } = this.resolution(field);
        const sample = this._sample;
        const brightness = this._brightnessFunction;
        const sampleFunction = this._fieldIsDiscrete
            ? field.valueAt.bind(field)
            : field.sample.bind(field);

        let index = 0;
        for (let y = 0; y <= height; y++) {
            for (let x = 0; x <= width; x++) {
                if (this._fieldIsDiscrete)
                    sampleFunction(x, y, sample);
                else
                    sampleFunction(x / width, y / height, sample);

                const intensity = 255 * brightness(sample.magnitude);
                if (this._phaseColor) {
                    this._colorData.phase = sample.phase;
                    this._colorData.modulus = sample.magnitude;
                    this._colorMapper.map(this._colorData, this._rgb);
                    // Modulate RGB with intensity, keep alpha opaque (no shine-through)
                    this._pixels[index++] = Math.round(this._rgb.r * intensity);
                    this._pixels[index++] = Math.round(this._rgb.g * intensity);
                    this._pixels[index++] = Math.round(this._rgb.b * intensity);
                } else {
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 0;
                }
                this._pixels[index++] = intensity;
            }
        }

        this._texture.needsUpdate = true;
        this._mesh.material.map.needsUpdate = true;
    }
}

