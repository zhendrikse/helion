
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
        const N = field.real.length;
        const half = N >> 1;
        const real =  Array.from({ length: N },() => new Float32Array(N));
        const imag = Array.from({ length: N },() => new Float32Array(N));

        for (let i = 0; i < N; i++)
            for (let j = 0; j < N; j++) {
                real[i][j] = field.real[(i + half) % N][(j + half) % N];
                imag[i][j] = field.imag[(i + half) % N][(j + half) % N];
            }

        field.real = real;
        field.imag = imag;
    }

    static fft2D(gridField) {
        const size = gridField.real.length;
        const fft = new FFT(size);
        // rows
        for (let i = 0; i < size; i++)
            fft.transform(gridField.real[i], gridField.imag[i], gridField.real[i].slice(), gridField.imag[i].slice());

        // columns
        for (let j = 0; j < size; j++) {
            const colRe = new Array(size);
            const colIm = new Array(size);

            for (let i = 0; i < size; i++) {
                colRe[i] = gridField.real[i][j];
                colIm[i] = gridField.imag[i][j];
            }

            const outRe = new Array(size);
            const outIm = new Array(size);

            fft.transform(outRe, outIm, colRe, colIm);

            for (let i = 0; i < size; i++) {
                gridField.real[i][j] = outRe[i];
                gridField.imag[i][j] = outIm[i];
            }
        }
    }
}
