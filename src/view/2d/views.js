import {
    Mesh, PlaneGeometry, MeshBasicMaterial, DataTexture, RGBAFormat, InstancedMesh, InstancedBufferAttribute,
    DynamicDrawUsage, Matrix4, Quaternion, Object3D, Color, SphereGeometry, MeshStandardMaterial,
    DoubleSide, BoxGeometry, Vector3, Box3, IcosahedronGeometry, ConeGeometry, CylinderGeometry, CapsuleGeometry
} from "three";

import { Renderable3D } from "../renderer.js";
import { Complex } from "../../model/math/math.js";
import { DropdownMenu} from "../../core/controls.js";
import { Registry } from "../../core/helion.js";
import { ColorMap, ColorMappers, hsvToRgb, WavelengthColorMapper} from "../colormappers.js";

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
        type = "Sphere",
        scalarField = particle => particle.mass,
        colorMapper = ColorMappers.get(ColorMap.Scientific)
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

    showShapeSelectorIn(container) {
        new DropdownMenu(container).for(ParticleCloudView.Shapes).addEventListener("change",
            event => this.shape = event.target.value
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

export class ScalarFieldIntensityPixelRaster extends Renderable3D {
    constructor({
        width = 512,
        height = 512,
        colorMapper = new WavelengthColorMapper(525)
    } = {}) {
        super();
        this._width = width;
        this._height = height;
        this._colorMapper = colorMapper;
        this._scalarField = null;

        const pixels = new Uint8Array(width * height * 4);
        const texture = new DataTexture(pixels,  width, height, RGBAFormat);
        texture.needsUpdate = true;
        this._mesh = new Mesh(
            new PlaneGeometry(width,height),
            new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide })
        );
        this.add(this._mesh);

        this._width = width;
        this._height = height;
        this._pixels = pixels;
        this._texture = texture;
        this._colorMapper = colorMapper;
        this._colour = new Color();
    }

    set context(context) { this._context = context; }

    canBindTo(discreteScalarField) {
        return discreteScalarField.valueAt;
    }

    _maxMagnitude(scalarField) {
        let max = -Infinity;

        for (let i = 0; i < scalarField.nx; i++)
            for (let j = 0; j < scalarField.ny; j++) {
                const value = scalarField.valueAt(i, j);
                if (value > max)
                    max = value;
            }

        return max;
    }

    synchronizeWith(scalarField) {
        const max =  this._maxMagnitude(scalarField);
        let index = 0;

        for(let j = 0; j < this._height; j++)
            for(let i = 0; i < this._width; i++) {
                const intensity = this._colorMapper?.map(scalarField.valueAt(i, j) / max, this._colour);
                this._pixels[index++] = this._colour.r;
                this._pixels[index++] = this._colour.g;
                this._pixels[index++] = this._colour.b;
                this._pixels[index++] = intensity;
            }

        this._texture.needsUpdate = true;
    }
}

/**
 * Visualizes the edge of a pixel raster as a
 * vertical plane perpendicular to the intensity pixel raster itself.
 */
export class FieldEdgeIntensityPixelRaster extends Renderable3D {
    constructor({
        nx = 100,
        ny = 1000,
        edgeHeight= 100,
        colorMapper = new WavelengthColorMapper()
    } = {}) {
        super();
        this._edgeHeight = edgeHeight;
        this._colorMapper = colorMapper;
        this._nx = nx;
        this._ny = ny;
        this._mesh = new InstancedMesh(new BoxGeometry(1, 1, 0.02), new MeshBasicMaterial(), nx * ny);
        this.add(this._mesh);

        this._matrix = new Matrix4();
        this._color = new Color();
    }

    canBindTo(model) { return model.valueAt; }

    synchronizeWith(field) {
        let index = 0;
        for (let i = 0; i < this._nx; i++) {
            const j = this._ny - 1; // fixed, we only need the last row!
            const x = i - this._nx * .5;
            const y = j - this._ny * .5;
            const brightness = this._colorMapper.map(field.valueAt(i, j) * 1e-10, this._color);

            index++;
            this._matrix.compose(new Vector3(x, y,0), new Quaternion(), new Vector3(1, 1, this._edgeHeight));
            this._mesh.setMatrixAt(index, this._matrix);
            this._mesh.setColorAt(index, this._color.multiplyScalar(brightness));
        }

        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }
}

export class ComplexScalarFieldRaster extends Renderable3D {
    constructor({
        width = 512,
        height = 512,
        showPhaseColour = true,
        brightness = 1
    } = {}) {
        super();
        this._brightness = brightness;
        this._numColors = 256;
        this._hsvTable = new Array(this._numColors);
        for (let i = 0; i < this._numColors; i++)
            this._hsvTable[i] = hsvToRgb(i / this._numColors, 1.0, 1.0); // V=1, saturation=1

        const pixels = new Uint8Array(width * height * 4);
        const texture = new DataTexture(pixels,  width, height, RGBAFormat);
        texture.needsUpdate = true;
        this._mesh = new Mesh(
            new PlaneGeometry(width, height),
            new MeshBasicMaterial({ map: texture, transparent: true })
        );
        this.add(this._mesh);

        this._width = width;
        this._height = height;
        this._pixels = pixels;
        this._texture = texture;
        this._phaseColor = showPhaseColour;
    }

    canBindTo(field) {
        return field.sample && field.nx && field.ny;
    }

    set brightness(brightness) { this._brightness = brightness; }
    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    synchronizeWith(field) {
        let index = 0;
        for (let x = 0; x < this._height; x++)
            for (let y = 0; y < this._width; y++) {
                const i = x * field.nx + y;
                const re = field.real[i];
                const im = field.imag[i];
                const mag = Math.sqrt(re * re + im * im);
                const phase = Math.atan2(im, re);

                let brightness = mag * this._brightness;
                if (brightness > 1.0) brightness = 1.0;

                if (this._phaseColor) {
                    const phaseIndex = Math.floor(((phase + Math.PI) / (2 * Math.PI)) * this._numColors);
                    const rgb = this._hsvTable[Math.max(0, Math.min(this._numColors - 1, phaseIndex))];
                    this._pixels[index++] = Math.round(rgb.r * brightness);
                    this._pixels[index++] = Math.round(rgb.g * brightness);
                    this._pixels[index++] = Math.round(rgb.b * brightness);
                    this._pixels[index++] = Math.round(brightness * 255);
                } else {
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 255;
                    this._pixels[index++] = 0;
                    this._pixels[index++] = Math.log(1 + brightness) * 255;
                }
            }

            this._texture.needsUpdate = true;
    }
}
