import {
    Group, Vector3, Color, Points, ShaderMaterial, AdditiveBlending, BufferAttribute,
    BufferGeometry, InstancedMesh, Matrix4, Quaternion, InstancedBufferAttribute,
    MeshStandardMaterial, CylinderGeometry, BoxGeometry, ConeGeometry
} from "three";
import { Arrow } from "../primitives/primitives.js";
import { Complex, Vec3 } from "../../../model/math/math.js";
import { Renderable3D } from "../../renderer.js";
import { MathPhysicsModelBehavior } from "../../../core/helion.js";

//
// Point cloud
//
export class PointCloudMaterial {
    static stars() {
        return new ShaderMaterial({
            vertexColors: true,
            transparent: true,
            depthTest: false,
            blending: AdditiveBlending,

            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(position);
                    vAlpha = 1.0 - smoothstep(0.0, 25.0, dist);
                    gl_PointSize = clamp(size * (750.0 / length(mvPosition.xyz)), 1.0, 8.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,

            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    float alpha = exp(-d * d * 10.0) * vAlpha;

                    if(alpha < 0.01)
                        discard;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `
        });
    }

    static galaxy() {
        return new ShaderMaterial({
            vertexColors: true,
            transparent: true,
            depthTest: false,
            blending: AdditiveBlending,
            vertexShader: `
    attribute float size;
    varying float vAlpha;
    varying float vDistance;
    varying float vRandom;

    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // distance to center
        float dist = length(position);
        vDistance = dist;

        // random factor for star brightness
        vRandom = 0.8 + 0.2 * rand(position.xy);

        // alpha: central glow + distance decrease
        float haloFactor = smoothstep(0.0, 150.0, dist); // halo groter bij kern
        vAlpha = vRandom * (1.0 - smoothstep(0.0, 500.0, dist)) * haloFactor;

        // camera-dependent size
        gl_PointSize = size * (750.0 / (length(mvPosition.xyz) + 1.0));
        gl_Position = projectionMatrix * mvPosition;
    }
`,
            fragmentShader: `
    varying float vAlpha;
    varying float vDistance;

    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));

        // pointy core: hard edge
        float coreAlpha = dist < 0.3 ? 1.0 : 0.0;

        // soft halo: Gaussian outer core
        float haloAlpha = exp(-dist*dist*8.0);

        // combined
        float alpha = max(coreAlpha, haloAlpha) * vAlpha;
        if(alpha < 0.01) discard;

        // Color gradient: core warm, edge cold
        float t = clamp(vDistance / 350.0, 0.0, 1.0);
        vec3 centerColor = vec3(1.0, 0.9, 0.8);
        vec3 edgeColor   = vec3(0.4, 0.6, 1.0);
        vec3 finalColor = mix(centerColor, edgeColor, t);

        gl_FragColor = vec4(finalColor, alpha);
    }
`});
    }
}

//
// Point cloud
//
// TODO Should actually inherit from Renderable3D as well
export class PointCloudView extends Points {
    constructor({
        material = PointCloudMaterial.stars()
    } = {}) {
        super(new BufferGeometry(), material);
        this._positionAttribute = null;
        this._colorAttribute = null;
        this._radiusAttribute = null;
    }

    canBindTo(pointCloud) {
        return pointCloud.positionAt && pointCloud.colorAt && pointCloud.sizeAt;
    }

    initialize(pointCloud) {
        const N = pointCloud.length;
        this._positionAttribute = new BufferAttribute(new Float32Array(3 * N), 3);
        this._colorAttribute = new BufferAttribute(new Float32Array(3 * N), 3);
        this._radiusAttribute = new BufferAttribute(new Float32Array(N), 1);

        for (let i = 0; i < N; i++) {
            const p = pointCloud.positionAt(i);
            const c = pointCloud.colorAt(i);

            this._positionAttribute.setXYZ(i, p.x, p.y, p.z);
            this._colorAttribute.setXYZ(i, c.r, c.g, c.b);
            this._radiusAttribute.setX(i, pointCloud.sizeAt?.(i) ?? 1.0);
        }

        this.geometry.setAttribute('position', this._positionAttribute);
        this.geometry.setAttribute('color', this._colorAttribute);
        this.geometry.setAttribute('size', this._radiusAttribute);
    }

    synchronizeWith(pointCloud) {
        for (let i = 0; i < pointCloud.length; i++) {
            const p = pointCloud.positionAt(i);
            this._positionAttribute.setXYZ(i, p.x, p.y, p.z);
        }

        this._positionAttribute.needsUpdate = true;
    }
}

//
// Plane waves
//
class Vector extends MathPhysicsModelBehavior {
    constructor(position, axis = new Vec3())  {
        super();
        this.position = position.clone();
        this.axis = axis.clone();
    }
}

export class ElectromagneticWave extends Renderable3D {
    constructor({
        electricFieldColor = new Color("orange"),
        magneticFieldColor = new Color("cyan"),
        arrowSize = 1,
        numArrows = 100,
        scalingFunction = (position, lambda) => .5, // default: fixed scaling with increasing distance
    } = {}) {
        super();
        this._electricFieldArrows = [];
        this._magneticFieldArrows = [];
        this._electricFieldVectors = [];
        this._magneticFieldVectors = [];

        this._numArrows = numArrows;
        this._eletricFieldColor = electricFieldColor;
        this._magneticFieldColor = magneticFieldColor;
        this._arrowSize = arrowSize;
        this._scalingFunction = scalingFunction;

        // Optimization for vector calculations
        this._tempPosition = new Vector3();
        this._tempAxis = new Vector3();
        this._tempPosition = new Vector3();
        this._i_hat = new Vector3(1, 0, 0);
    }

    canBindTo(planeWave) {
        return planeWave.valueAt;
    }

    _updateFieldVectorsAt(index, wave) {
        const fieldVector = this._electricFieldVectors[index];

        // x = distance along wave
        const x = this._tempPosition.copy(fieldVector.position)
            .sub(wave.position)
            .length();

        const scaling = this._scalingFunction(fieldVector.position);
        fieldVector.axis.y = scaling * wave.valueAt(x);

        // Magnetic field (orthogonal)
        this._magneticFieldVectors[index].axis.copy(this._tempAxis.copy(fieldVector.axis).cross(this._i_hat));
    }

    synchronizeWith(wave) {
        for (let index = 0; index < this._numArrows; index++)
            this._updateFieldVectorsAt(index, wave);
        for (let index = 0; index < this._numArrows; index++)
            this._electricFieldArrows[index].synchronizeWith(this._electricFieldVectors[index]);
        for (let index = 0; index < this._numArrows; index++)
            this._magneticFieldArrows[index].synchronizeWith(this._magneticFieldVectors[index]);
    }

    initialize(planeWave) {
        const ds = planeWave.lambda / 10.0;
        const dr1 = planeWave.position.clone().normalize().multiplyScalar(ds);
        const position = planeWave.position.clone();
        for (let ct = 0; ct < this._numArrows; ct++) {
            const electricFieldArrow = new Arrow({
                color: this._eletricFieldColor,
                size: this._arrowSize,
                round: true
            });
            const magneticFieldArrow = new Arrow({
                color: this._magneticFieldColor,
                size: this._arrowSize,
                round: true
            });
            this._electricFieldVectors.push(new Vector(position));
            this._magneticFieldVectors.push(new Vector(position));
            this._magneticFieldArrows.push(magneticFieldArrow);
            this._electricFieldArrows.push(electricFieldArrow);
            this.add(electricFieldArrow, magneticFieldArrow);

            position.add(dr1);
        }
    }
}

export class OneDimensionalComplexPlaneWave3D extends Renderable3D {
    constructor({
        size = 1,
        numArrows = 70,
        round = true
    } = {}) {
        super();
        this._arrows = [];
        this._numArrows = numArrows;
        this._round = round;
        this._size = size;
        this._valueVector = new Vector(new Vector3());
    }

    canBindTo(complexPlaneWave) {
        return complexPlaneWave.valueAt;
    }

    initialize(complexPlaneWave) {
        for (let i = 0; i < this._numArrows; i++)
            this._createArrow();
    }

    _createArrow() {
        const arrow = new Arrow({
            round: this._round,
            size: this._size,
            colorMap: (axis) =>
                new Color().setHSL(1.0 - Math.atan2(axis.z, axis.y) / (2 * Math.PI), 1.0, 0.5)
        });

        this._arrows.push(arrow);
        this.add(arrow);
    }

    synchronizeWith(complexPlaneWave) {
        for (let i = 0; i < this._numArrows; i++) {
            const x = complexPlaneWave.position.x + i * 2;
            const value = complexPlaneWave.valueAt(x);
            this._valueVector.position.set(x, complexPlaneWave.position.y, complexPlaneWave.position.z);
            this._valueVector.axis.set(0, value.re, value.im);
            this._arrows[i].synchronizeWith(this._valueVector);
        }
    }
}

//
// Arrow field
//
const UP = new Vector3(0, 1, 0);

const shaftGeometryRound = new CylinderGeometry(1, 1, 1, 16);
const shaftGeometrySquare = new BoxGeometry(1, 1, 1);
const headGeometryRound = new ConeGeometry(1, 1, 16);
const headGeometrySquare = new ConeGeometry(1, 1, 4);

export class ArrowField extends Renderable3D {
    constructor({
        xRange,
        yRange,
        zRange,
        scaleFactor = 1,
        round = false,
        magnitudeMap = m => Math.log(1 + m),
        colorMap = (dir, mag) => new Color().setHSL(Math.min(Math.log(1 + mag) / 5, 1), 0.7, 0.5),
        shaftWidth = 0.08,
        headWidth = 2.0,
        headLength = 4.0,
    } = {}) {
        super();

        this._scaleFactor = scaleFactor;
        this._matrixMagnitudeMap = magnitudeMap;
        this._colorMap = colorMap;

        this._shaftWidth = shaftWidth;
        this._headWidth = headWidth;
        this._headLength = headLength;

        // ---- build positions
        this._positions = [];
        for (const x of xRange)
            for (const y of yRange)
                for (const z of zRange)
                    this._positions.push(new Vector3(x, y, z));

        const count = this._positions.length;
        const shaftGeometry = round ? shaftGeometryRound : shaftGeometrySquare;
        const headGeometry = round ? headGeometryRound : headGeometrySquare;
        const materialShaft = new MeshStandardMaterial();
        const materialHead = new MeshStandardMaterial();

        this._shaftMesh = new InstancedMesh(shaftGeometry, materialShaft, count);
        this._headMesh = new InstancedMesh(headGeometry, materialHead, count);
        this.add(this._shaftMesh, this._headMesh);

        // shared colors
        const colors = new Float32Array(count * 3);
        this._shaftMesh.instanceColor = new InstancedBufferAttribute(colors, 3);
        this._headMesh.instanceColor = this._shaftMesh.instanceColor;

        // reusable temp objects (CRUCIAL)
        this._matrix = new Matrix4();
        this._q = new Quaternion();
        this._dir = new Vector3();
        this._shape = new Vector3();

        this._shaftOffset = new Vector3();
        this._headOffset = new Vector3();
        this._target = new Vector3();
    }

    canBindTo(vectorField) {
        return vectorField.sample;
    }

    #computeSizes(length) {
        const shaftRadius = length * this._shaftWidth;
        const headLength = shaftRadius * this._headLength;
        const shaftLength = length - headLength;

        return { shaftRadius, shaftLength, headLength };
    }

    #setColor(index, dir, mag) {
        if (!this._colorMap) return;

        const c = this._colorMap(dir, mag);
        this._shaftMesh.instanceColor.setXYZ(index, c.r, c.g, c.b);
    }

    synchronizeWith(vectorField) {
        const count = this._positions.length;

        for (let i = 0; i < count; i++) {
            const pos = this._positions[i];
            vectorField.sample(pos, this._target);
            const mag = this._target.length();

            if (mag < 1e-9) {
                this._shaftMesh.setMatrixAt(i, new Matrix4().makeScale(0,0,0));
                this._headMesh.setMatrixAt(i, new Matrix4().makeScale(0,0,0));
                continue;
            }

            // Direction
            this._dir.copy(this._target).normalize();
            this._q.setFromUnitVectors(UP, this._dir);

            const visualMag = this._matrixMagnitudeMap(mag) * this._scaleFactor;
            const { shaftRadius, shaftLength, headLength } = this.#computeSizes(visualMag);

            // Shaft
            this._shaftOffset.set(0, shaftLength * 0.5, 0).applyQuaternion(this._q).add(pos);
            this._shape.set(shaftRadius, shaftLength, shaftRadius);
            this._matrix.compose(this._shaftOffset, this._q, this._shape);
            this._shaftMesh.setMatrixAt(i, this._matrix);

            // Head
            this._headOffset.set(0, shaftLength + headLength * 0.5, 0).applyQuaternion(this._q).add(pos);
            this._shape.set(shaftRadius * this._headWidth, headLength, shaftRadius * this._headWidth);
            this._matrix.compose(this._headOffset, this._q, this._shape);
            this._headMesh.setMatrixAt(i, this._matrix);

            this.#setColor(i, this._dir, mag);
        }

        this._shaftMesh.instanceMatrix.needsUpdate = true;
        this._headMesh.instanceMatrix.needsUpdate = true;
        this._shaftMesh.instanceColor.needsUpdate = true;
        this._headMesh.instanceColor.needsUpdate = true;
    }
}
