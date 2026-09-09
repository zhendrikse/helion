import { Color } from "three";
import {
    VectorField, Range, Cylinder, ArrowField, Sphere, RadialSymmetricBody, Vec3,
    Arrow, Ring, Simulation, AxialSymmetricBody, Trail, Slider
} from "../../../src/index.js";

// Transcriptie van VPython EMrelVP.py (Landau) — Lorentz transformatie van velden
// Eén viewport i.p.v. twee canvassen; beide frames (S en S') tegelijk zichtbaar
// met beta-slider. Inspiratie voor ringen/pijlen uit faradays_law.js.

const I0 = 8; // VPython roept Euler(rr,8) aan — I=8, niet 15, mu0=1
const q = 1, m0 = 1;
const yOffsetSprime = 8; // scheiding S (y=0) en S' (y=8) in zelfde scene
const rr0 = new Vec3(4, 2.5, 0); // vaste B-positie zoals VPython Batr(rr,I) met rr initieel, niet r(t)

// ── Velden rond rechte draad langs x-as ──
class BField extends VectorField {
    constructor(I = I0) {
        super(); this.I = I;
    }

    /**
     * @param {Vec3} pos 
     * @param {Vec3} target 
     * @returns {Vec3}
     */
    sample(pos, target) {
        // draad door y=0,z=0 langs x; voor S' verschuiven we pos.y -= yOffset
        // voor S' wire: trek offset af als we in S' regio zijn (y > 4)
        const y0 = pos.y > yOffsetSprime / 2 ? pos.y - yOffsetSprime : pos.y;
        const r = Math.hypot(y0, pos.z);
        if (r < 0.3) {
            target.set(0, 0, 0);
            return target;
        }

        const B = this.I / (2 * Math.PI * r);
        const theta = Math.atan2(y0, pos.z);
        target.set(0, -B * Math.cos(theta), B * Math.sin(theta));
        return target;
    }
}

class BpField extends VectorField {
    constructor(I = I0, betaRef) { super(); this.I = I; this.betaRef = betaRef; }

    /**
     * @param {Vec3} pos 
     * @param {Vec3} target 
     * @returns {Vec3}
     */
    sample(pos, target) {
        const y0 = pos.y - yOffsetSprime;
        const r = Math.hypot(y0, pos.z);
        if (r < 0.3) {
            target.set(0, 0, 0);
            return target;
        }
        const B = this.I / (2 * Math.PI * r);
        const theta = Math.atan2(y0, pos.z);
        const By = -B * Math.cos(theta), Bz = B * Math.sin(theta);
        const gamma = 1 / Math.sqrt(1 - this.betaRef.beta ** 2);
        target.set(0, gamma * By, gamma * Bz);
        return target;
    }
}

class EpField extends VectorField {
    constructor(I = I0, betaRef) { super(); this.I = I; this.betaRef = betaRef; }
    /**
     * @param {Vec3} pos 
     * @param {Vec3} target 
     * @returns {Vec3}
     */
    sample(pos, target) {
        const y0 = pos.y - yOffsetSprime;
        const r = Math.hypot(y0, pos.z);
        if (r < 0.3) {
            target.set(0, 0, 0);
            return target;
        }
        const B = this.I / (2 * Math.PI * r);
        const theta = Math.atan2(y0, pos.z);
        const By = -B * Math.cos(theta), Bz = B * Math.sin(theta);
        const gamma = 1 / Math.sqrt(1 - this.betaRef.beta ** 2);
        const beta = this.betaRef.beta;
        target.set(0, -gamma * beta * Bz, gamma * beta * By);
        return target;
    }
}

// ── Relativistische lading ──
class RelativisticSystem {
    constructor(I = I0, beta = 0.3) {
        this.I = I;
        this.beta = beta;
        this.gamma = 1 / Math.sqrt(1 - beta * beta);
        this.sqv = Math.sqrt(1 - beta * beta);
        // S
        this.r = new Vec3(4, 2.5, 0);
        this.u = new Vec3(0, -0.9, 0);
        // S' offset in y
        this.rp = new Vec3(4, 2.5 + yOffsetSprime, 0);
        const den = 1 - this.u.x * beta;
        this.up = new Vec3((this.u.x - beta) / den, this.sqv * this.u.y / den, this.sqv * this.u.z / den);
        this.mPrime = m0 * this.gamma;
    }

