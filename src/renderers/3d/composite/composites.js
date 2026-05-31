import {
    Group, Vector3, Color, Points, ShaderMaterial, AdditiveBlending, BufferAttribute, BufferGeometry
} from "three";
import { Arrow } from "../primitives/primitives.js";
import { VectorFieldVector, ComplexScalarFieldValue, Complex} from "../../../math/math.js";

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

export class PointCloudView extends Points {
    constructor({
        material = PointCloudMaterial.stars()
    } = {}) {
        super(new BufferGeometry(), material);
        this._pointCloud = null;
        this._positionAttribute = null;
        this._colorAttribute = null;
        this._radiusAttribute = null;
    }

    attachTo(pointCloud) {
        // Sanity checks
        if (!pointCloud.positionAt || !pointCloud.colorAt || !pointCloud.sizeAt)
            throw new Error("Body does not behave like a point cloud, hence it cannot be attached to this view.");

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

        this._pointCloud = pointCloud;
    }

    render() {
        for (let i = 0; i < this._pointCloud.length; i++) {
            const p = this._pointCloud.positionAt(i);
            this._positionAttribute.setXYZ(i, p.x, p.y, p.z);
        }

        this._positionAttribute.needsUpdate = true;
    }
}

//
// Plane waves
//
export class ElectromagneticWave extends Group {
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

        this._planeWave = null;
    }

    attachTo(planeWave) {
        // Sanity checks
        if (!planeWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._planeWave = planeWave;
        this._createEmWaveFor(planeWave);
    }

    _updateFieldVectorAt(index) {
        const fieldVector = this._electricFieldArrows[index].body;

        // x = distance along wave
        const x = this._tempPosition.copy(fieldVector.position)
            .sub(this._planeWave.position)
            .length();

        // Field vectors haven't been added to the renderer by the application, so we need to sync state here:
        const scaling = this._scalingFunction(fieldVector.position);
        fieldVector.axis.y = scaling * this._planeWave.valueAt(x);

        // Magnetic field (orthogonal)
        this._magneticFieldArrows[index].body.axis.copy(
            this._tempAxis.copy(fieldVector.axis).cross(this._i_hat)
        );
    }

    render() {
        for (let index = 0; index < this._electricFieldArrows.length; index++)
            this._updateFieldVectorAt(index);
        for (const arrow of this._electricFieldArrows)
            arrow.render();
        for (const arrow of this._magneticFieldArrows)
            arrow.render();
    }

    _createEmWaveFor(planeWave) {
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
            electricFieldArrow.attachTo(new VectorFieldVector({position}));
            magneticFieldArrow.attachTo(new VectorFieldVector({position}));
            this._magneticFieldArrows.push(magneticFieldArrow);
            this._electricFieldArrows.push(electricFieldArrow);
            this.add(electricFieldArrow, magneticFieldArrow);

            position.add(dr1);
        }
    }
}

export class OneDimensionalComplexPlaneWave3D extends Group {
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
        this._complexPlaneWave = null;
    }

    attachTo(complexPlaneWave) {
        // Sanity checks
        if (!complexPlaneWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._complexPlaneWave = complexPlaneWave;

        const position = new Vector3().copy(complexPlaneWave.position);
        for (let i = 0; i < this._numArrows; i++)
            this._createArrowAt(position, i * 2);
    }

    _createArrowAt(position, index) {
        const x = position.x + index;
        const arrow = new Arrow({
            round: this._round,
            size: this._size,
            colorMap: (axis) => new Color().setHSL(1.0 - new Complex(axis.z, axis.y).phase / (2 * Math.PI), 1.0, 0.5)
        });

        arrow.attachTo(new ComplexScalarFieldValue({ position: new Vector3(x, position.y, position.z) }));
        this._arrows.push(arrow);
        this.add(arrow);
    }

    render() {
        for (let arrow of this._arrows)
            arrow.body.value = this._complexPlaneWave.valueAt(arrow.body.position.x);

        for (let arrow of this._arrows)
            arrow.render();
    }
}