import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import {Range, Vec3} from "../../math.js";
import {DiscreteComplexField} from "../../fields.js";
import {ComplexScalarFieldRaster} from "../../../../view/2d/views.js";
import {SchrodingerSolver} from "../solvers/solvers.js";
import {Simulation} from "../../../../core/helion.js";
import {Slider} from "../../../../core/controls.js";

export class DiamondSquareOperator {
    constructor({
        roughness = 1,
        amplitude = 100
    } = {}) {
        this._roughness = roughness;
        this._amplitude = amplitude;
    }

    #diamondStep(field, step, size, scale) {
        const half = step >> 1;
        for (let x = half; x < size; x += step)
            for (let y = half; y < size; y += step) {
                const average = 0.25 * (
                    field.valueAt(x - half, y - half) +
                    field.valueAt(x + half, y - half) +
                    field.valueAt(x - half, y + half) +
                    field.valueAt(x + half, y + half)
                );

                field.setValueAt(x, y, average + this.#random(scale));
            }
    }

    #squareStep(field, step, size, scale) {
        const half = step >> 1;
        for (let x = 0; x <= size; x += half)
            for (let y = (x + half) % step; y <= size; y += step) {
                let sum = 0;
                let count = 0;

                if (x >= half) {
                    sum += field.valueAt(x - half, y);
                    count++;
                }

                if (x + half <= size) {
                    sum += field.valueAt(x + half, y);
                    count++;
                }

                if (y >= half) {
                    sum += field.valueAt(x, y - half);
                    count++;
                }

                if (y + half <= size) {
                    sum += field.valueAt(x, y + half);
                    count++;
                }

                field.setValueAt(x, y, sum / count + this.#random(scale));
            }

    }

    apply(field) {
        const size = field.nx - 1;

        // corners
        field.setValueAt(0, 0, 0);
        field.setValueAt(size, 0, 0);
        field.setValueAt(0, size, 0);
        field.setValueAt(size, size, 0);

        let step = size;
        let scale = this._amplitude;

        while (step > 1) {
            this.#diamondStep(field, step, size, scale);
            this.#squareStep(field, step, size, scale);
            step >>= 1;
            scale *= Math.pow(2, -this._roughness);
        }
    }

    #random(scale) { return (Math.random() * 2 - 1) * scale; }
}

export class GaussianImpulse {
    constructor({
        centerX = 100,
        centerY = 100,
        amplitude = 1,
        sigma = 3
    } = {}) {
        this._centerX = centerX;
        this._centerY = centerY;
        this._sigma = sigma;
        this._amplitude = amplitude;
    }

    apply(field) {
        const sigma2 = this._sigma * this._sigma;
        for (let i = this._centerX - 5; i <= this._centerX + 5; i++)
            for (let j = this._centerY - 5; j <= this._centerY + 5; j++) {
                if (i < 0 || j < 0 || i >= field.nx || j >= field.ny)
                    continue;

                const dx = i - this._centerX;
                const dy = j - this._centerY;
                const value = this._amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma2));
                field.setValueAt(i, j, field.valueAt(i, j) + value);
            }
    }
}

export class GaussianImpulseComplex2D {
    constructor({
        wavePacketEnergy=0.05,
        packetWidth = 48
    } = {}) {
        this._packetWidth = packetWidth;
        this._wavePacketEnergy = wavePacketEnergy;
    }

    set wavePacketEnergy(wavePacketEnergy) { this._wavePacketEnergy = wavePacketEnergy; }

    apply(field) {
        const packetWidth2 = this._packetWidth * this._packetWidth;
        const centerX = Math.floor(field.nx * 0.22);
        const centerY = field.nx * .5;
        const e = this._wavePacketEnergy;
        const kx = Math.sqrt(2 * e);
        const ky = 0;
        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const i = y * field.ny + x;
                const envelope = Math.exp(-(x-centerX)*(x-centerX)/ packetWidth2) *
                    Math.exp(-(y-centerY)*(y-centerY)/ packetWidth2);
                field.real[i] = envelope * (Math.cos(kx*x)*Math.cos(ky*y) - Math.sin(kx*x)*Math.sin(ky*y));
                field.imag[i] = envelope * (Math.cos(kx*x)*Math.sin(ky*y) + Math.sin(kx*x)*Math.cos(ky*y));
            }
    }
}

export class PerlinNoiseOperator {
    constructor({
        scale = 50,
        frequency = 0.02,
        octaves = 6,
        persistence = 0.5,
        z = 0
    } = {}) {
        this._scale = scale;
        this._frequency = frequency;
        this._octaves = octaves;
        this._persistence = persistence;
        this._z = z;

        this._noise = new ImprovedNoise();
    }

    apply(field) {
        for (let x = 0; x < field.nx; x++)
            for (let y = 0; y < field.ny; y++) {
                let value = 0;
                let amplitude = 1;
                let frequency = this._frequency;
                let amplitudeSum = 0;

                for (let octave = 0; octave < this._octaves; octave++) {
                    value += amplitude * this._noise.noise(x * frequency, y * frequency, this._z);
                    amplitudeSum += amplitude;
                    amplitude *= this._persistence;
                    frequency *= 2;
                }

                value /= amplitudeSum;
                field.setValueAt(x, y, value * this._scale);
            }
    }
}