    setBeta(b) {
        this.beta = b;
        this.gamma = 1 / Math.sqrt(1 - b * b);
        this.sqv = Math.sqrt(1 - b * b);
        this.mPrime = m0 * this.gamma;
    }
    // B veld helpers — VPython gebruikt vaste rr0 (Batr(rr,I)), niet r(t); dat geeft
    // constant B en stabiele baan. Voor Helion correctere r(t) zou r→0 → grote B → instabiel.
    bAtFixed() {
        const y = rr0.y, z = rr0.z;
        const r = Math.hypot(y, z);
        if (r < 0.3) return new Vec3(0, 0, 0);
        const B = this.I / (2 * Math.PI * r);
        const th = Math.atan2(y, z);
        return new Vec3(0, -B * Math.cos(th), B * Math.sin(th));
    }
    bAtPrimeFixed() {
        const y0 = rr0.y, z = rr0.z;
        const r = Math.hypot(y0, z);
        if (r < 0.3) return new Vec3(0, 0, 0);
        const B = this.I / (2 * Math.PI * r);
        const th = Math.atan2(y0, z);
        const By = -B * Math.cos(th), Bz = B * Math.sin(th);
        return new Vec3(0, this.gamma * By, this.gamma * Bz);
    }
    step(dt) {
        // velden op vaste rr0 zoals origineel VPython (stabiel); voor r(t) variant vervang door bAt(this.r)
        const B = this.bAtFixed();
        const Bp = this.bAtPrimeFixed();
        const beta = this.beta, gamma = this.gamma;
        const y0 = rr0.y, z = rr0.z;
        const r = Math.hypot(y0, z);
        let By = 0, Bz = 0;
        if (r >= 0.3) {
            const Bt = this.I / (2 * Math.PI * r);
            const th = Math.atan2(y0, z);
            By = -Bt * Math.cos(th); Bz = Bt * Math.sin(th);
        }
        const Ep = new Vec3(0, -gamma * beta * Bz, gamma * beta * By);
        const F = new Vec3().copy(this.u).cross(B).multiplyScalar(q);
        const upCrossBp = new Vec3().copy(this.up).cross(Bp);
        const Fp = new Vec3().copy(Ep).add(upCrossBp.multiplyScalar(q));
        const a = F.clone().multiplyScalar(1 / m0);
        const ap = Fp.clone().multiplyScalar(1 / this.mPrime);
        this.u.addScaledVector(a, dt);
        this.up.addScaledVector(ap, dt);
        this.r.addScaledVector(this.u, dt);
        this.rp.addScaledVector(this.up, dt); // VPython: rp+=up*dt (dtp ongebruikt)
    }
}

let system = new RelativisticSystem(I0, 0.3);
let betaRef = system; // voor velden

// ── Scene: draden + ringen (inspiratie faradays_law.js:75) ──
const wireS = new AxialSymmetricBody({ position: new Vec3(-10, 0, 0), axis: new Vec3(20, 0, 0), radius: 0.25 });
const wireSp = new AxialSymmetricBody({ position: new Vec3(-10, yOffsetSprime, 0), axis: new Vec3(20, 0, 0), radius: 0.25 });

const chargeS = new RadialSymmetricBody({ position: system.r.clone(), radius: 0.2 });
const chargeSp = new RadialSymmetricBody({ position: system.rp.clone(), radius: 0.2 });

