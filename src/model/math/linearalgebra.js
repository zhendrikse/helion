import { Transformation } from '../behavior.js';
import { Vec2, Vec3 } from './objects.js';

/**
 * @param {number} start
 * @param {number} stop
 * @param {number} num
 * @returns {number[]}
 */
export function linspace(start, stop, num) {
    const linSpace = [];
    const step = (stop - start) / (num - 1);
    for (let i = 0; i < num; i++)
        linSpace.push(start + i * step);
    return linSpace;
}

/**
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number[][]}
 */
export function meshgrid(x, y) {
    const X = [];
    const Y = [];

    for (let i = 0; i < y.length; i++) {
        X.push(x.slice());
        Y.push(Array(x.length).fill(y[i]));
    }

    return [X, Y];
}

export class Matrix2D extends Transformation {
    static Identity = new Matrix2D(1, 0, 0, 1);

    /**
     * @param {number} a
     * @param {number} b
     * @param {number} c
     * @param {number} d
     */
    constructor(a, b, c, d) {
        super();
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    /** @param {Matrix2D} fromOtherMatrix */
    copy(fromOtherMatrix) {
        this.a = fromOtherMatrix.a;
        this.b = fromOtherMatrix.b;
        this.c = fromOtherMatrix.c;
        this.d = fromOtherMatrix.d;
    }

    applyTo(vector) {
        const x = vector.x;
        const y = vector.y;
        vector.set(this.a * x + this.b * y, this.c * x + this.d * y, vector.z);
        return vector;
    }

    get trace() { return this.a + this.d; }
    get determinant() { return this.a * this.d - this.b * this.c; }

    /**
     * Calculate the real eigenvalues and eigenvectors.
     * If there are no real eigenvalues, an empty array is returned.
     * @param {number} scaleFactor
     * @returns
     * [
     *     { value: lambda1, vector: Vec2 },
     *     { value: lambda2, vector: Vec2 }
     * ]
     */
    eigenvectors(scaleFactor = 1) {
        // Characteristic equation: λ² - (a+d)λ + (ad-bc) = 0
        const discriminant = this.trace * this.trace - 4 * this.determinant;

        // No real eigenvalues.
        if (discriminant < 0)
            return [];

        const sqrtDiscriminant = Math.sqrt(discriminant);
        const lambda1 = (this.trace + sqrtDiscriminant) / 2;
        const lambda2 = (this.trace - sqrtDiscriminant) / 2;

        const result = [];
        const vectorFor = lambda => {
            const epsilon = 1e-10;

            /*
             * Solve: (A - λI)v = 0
             *
             *      [a-λ   b]
             *      [ c   d-λ]
             *
             * A convenient solution is: v = (-b, a-λ) unless that vector is zero.
             */
            let x = -this.b;
            let y = this.a - lambda;

            if (Math.abs(x) < epsilon && Math.abs(y) < epsilon) {
                // Try the other row.
                x = this.d - lambda;
                y = -this.c;
            }

            const length = Math.sqrt(x * x + y * y);
            if (length < epsilon)
                return null;

            return new Vec3(x, y, 0).divideScalar(length);
        };

        const v1 = vectorFor(lambda1);
        if (v1)
            result.push({ value: lambda1, vector: v1.multiplyScalar(scaleFactor) });

        // For a repeated eigenvalue we don't want to draw the same eigenvector twice.
        if (Math.abs(lambda1 - lambda2) > 1e-10) {
            const v2 = vectorFor(lambda2);

            if (v2)
                result.push({ value: lambda2, vector: v2.multiplyScalar(scaleFactor) });
        }

        return result;
    }
}

export class RotationMatrix2D extends Matrix2D {
    static Identity = new RotationMatrix2D(1, 0, 0, 1);
    static fromAngle = (angle) =>
        new RotationMatrix2D(Math.cos(angle), -Math.sin(angle), Math.sin(angle), Math.cos(angle));

    set angle(angle) {
        this.a =  Math.cos(angle);
        this.b = -Math.sin(angle);
        this.c =  Math.sin(angle);
        this.d =  Math.cos(angle);
    }
}