export class DoubleSlitOperator {
    constructor({
                    wavelength = 525,
                    positionSlit1 = new Vec3(),
                    positionSlit2 = new Vec3(),
                }) {
        this._wavelength = wavelength;
        this._positionSlit1 = positionSlit1;
        this._positionSlit2 = positionSlit2;
    }

    apply(field) {
        const pos = new Vec3();
        for (let i = 0; i < field.nx; i++)
            for (let j = 0; j < field.nx; j++) {
                const x = (i - field.nx * .5);
                const y = (j - field.ny * .5);
                pos.set(x, y, 0);
                const r1 = pos.distanceTo(this._positionSlit1);
                const r2 = pos.distanceTo(this._positionSlit2);
                const pathDiff = Math.abs(r1 - r2);
                const rAverage = (r1 + r2) * 0.5;
                const envelope = 1 / (1 + 0.1 * rAverage);
                const factor = Math.cos(Math.PI * pathDiff * 25 / this._wavelength);
                field.setValueAt(i, j, factor * factor * envelope);
            }
    }

    set wavelength(wavelength) { this._wavelength = wavelength; }
}

//
// js/fft-esm.js
// ESM-versie van fft.js suitable for browser
//
export class FFT {
    constructor(size) {
        this._size = size | 0;
        if (this._size <= 1) throw new Error("Size must be > 1");

        this._twiddles = new Array(this._size);
        for (let i = 0; i < this._size; i++) {
            const phase = -2 * Math.PI * i / this._size;
            this._twiddles[i] = [Math.cos(phase), Math.sin(phase)];
        }

        this._bitReverse = new Array(this._size);
        const n = this._size;
        const bits = Math.floor(Math.log2(n));
        for (let i = 0; i < n; i++) {
            let x = i;
            let y = 0;
            for (let j = 0; j < bits; j++) {
                y = (y << 1) | (x & 1);
                x >>= 1;
            }
            this._bitReverse[i] = y;
        }
    }

    transform(outRe, outIm, inRe, inIm) {
        const n = this._size;
        for (let i = 0; i < n; i++) {
            outRe[i] = inRe[this._bitReverse[i]];
            outIm[i] = inIm[this._bitReverse[i]];
        }

        for (let size = 2; size <= n; size <<= 1) {
            const half = size >> 1;
            const step = n / size;
            for (let i = 0; i < n; i += size) {
                for (let j = 0; j < half; j++) {
                    const k = j * step;
                    const [twRe, twIm] = this._twiddles[k];
                    const l = i + j;
                    const r = i + j + half;

                    const tRe = outRe[r] * twRe - outIm[r] * twIm;
                    const tIm = outRe[r] * twIm + outIm[r] * twRe;

                    outRe[r] = outRe[l] - tRe;
                    outIm[r] = outIm[l] - tIm;
                    outRe[l] += tRe;
                    outIm[l] += tIm;
                }
            }
        }
    }

    inverseTransform(outRe, outIm, inRe, inIm) {
        const n = this._size;
        // conjugate
        const tempRe = inRe.slice();
        const tempIm = inIm.map(x => -x);
        this.transform(outRe, outIm, tempRe, tempIm);
        // normalize and conjugate back
        for (let i = 0; i < n; i++) {
            outRe[i] /= n;
            outIm[i] = -outIm[i] / n;
        }
    }

    static fftShift2D(field) {
        const N = field.size;
        const half = N >> 1;

        const real = new Float32Array(N * N);
        const imag = new Float32Array(N * N);

        for (let j = 0; j < N; j++)
            for (let i = 0; i < N; i++) {
                const src = ((j + half) % N) * N + ((i + half) % N);
                const dst = j * N + i;
                real[dst] = field.real[src];
                imag[dst] = field.imag[src];
            }

        field.real = real;
        field.imag = imag;
    }

    static fft2D(gridField) {
        const N = gridField.size;
        const fft = new FFT(N);

        // rows
        for (let row = 0; row < N; row++) {
            const offset = row * N;
            const inRe = gridField.real.slice(offset, offset + N);
            const inIm = gridField.imag.slice(offset, offset + N);
            const outRe = new Float32Array(N);
            const outIm = new Float32Array(N);

            fft.transform(outRe, outIm, inRe, inIm);

            gridField.real.set(outRe, offset);
            gridField.imag.set(outIm, offset);
        }

        // columns
        for (let j = 0; j < N; j++) {
            const colRe = new Array(N);
            const colIm = new Array(N);

            for (let i = 0; i < N; i++) {
                colRe[i] = gridField.real[i * N + j];
                colIm[i] = gridField.imag[i * N + j];
            }

            const outRe = new Array(N);
            const outIm = new Array(N);

            fft.transform(outRe, outIm, colRe, colIm);

            for (let i = 0; i < N; i++) {
                gridField.real[i * N + j] = outRe[i];
                gridField.imag[i * N + j] = outIm[i];
            }
        }
    }
}

export class LaplaceOperator {
    static at(field, i, j) {
        return (
            field.valueAt(i + 1, j) +
            field.valueAt(i - 1, j) +
            field.valueAt(i, j + 1) +
            field.valueAt(i, j - 1) -
            4 * field.valueAt(i, j)
        );
    }
}