import { Color, Points, BufferGeometry, BufferAttribute, ShaderMaterial, AdditiveBlending } from 'three';
import { Renderable3D } from '../renderer.js';

export class WaveFunctionOrbital3D extends Renderable3D {
    static vertexShader = `
        attribute vec3 color;
        attribute float alpha;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vColor = color;
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / max(1.0, length(mvPosition.xyz)));
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    static fragmentShader = `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            float softness = exp(-distanceToCenter * distanceToCenter * 14.0);
            float alpha = softness * vAlpha;

            if (alpha < 0.01)
                discard;

            gl_FragColor = vec4(vColor, alpha);
        }
    `;

    constructor({
        colorMapper = null,
        pointSize = 4,
        threshold = 0.015,
        brightness = 1.5
    } = {}) {
        super();
        this._colorMapper = colorMapper;
        this._pointSize = pointSize;
        this._threshold = threshold;
        this._brightness = brightness;
        this._mesh = null;
        this._colors = null;
        this._alphas = null;
    }

    canBindTo(field) {
        return field.nx !== undefined &&
            field.ny !== undefined &&
            field.nz !== undefined &&
            field.real !== undefined &&
            field.imag !== undefined;
    }

    initialize(field) {
        this.dispose();

        const count = field.nx * field.ny * field.nz;
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
        this._colors = new Float32Array(count * 3);
        this._alphas = new Float32Array(count);

        geometry.setAttribute('color', new BufferAttribute(this._colors, 3));
        geometry.setAttribute('alpha', new BufferAttribute(this._alphas, 1));
        geometry.setAttribute('size', new BufferAttribute(new Float32Array(count).fill(this._pointSize), 1));

        const material = new ShaderMaterial({
            vertexShader: WaveFunctionOrbital3D.vertexShader,
            fragmentShader: WaveFunctionOrbital3D.fragmentShader,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            uniforms: {}
        });

        this._mesh = new Points(geometry, material);
        this.add(this._mesh);
    }

    synchronizeWith(field) {
        let maximum = 0;
        for (let i = 0; i < field.real.length; i++)
            maximum = Math.max(maximum, Math.hypot(field.real[i], field.imag[i]));

        maximum = Math.max(maximum, Number.EPSILON);

        const xOffset = (field.nx - 1) / 2;
        const yOffset = (field.ny - 1) / 2;
        const zOffset = (field.nz - 1) / 2;
        const scale = field.spacing ?? 1;

        const positions = this._mesh.geometry.attributes.position;
        const colors = this._mesh.geometry.attributes.color;
        const alphas = this._mesh.geometry.attributes.alpha;

        let index = 0;
        const color = new Color();

        for (let z = 0; z < field.nz; z++)
            for (let y = 0; y < field.ny; y++)
                for (let x = 0; x < field.nx; x++) {
                    const i = field.index(x, y, z);
                    const real = field.real[i];
                    const imag = field.imag[i];
                    const modulus = Math.hypot(real, imag);
                    const normalized = modulus / maximum;

                    positions.setXYZ(
                        index,
                        (x - xOffset) * scale,
                        (y - yOffset) * scale,
                        (z - zOffset) * scale
                    );

                    // Phase: positive and negative real lobes naturally get different hues.
                    const phase = Math.atan2(imag, real) / (2 * Math.PI);
                    const hue = (phase + 0.65) % 1;
                    color.setHSL(hue, 1, 0.5);
                    colors.setXYZ(index, color.r, color.g, color.b);

                    alphas.setX(
                        index,
                        normalized < this._threshold
                            ? 0
                            : Math.pow((normalized - this._threshold) / (1 - this._threshold), 0.7) * 0.85
                    );

                    index++;
                }

        positions.needsUpdate = true;
        colors.needsUpdate = true;
        alphas.needsUpdate = true;
    }

    dispose() {
        if (!this._mesh)
            return;

        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._mesh.material.dispose();
        this._mesh = null;
        this._colors = null;
        this._alphas = null;
    }
}
