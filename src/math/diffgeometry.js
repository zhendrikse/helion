import {Vec3} from "./math.js";

export class PrincipalFrame {
    constructor({
        position,
        normal,
        k1, k2,
        d1, d2
    }) {
        this.position = position;
        this.normal = normal;
        this.k1 = k1;
        this.k2 = k2;
        this.d1 = d1;  // tangent direction
        this.d2 = d2;
        Object.freeze(this);
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
        this._position = new Vec3();
    }

    derivatives(u, v) {
        const e = this.eps;
        const sample = (du, dv) => {
            this._surface.sample(u + du, v + dv, this._position);
            return this._position;
        };

        const p00 = sample(0, 0),
            pu1 = sample(+e, 0),
            pu0 = sample(-e, 0),
            pv1 = sample(0, +e),
            pv0 = sample(0, -e),
            pu1v1 = sample(+e, +e),
            pu1v0 = sample(+e, -e),
            pu0v1 = sample(-e, +e),
            pu0v0 = sample(-e, -e);

        const Xu = pu1.clone().sub(pu0).multiplyScalar(1 / (2 * e));
        const Xv = pv1.clone().sub(pv0).multiplyScalar(1 / (2 * e));

        const Xuu = pu1.clone().sub(p00.clone().multiplyScalar(2)).add(pu0).multiplyScalar(1 / (e * e));
        const Xvv = pv1.clone().sub(p00.clone().multiplyScalar(2)).add(pv0).multiplyScalar(1 / (e * e));
        const Xuv = pu1v1.clone().sub(pu1v0).sub(pu0v1).add(pu0v0).multiplyScalar(1 / (4 * e * e));

        return { Xu, Xv, Xuu, Xuv, Xvv };
    }

    fundamentalForms(u, v) {
        const { Xu, Xv, Xuu, Xuv, Xvv } = this.derivatives(u, v);
        const N = Xu.clone().cross(Xv).normalize();

        const E = Xu.dot(Xu), F = Xu.dot(Xv), G = Xv.dot(Xv);
        const e = Xuu.dot(N), f = Xuv.dot(N), g = Xvv.dot(N);

        const detI = E * G - F * F;
        const invI = detI !== 0 ? [[G / detI, -F / detI], [-F / detI, E / detI]] : null;
        const S = invI ? [
            [invI[0][0] * e + invI[0][1] * f, invI[0][0] * f + invI[0][1] * g],
            [invI[1][0] * e + invI[1][1] * f, invI[1][0] * f + invI[1][1] * g]
        ] : null;

        return { Xu, Xv, Xuu, Xuv, Xvv, N, E, F, G, e, f, g, detI, invI, S };
    }

    normalMeanGaussian(u, v) {
        const f = this.fundamentalForms(u, v);
        const EG_F2 = f.E * f.G - f.F * f.F;
        const H = EG_F2 !== 0 ? (f.e * f.G - 2 * f.f * f.F + f.g * f.E) / (2 * EG_F2) : 0;
        const K = EG_F2 !== 0 ? (f.e * f.g - f.f * f.f) / EG_F2 : 0;
        return { N: f.N, H, K };
    }

    principals(u, v) {
        const { H, K } = this.normalMeanGaussian(u, v);
        const disc = Math.max(0, H * H - K);
        const sqrtDisc = Math.sqrt(disc);
        return { k1: H + sqrtDisc, k2: H - sqrtDisc };
    }

    principalDirections(u, v) {
        const f = this.fundamentalForms(u, v);
        if (!f.S) return null;

        const S = f.S;
        const trace = S[0][0] + S[1][1];
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
        const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));

        const k1 = trace / 2 + disc, k2 = trace / 2 - disc;
        const v1 = Math.abs(S[0][1]) > 1e-6 ? [k1 - S[1][1], S[0][1]] : [1, 0];
        const v2 = Math.abs(S[0][1]) > 1e-6 ? [k2 - S[1][1], S[0][1]] : [0, 1];

        const d1 = f.Xu.clone().multiplyScalar(v1[0]).add(f.Xv.clone().multiplyScalar(v1[1])).normalize();
        const d2 = f.Xu.clone().multiplyScalar(v2[0]).add(f.Xv.clone().multiplyScalar(v2[1])).normalize();

        return { k1, k2, d1, d2 };
    }

    principalFrame(u, v) {
        const { Xu, Xv } = this.derivatives(u, v);
        const N = Xu.clone().cross(Xv).normalize();
        const result = this.principalDirections(u, v);
        if (!result) return null;

        const position = new Vec3();
        this._surface.sample(u, v, position);

        return new PrincipalFrame({
            position,
            normal: N,
            k1: result.k1,
            k2: result.k2,
            d1: result.d1,
            d2: result.d2
        });
    }
}
