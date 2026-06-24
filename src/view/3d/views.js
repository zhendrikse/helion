import {Mesh, PlaneGeometry, DoubleSide, ShaderMaterial,
    BufferAttribute, BoxGeometry, MeshBasicMaterial, InstancedMesh, Object3D
} from "three";

import {hsvToRgbNormalized, Renderable3D} from "../../../src/index.js";
import { Complex } from "../../model/math/math.js";

//
// SHADER VERSION WHICH STANDS PERPENDICULAR TO THE PLANE
//
// export class ComplexScalarFieldSurfaceRaster extends Renderable3D {
//     constructor({
//                     width = 200,
//                     height = 200,
//                     zScale = 40
//                 } = {}) {
//         super();
//
//         this._width = width;
//         this._height = height;
//         this._zScale = zScale;
//
//         const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
//
//         // extra attributes (belangrijk!)
//         const count = geometry.attributes.position.count;
//
//         this._phase = new Float32Array(count);
//         this._magnitude = new Float32Array(count);
//
//         geometry.setAttribute("phase", new BufferAttribute(this._phase, 1));
//         geometry.setAttribute("magnitude", new BufferAttribute(this._magnitude, 1));
//
//         const material = new ShaderMaterial({
//             transparent: true,
//             depthWrite: false,
//
//             uniforms: {
//                 zScale: { value: this._zScale }
//             },
//
//             vertexShader: `
//                 attribute float phase;
//                 attribute float magnitude;
//
//                 varying float vPhase;
//                 varying float vMag;
//
//                 uniform float zScale;
//
//                 void main() {
//                     vPhase = phase;
//                     vMag = magnitude;
//
//                     vec3 pos = position;
//                     // float x = pos.x;
//                     // float y = pos.y;
//                     // float z = pos.z;
//                     //
//                     // pos.z = y;
//                     // pos.y = log(1.0 + 20.0 * magnitude) * zScale;
//
//                     // hoogte uit magnitude
//                     pos.z = log(1.0 + 20.0 * magnitude) * zScale;
//
//                     gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
//                 }
//             `,
//
//             fragmentShader: `
//                 precision highp float;
//
//                 varying float vPhase;
//                 varying float vMag;
//
//                 // HSV → RGB
//                 vec3 hsv2rgb(vec3 c) {
//                     vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
//                     vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
//                     return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
//                 }
//
//                 void main() {
//
//                     // phase [-pi, pi] -> [0,1]
//                     float h = (vPhase + 3.1415926) / (6.2831853);
//
//                     vec3 color = hsv2rgb(vec3(h, 1.0, 1.0));
//
//                     // simpele lighting (optioneel)
//                     float light = 0.75 + 0.25 * cos(vPhase);
//
//                     // alpha uit magnitude
//                     float alpha = tanh(3.0 * vMag);
//
//                     gl_FragColor = vec4(color * light, alpha);
//                 }
//             `
//         });
//
//         this._mesh = new Mesh(geometry, material);
//         this.add(this._mesh);
//
//         this._geometry = geometry;
//     }
//
//     canBindTo(field) {
//         return field.sample && field.nx && field.ny;
//     }
//
//     synchronizeWith(field) {
//         const phase = this._geometry.attributes.phase.array;
//         const mag = this._geometry.attributes.magnitude.array;
//
//         let i = 0;
//
//         for (let y = 0; y < field.ny; y++) {
//             for (let x = 0; x < field.nx; x++) {
//
//                 const idx = y * field.nx + x;
//
//                 const re = field.real[idx];
//                 const im = field.imag[idx];
//
//                 const m = Math.sqrt(re * re + im * im);
//                 const p = Math.atan2(im, re);
//
//                 phase[i] = p;
//                 mag[i] = m;
//
//                 i++;
//             }
//         }
//
//         this._geometry.attributes.phase.needsUpdate = true;
//         this._geometry.attributes.magnitude.needsUpdate = true;
//     }
// }

export class ComplexScalarFieldSurfaceRaster extends Renderable3D {
    static vertexShader = `
        attribute vec3 color;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
            vColor = color;
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `;
    static fragmentShader = `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uBrightness;
        
        void main() {
            float a = vAlpha * uBrightness;
            if (a < 0.01) discard;
            vec3 color = vColor;
            float alpha = vAlpha * uBrightness;            
            gl_FragColor = vec4(color, alpha);
        }
        `;
    constructor({
        width = 200,
        height = 200,
        zScale = 20,
        showPhaseColor = true,
        brightness = 1
    } = {}) {
        super();
        this._showPhaseColor = showPhaseColor;
        this._width = width;
        this._height = height;
        this._brightness = brightness;
        this._zScale = zScale;
        this._complexValue = new Complex();

        const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
        const material = new ShaderMaterial({
            vertexShader: ComplexScalarFieldSurfaceRaster.vertexShader,
            fragmentShader: ComplexScalarFieldSurfaceRaster.fragmentShader,
            transparent: true,
            //side: DoubleSide,
            uniforms: {
                uBrightness: { value: this._brightness }
            }
        });

        this._mesh = new Mesh(geometry, material);
        this.add(this._mesh);

        this._positions = geometry.attributes.position;
        this._colors = new Float32Array(this._positions.count * 3);
        this._alphas = new Float32Array(this._positions.count);

        geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
        geometry.setAttribute("alpha", new BufferAttribute(this._alphas, 1));
    }