const simulation = Simulation
    .with({
        htmlDivId: "emTransformContainer",
        camera: { position: new Vec3(18, 15, 38), fieldOfView: 35 },
        infoPanel: {
            text: "<strong/>Lorentz transorm of EM-fields</strong><br/>" +
                "$\nE'_x = E_x$<br/>$\nE'_y = \\gamma (E_y - v B_z)$<br/>$E'_z = \\gamma(E_z+v B_y)$<br/>and<br/>" + 
                "$B'_x = B_x$<br/>$B'_y = \\gamma (B_y + vE_z/c^2)$<br/>$\B'_z = \\gamma (B_z - vE_y/c^2)$"
        }
    })
    .withMouseClickEventListener()
    .bind(wireS.onceWith(new Cylinder({ color: 0xffffff })))
    .bind(wireSp.onceWith(new Cylinder({ color: 0xffffff })))
    .bind(chargeS.alwaysWith(new Sphere({ color: 0xff0000 })))
    .bind(chargeSp.alwaysWith(new Sphere({ color: 0xff0000 })))
    .bind(chargeS.alwaysWith(new Trail({ color: 0xff4444, maxPoints: 400 })))
    .bind(chargeSp.alwaysWith(new Trail({ color: 0xff8888, maxPoints: 400 })));

// ringen + B-pijlen rond draad (zoals faradays_law.js)
function addRingsAndArrows(y0) {
    const xs = [-6, -2, 2, 6];
    for (const x of xs) {
        const ring = new Ring({ color: 0xffa500, thickness: 0.04 });
        simulation.bind(new AxialSymmetricBody({ position: new Vec3(x, y0, 0), axis: new Vec3(1, 0, 0), radius: 2.2 }).onceWith(ring));
        const a1 = new Arrow({ color: 0xffa500, size: 0.35 });
        const a2 = new Arrow({ color: 0xffa500, size: 0.35 });
        // B is azimutaal: boven draad +z, onder -z (bij y-offset)
        const b1 = new AxialSymmetricBody({ position: new Vec3(x, y0 + 2.2, 0), axis: new Vec3(0, 0, 1.2) });
        const b2 = new AxialSymmetricBody({ position: new Vec3(x, y0 - 2.2, 0), axis: new Vec3(0, 0, -1.2) });
        simulation.bind(b1.onceWith(a1));
        simulation.bind(b2.onceWith(a2));
    }
}
addRingsAndArrows(0);
addRingsAndArrows(yOffsetSprime);

// E/B velden als ArrowField — beide tegelijk zichtbaar
const bField = new BField(I0);
const bpField = new BpField(I0, betaRef);
const epField = new EpField(I0, betaRef);

simulation.bind(bField.onceWith(new ArrowField({
    xRange: new Range(-8, 8, 4),
    yRange: new Range(-4, 4, 1),
    zRange: new Range(-4, 4, 1),
    scaleFactor: 0.9,
    round: true,
    colorMap: () => new Color("orange"),
    magnitudeMap: m => Math.log(1 + m)
})));
simulation.bind(bpField.onceWith(new ArrowField({
    xRange: new Range(-8, 8, 4),
    yRange: new Range(yOffsetSprime - 4, yOffsetSprime + 4, 1),
    zRange: new Range(-4, 4, 1),
    scaleFactor: 0.9,
    round: true,
    colorMap: () => new Color("orange"),
    magnitudeMap: m => Math.log(1 + m)
})));
simulation.bind(epField.onceWith(new ArrowField({
    xRange: new Range(-8, 8, 4),
    yRange: new Range(yOffsetSprime - 4, yOffsetSprime + 4, 1),
    zRange: new Range(-4, 4, 1),
    scaleFactor: 2,
    round: true,
    colorMap: () => new Color("cyan"),
    magnitudeMap: m => Math.log(1 + m)
})));

simulation
    .onReset(() => {
system = new RelativisticSystem(I0, 0.3);
betaRef = system; // voor velden

    })
    .runsEvery(5e-3)
    .advancesBy(1e-2)
    .onStep((_, dt) => {
        system.step(dt);
        chargeS.position.copy(system.r);
        chargeSp.position.copy(system.rp);
    })
    .append(new Slider("β = v/c")
        .withRange(new Range(0, 0.9, 0.05))
        .withValue(0.3)
        .onInput(e => {
            // @ts-ignore
            const b = Number(e.target.value);
            system.setBeta(b);
        }))
    .append(new Slider("I")
        .withRange(new Range(5, 25, 1))
        .withValue(I0)
        .onInput(e => {
            // @ts-ignore
            const I = Number(e.target.value);
            system.I = I; bField.I = I; bpField.I = I; epField.I = I;
        }));
