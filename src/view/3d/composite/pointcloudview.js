import {
    AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage,
    Points, ShaderMaterial
} from "three";

import { Renderable3D } from "../../renderer.js";
import { PointCloud } from "../../../model/phys/clouds.js";
import { Colour } from "../../colormappers.js";

//
// Point cloud materials
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
                varying vec3 vColor;
                varying float vAlpha;

                float rand(vec2 co) {
                    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(position);

                    vColor = color;
                    float randomFactor = 0.8 + 0.2 * rand(position.xy);
                    float haloFactor = smoothstep(0.0, 150.0, dist);
                    vAlpha = randomFactor * (1.0 - smoothstep(0.0, 500.0, dist)) * haloFactor;

                    gl_PointSize = size * (750.0 / (length(mvPosition.xyz) + 1.0));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    float coreAlpha = dist < 0.3 ? 1.0 : 0.0;
                    float haloAlpha = exp(-dist * dist * 8.0);
                    float alpha = max(coreAlpha, haloAlpha) * vAlpha;

                    if(alpha < 0.01)
                        discard;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `
        });
    }
}

//
// Point cloud view
//
export class PointCloudView extends Renderable3D {
    /**
     * @param {{
     *     material?: ShaderMaterial,
     *     colorMapper?: (pointCloud: PointCloud, index: number, color: Colour) => void,
     *     sizeMapper?: (pointCloud: PointCloud, index: number) => number
     * }} [options]
     */
    constructor({
        material = PointCloudMaterial.stars(),
        colorMapper = (pointCloud, index, color) => {
            const sourceColor = pointCloud.colorAt?.(index);
            if (sourceColor)
                color.copy(sourceColor);
            else
                color.setRGB(1, 1, 1);
        },
        sizeMapper = (pointCloud, index) => pointCloud.sizeAt?.(index) ?? 1
    } = {}) {
        super();

        this._material = material;
        this._colorMapper = colorMapper;
        this._sizeMapper = sizeMapper;

        this._geometry = new BufferGeometry();
        this._points = new Points(this._geometry, this._material);
        this.add(this._points);

        this._capacity = 0;
        this._positionAttribute = null;
        this._colorAttribute = null;
        this._sizeAttribute = null;
        this._color = new Colour();
    }

    /** @param {PointCloud} pointCloud */
    canBindTo(pointCloud) {
        return pointCloud.positionAt !== undefined && pointCloud.length !== undefined;
    }

    /** @param {PointCloud} pointCloud */
    initialize(pointCloud) {
        this.#allocateBuffers(Math.max(1, pointCloud.length));
    }

    /** @param {number} capacity */
    #allocateBuffers(capacity) {
        this._capacity = capacity;

        this._positionAttribute = new BufferAttribute(new Float32Array(3 * capacity), 3)
            .setUsage(DynamicDrawUsage);
        this._colorAttribute = new BufferAttribute(new Float32Array(3 * capacity), 3)
            .setUsage(DynamicDrawUsage);
        this._sizeAttribute = new BufferAttribute(new Float32Array(capacity), 1)
            .setUsage(DynamicDrawUsage);

        this._geometry.setAttribute('position', this._positionAttribute);
        this._geometry.setAttribute('color', this._colorAttribute);
        this._geometry.setAttribute('size', this._sizeAttribute);
    }

    /** @param {PointCloud} pointCloud */
    synchronizeWith(pointCloud) {
        const count = pointCloud.length;

        if (count > this._capacity)
            this.#allocateBuffers(Math.max(count, Math.ceil(this._capacity * 1.5)));

        for (let i = 0; i < count; i++) {
            const position = pointCloud.positionAt(i);
            this._positionAttribute.setXYZ(i, position.x, position.y, position.z);

            this._colorMapper(pointCloud, i, this._color);
            this._colorAttribute.setXYZ(i, this._color.r, this._color.g, this._color.b);
            this._sizeAttribute.setX(i, this._sizeMapper(pointCloud, i));
        }

        this._geometry.setDrawRange(0, count);
        this._positionAttribute.needsUpdate = true;
        this._colorAttribute.needsUpdate = true;
        this._sizeAttribute.needsUpdate = true;
        this._geometry.computeBoundingSphere();
    }

    reset() {
        this._geometry.setDrawRange(0, 0);
    }

    dispose() {
        this._geometry.dispose();
        this._material.dispose();
        this.remove(this._points);
        this._points = null;
        this.clear();
    }
}
