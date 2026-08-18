import {Transformation} from "../../core/helion.js";
import {Vec3} from "../math/math.js";

export class Matrix2D extends Transformation {
    constructor(a, b, c, d) {
        super();
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
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
     * @returns
     * [
     *     { value: lambda1, vector: Vec3 },
     *     { value: lambda2, vector: Vec3 }
     * ]
     */
    eigenvectors() {
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
            result.push({ value: lambda1, vector: v1 });

        // For a repeated eigenvalue we don't want to draw the same eigenvector twice.
        if (Math.abs(lambda1 - lambda2) > 1e-10) {
            const v2 = vectorFor(lambda2);

            if (v2)
                result.push({ value: lambda2, vector: v2 });
        }

        return result;
    }
}