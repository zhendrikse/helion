import {
    Mesh, PlaneGeometry, MeshBasicMaterial, DataTexture, RGBAFormat, InstancedMesh,
    InstancedBufferAttribute, DynamicDrawUsage, CircleGeometry, Object3D, Color, SphereGeometry, MeshStandardMaterial,
    DoubleSide, BoxGeometry, Vector3, Box3, IcosahedronGeometry, ConeGeometry, CylinderGeometry, CapsuleGeometry
} from "three";
import { Renderable3D } from "../renderer.js";
import { Complex } from "../../model/math/math.js";
import {DropdownMenu} from "../../controller/controller.js";
import {Registry} from "../../core/helion.js";
import {ColorMap, ColorMappers} from "../colormappers.js";

export function hsvToRgb(h, s, v) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

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

export class ScalarFieldPixelRaster extends Renderable3D {
    constructor({
        width = 512,
        height = 512,
        colorMapper = null
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
            new MeshBasicMaterial({ map: texture, transparent: true })
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

export class ComplexScalarFieldRaster extends Renderable3D {
    constructor({
        width = 512,
        height = 512,
        showPhaseColour = true,
        colorMapper = (magnitude, phase) => {
            if (magnitude < 1e-3)
                return [0, 0, 0, 0];

            const hue = (phase + Math.PI) / (2 * Math.PI);
            const {r, g, b} = hsvToRgb(hue, 1, 1);
            const brightness = Math.pow(magnitude, 0.3);
            const alpha = Math.log(1 + 10 * magnitude);
            return [r * brightness, g * brightness, b * brightness, alpha * 255];
        }
    } = {}) {
        super();

        const pixels = new Uint8Array(width * height * 4);
        const texture = new DataTexture(pixels,  width, height, RGBAFormat);
        texture.needsUpdate = true;
        this._mesh = new Mesh(
            new PlaneGeometry(1,1),
            new MeshBasicMaterial({ map: texture, transparent: true })
        );
        this.add(this._mesh);

        this._width = width;
        this._height = height;
        this._pixels = pixels;
        this._texture = texture;
        this._phaseColor = showPhaseColour;
        this._colorMapper = colorMapper;
        this._complexValue = new Complex();
    }

    canBindTo(field) {
        return field.sample && field.nx && field.ny;
    }

    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    _maxMagnitude(field) {
        let max = 0;
        for (let i = 0; i < field.nx; i++)
            for (let j = 0; j < field.ny; j++) {
                field.sample(i, j, this._complexValue);
                if (this._complexValue.magnitude > max)
                    max = this._complexValue.magnitude;
            }

        return max;
    }

    synchronizeWith(field) {
        const max =  this._maxMagnitude(field);
        let index = 0;

        for(let j = 0; j < this._height; j++)
            for(let i = 0; i < this._width; i++) {
                field.sample(i, j, this._complexValue);
                const mag = this._complexValue.magnitude / max;
                const phase = this._complexValue.phase;
                const color = this._phaseColor ?
                    this._colorMapper(mag, phase) : [255, 255, 0,Math.log(1 + 10 * mag) * 255];

                this._pixels[index++] = color[0];
                this._pixels[index++] = color[1];
                this._pixels[index++] = color[2];
                this._pixels[index++] = color[3];
            }

        this._texture.needsUpdate = true;
    }
}
