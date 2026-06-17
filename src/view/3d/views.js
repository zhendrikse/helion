import {Mesh, PlaneGeometry, ShaderMaterial, DoubleSide,
    BufferAttribute, BoxGeometry, MeshBasicMaterial, InstancedMesh, Object3D
} from "three";

import { Renderable3D } from "../renderer.js";
import { hsvToRgbNormalized} from "../colormappers.js";

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

        const geometry = new PlaneGeometry(width, height, width - 1, height - 1);
        const material = new ShaderMaterial({
            vertexShader: ComplexScalarFieldSurfaceRaster.vertexShader,
            fragmentShader: ComplexScalarFieldSurfaceRaster.fragmentShader,
            transparent: true,
            side: DoubleSide,
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
    set brightness(brightness) { this._brightness = brightness; }

    synchronizeWith(field) {
        const pos = this._positions;
        const pi2 = Math.PI * 2;
        let index = 0;

        for (let y = 0; y < field.ny; y++) {
            for (let x = 0; x < field.nx; x++) {
                const i = y * field.nx + x;
                const re = field.real[i];
                const im = field.imag[i];
                const mag = Math.sqrt(re * re + im * im);
                const phase = Math.atan2(im, re);

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
        return field.sample && field.nx && field.ny;
    }
}

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
        return field.sample && field.nx && field.ny;
    }

    synchronizeWith(field) {
        let index = 0;

        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const i = y * field.nx + x;
                const v = field._data[i];

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