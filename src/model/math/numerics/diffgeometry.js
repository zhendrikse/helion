import {Vec3} from "../math.js";

export class PrincipalFrame {
    constructor({
        position = new Vec3(),
        normal = new Vec3(),
        k1 = 0,
        k2 = 0,
        d1 = new Vec3(),
        d2 = new Vec3()
    } = {}) {
        this.position = position;
        this.normal = normal;
        this.k1 = k1;
        this.k2 = k2;
        this.d1 = d1;  // tangent direction
        this.d2 = d2;
    }
}

/**
 * Differential geometry calculations on a surface, i.e. an
 * object that implements the sample(u, v, target) method.
 */
export class DifferentialGeometry {
    constructor(surface, { eps = 1e-4 } = {}) {
        this._surface = surface;
        this.eps = eps;

        // sample points
        this._p00 = new Vec3();
        this._pu1 = new Vec3();
        this._pu0 = new Vec3();
        this._pv1 = new Vec3();
        this._pv0 = new Vec3();
        this._pu1v1 = new Vec3();
        this._pu1v0 = new Vec3();
        this._pu0v1 = new Vec3();
        this._pu0v0 = new Vec3();

        // derivatives
        this._Xu = new Vec3();
        this._Xv = new Vec3();
        this._Xuu = new Vec3();
        this._Xuv = new Vec3();
        this._Xvv = new Vec3();

        // output vectors
        this._N = new Vec3();
        this._d1 = new Vec3();
        this._d2 = new Vec3();
    }

    principalFrame(u, v, target) {
        const e = this.eps;
        const inv2e = 1 / (2 * e);
        const inve2 = 1 / (e * e);
        const inv4e2 = 1 / (4 * e * e);
        const s = this._surface;

        s.sample(u, v, this._p00);

        s.sample(u + e, v, this._pu1);
        s.sample(u - e, v, this._pu0);

        s.sample(u, v + e, this._pv1);
        s.sample(u, v - e, this._pv0);

        s.sample(u + e, v + e, this._pu1v1);
        s.sample(u + e, v - e, this._pu1v0);
        s.sample(u - e, v + e, this._pu0v1);
        s.sample(u - e, v - e, this._pu0v0);

        const Xu = this._Xu
            .copy(this._pu1)
            .sub(this._pu0)
            .multiplyScalar(inv2e);

        const Xv = this._Xv
            .copy(this._pv1)
            .sub(this._pv0)
            .multiplyScalar(inv2e);

        const Xuu = this._Xuu
            .copy(this._pu1)
            .sub(this._p00)
            .sub(this._p00)
            .add(this._pu0)
            .multiplyScalar(inve2);

        const Xvv = this._Xvv
            .copy(this._pv1)
            .sub(this._p00)
            .sub(this._p00)
            .add(this._pv0)
            .multiplyScalar(inve2);

        const Xuv = this._Xuv
            .copy(this._pu1v1)
            .sub(this._pu1v0)
            .sub(this._pu0v1)
            .add(this._pu0v0)
            .multiplyScalar(inv4e2);

        const N = this._N
            .copy(Xu)
            .cross(Xv)
            .normalize();

        const E = Xu.dot(Xu);
        const F = Xu.dot(Xv);
        const G = Xv.dot(Xv);

        const ee = Xuu.dot(N);
        const ff = Xuv.dot(N);
        const gg = Xvv.dot(N);

        const detI = E * G - F * F;

        if (Math.abs(detI) < 1e-12)
            return null;

        const invDet = 1 / detI;

        const inv00 = G * invDet;
        const inv01 = -F * invDet;
        const inv10 = inv01;
        const inv11 = E * invDet;

        const S00 = inv00 * ee + inv01 * ff;
        const S01 = inv00 * ff + inv01 * gg;
        const S10 = inv10 * ee + inv11 * ff;
        const S11 = inv10 * ff + inv11 * gg;

        const trace = S00 + S11;
        const det = S00 * S11 - S01 * S10;

        const disc = Math.sqrt(Math.max(0, trace * trace * 0.25 - det));

        const k1 = trace * 0.5 + disc;
        const k2 = trace * 0.5 - disc;

        let v1x, v1y;
        let v2x, v2y;

        if (Math.abs(S01) > 1e-8) {
            v1x = k1 - S11;
            v1y = S01;

            v2x = k2 - S11;
            v2y = S01;
        } else {
            v1x = 1;
            v1y = 0;

            v2x = 0;
            v2y = 1;
        }

        this._d1.set(
            Xu.x * v1x + Xv.x * v1y,
            Xu.y * v1x + Xv.y * v1y,
            Xu.z * v1x + Xv.z * v1y
        ).normalize();

        this._d2.set(
            Xu.x * v2x + Xv.x * v2y,
            Xu.y * v2x + Xv.y * v2y,
            Xu.z * v2x + Xv.z * v2y
        ).normalize();

        target.position.copy(this._p00);
        target.normal.copy(N);
        target.k1 = k1;
        target.k2 = k2;
        target.d1.copy(this._d1);
        target.d2.copy(this._d2);

        return target;
    }
}
