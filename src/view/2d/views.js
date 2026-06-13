import {
    Mesh, PlaneGeometry, MeshBasicMaterial, DataTexture, RGBAFormat, InstancedMesh,
    InstancedBufferAttribute, DynamicDrawUsage, CircleGeometry, Object3D, Color, SphereGeometry, MeshStandardMaterial,
    DoubleSide, BoxGeometry, Vector3, Box3
} from "three";
import { Renderable3D } from "../renderer.js";
import { Complex } from "../../model/math/math.js";

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

export class ParticleView2D extends Renderable3D {
    static material = new MeshStandardMaterial({
        side: DoubleSide,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
    });
    static Shape = Object.freeze({
        Circle: new CircleGeometry(1, 16),
        Sphere: new SphereGeometry(1, 16, 16)
    });

    constructor({
        particleCount = 5000,
        type = "Sphere",
        colorMapper = null
    } = {}) {
        super();

        this._mesh = new InstancedMesh(ParticleView2D.Shape[type], ParticleView2D.material, particleCount);
        this.add(this._mesh);

        this._colorArray = new Float32Array(particleCount * 3);
        this._mesh.instanceColor = new InstancedBufferAttribute(this._colorArray, 3);
        this._mesh.instanceColor.setUsage(DynamicDrawUsage);

        this._dummy = new Object3D();
        this._color = new Color();
    }

    render() {
        let index = 0;

        for (let i = 0; i < this._particleField.size; i++) {
            const particle = this._particleField.particleAt(i);

            this._dummy.position.set(particle.x, particle.y, 0);
            this._dummy.scale.setScalar(particle.radius);
            this._dummy.updateMatrix();
            this._mesh.setMatrixAt(index, this._dummy.matrix);

            const k = 3 * index;
            this._colorArray[k]     = particle.color.r;
            this._colorArray[k + 1] = particle.color.g;
            this._colorArray[k + 2] = particle.color.b;

            index++;
        }

        this._mesh.count = index;
        this._mesh.instanceMatrix.needsUpdate = true;
        this._mesh.instanceColor.needsUpdate = true;
    }

    bind(field) {
        this._particleField = field;
    }

    get boundingBox() {
        const box = new Box3();

        for (let i = 0; i < this._particleField.size; i++) {
            const p = this._particleField.particleAt(i);

            const r = p.radius || 1;

            box.expandByPoint(new Vector3(p.x - r, p.y - r, 0));
            box.expandByPoint(new Vector3(p.x + r, p.y + r, 0));
        }

        return box;
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
        this._scalarField = null;

        this._colour = new Color();
    }

    set context(context) { this._context = context; }

    bind(discreteScalarField) {
        // Sanity checks
        if (!discreteScalarField.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._scalarField = discreteScalarField;
    }

    _maxMagnitude() {
        let max = -Infinity;

        for (let i = 0; i < this._scalarField.nx; i++)
            for (let j = 0; j < this._scalarField.ny; j++) {
                const value = this._scalarField.valueAt(i, j);
                if (value > max)
                    max = value;
            }

        return max;
    }

    render() {
        const max =  this._maxMagnitude();
        let index = 0;

        for(let j = 0; j < this._height; j++)
            for(let i = 0; i < this._width; i++) {
                const intensity = this._colorMapper?.map(this._scalarField.valueAt(i, j) / max, this._colour);
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

    bind(field) {
        if (!field.sample)
            throw new Error("Field does not implement sample(x, y, target), so it cannot be attached to this view.");

        this._field = field;
    }

    set phaseColor(showPhaseColour) { this._phaseColor = showPhaseColour; }

    _maxMagnitude() {
        let max = 0;
        for (let i = 0; i < this._field.nx; i++)
            for (let j = 0; j < this._field.ny; j++) {
                this._field.sample(i, j, this._complexValue);
                if (this._complexValue.magnitude > max)
                    max = this._complexValue.magnitude;
            }

        return max;
    }

    render() {
        const max =  this._maxMagnitude();
        let index = 0;

        for(let j = 0; j < this._height; j++)
            for(let i = 0; i < this._width; i++) {
                this._field.sample(i, j, this._complexValue);
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