    set phaseColor(showPhaseColor) { this._showPhaseColor = showPhaseColor; }
    set zScale(value) { this._zScale = value; }
    get zScale() { return this._zScale; }

    synchronizeWith(field) {
        const pos = this._positions;
        const pi2 = Math.PI * 2;
        let index = 0;

        for (let y = 0; y < field.ny; y++) {
            for (let x = 0; x < field.nx; x++) {
                field.valueAt(x, y, this._complexValue);
                const mag = this._complexValue.magnitude;
                const phase = this._complexValue.phase;
                const i = field.index(x, y);

                // HEIGHT (surface deformation)
                const height = Math.log(1 + 20 * mag);
                pos.setXYZ(i, x - this._width/2, height *  this._zScale, y - this._height/2);

                // PHASE → color
                const hue = this._showPhaseColor ? (phase + Math.PI) / pi2 : 0.1;
                const rgb = hsvToRgbNormalized(hue, 0.55, 1.0);

                const lighting = 0.6 + 0.4 * Math.cos(phase);
                const intensity = Math.pow(mag, 0.35) * lighting;
                this._colors[index]     = rgb.r * intensity;
                this._colors[index + 1] = rgb.g * intensity;
                this._colors[index + 2] = rgb.b * intensity;

                // MAGNITUDE → alpha
                this._alphas[i] = Math.tanh(3.0 * mag);

                index += 3;
            }
        }

        this._positions.needsUpdate = true;
        this._mesh.geometry.attributes.color.needsUpdate = true;
        this._mesh.geometry.attributes.alpha.needsUpdate = true;
    }

    canBindTo(field) {
        return field.valueAt && field.nx && field.ny;
    }
}

//
// PLAIN VANILLA THREE.JS VERSION
//
// export class ComplexScalarFieldSurfaceRaster extends Renderable3D {
//     constructor({
//                     width = 200,
//                     height = 200,
//                     scale = 20,
//                     zScale = 40,
//                     showPhaseColor = true,
//                     brightness = 1
//                 } = {}) {
//         super();
//         this._width = width;
//         this._height = height;
//         this._scale = scale;
//         this._zScale = zScale;
//         this._phaseColor = showPhaseColor;
//         this._brightness = brightness;
//         this._numColors = 256;
//         this._hsvTable = new Array(this._numColors);
//         for (let i = 0; i < this._numColors; i++) {
//             this._hsvTable[i] = hsvToRgb(i / this._numColors, 1.0, 1.0);
//         }
//
//         // subdivided plane
//         const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
//         const material = new MeshPhongMaterial({
//             vertexColors: true,
//             side: DoubleSide,
//             transparent: true
//         });
//
//         this._mesh = new Mesh(geometry, material);
//         this.add(this._mesh);
//         this._positions = geometry.attributes.position;
//         this._colors = new Float32Array(this._positions.count * 3);
//         geometry.setAttribute("color", new BufferAttribute(this._colors, 3));
//     }
//
//     canBindTo(field) {
//         return field.sample && field.nx && field.ny;
//     }
//
//     synchronizeWith(field) {
//         const pos = this._positions;
//         let idx = 0;
//
//         for (let y = 0; y < field.ny; y++)
//             for (let x = 0; x < field.nx; x++) {
//                 const i = y * field.nx + x;
//                 const re = field.real[i];
//                 const im = field.imag[i];
//                 const mag = Math.sqrt(re * re + im * im);
//                 const phase = Math.atan2(im, re);
//
//                 // Height is real part
//                 pos.setXYZ(i, x - this._width / 2, re * this._zScale, y - this._height / 2);
//
//                 // Color is phase
//                 const phaseIndex = Math.floor(((phase + Math.PI) / (2 * Math.PI)) * this._numColors);
//                 const rgb = this._hsvTable[Math.max(0, Math.min(this._numColors - 1, phaseIndex))];
//                 this._colors[idx++] = rgb.r * mag * this._brightness;
//                 this._colors[idx++] = rgb.g * mag * this._brightness;
//                 this._colors[idx++] = rgb.b * mag * this._brightness;
//             }
//
//         this._positions.needsUpdate = true;
//         this._mesh.geometry.attributes.color.needsUpdate = true;
//     }
// }


export class PotentialField3DRaster extends Renderable3D {
    constructor({
        width = 200,
        height = 200,
        heightScale = 100,
        color = 0xff0033,
        opacity = 0.35
    }) {
        super();

        this._heightScale = heightScale;
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({
            transparent: true,
            opacity,
            color
        });

        this._mesh = new InstancedMesh(geometry, material, width * height);
        this.add(this._mesh);
        this._dummy = new Object3D();
    }

    canBindTo(field) {
        return field.valueAt && field.nx && field.ny;
    }

    synchronizeWith(field) {
        let index = 0;

        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const v = field.valueAt(x, y);

                // skip empty space → HUGE performance win
                if (v === 0) {
                    this._dummy.scale.set(0, 0, 0);
                    this._dummy.updateMatrix();
                    this._mesh.setMatrixAt(index++, this._dummy.matrix);
                    continue;
                }

                this._dummy.position.set(x - field.nx / 2, v, y - field.ny / 2);
                this._dummy.scale.set(1, this._heightScale, 1);
                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index++, this._dummy.matrix);
            }

        this._mesh.instanceMatrix.needsUpdate = true;
    }
}