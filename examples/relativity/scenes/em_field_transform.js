import {Color} from "three";
import {
    Arrow, ArrowField, AxialSymmetricBody, Cylinder, RadialSymmetricBody, Range, Ring, Simulation,
    Slider, Sphere, Trail, Transformation, Vec3, VectorField
} from "../../../src/index.js";

const I0 = 8; // VPython roept Euler(rr,8) aan — I=8, niet 15, mu0=1
const q = 1, m0 = 1;
const yOffsetSprime = 8; // scheiding S (y=0) en S' (y=8) in zelfde scene
const rr0 = new Vec3(4, 2.5, 0); // vaste B-positie zoals VPython Batr(rr,I) met rr initieel, niet r(t)
const rr1 = rr0.clone().add(new Vec3(0, yOffsetSprime, 0));

class ElectromagneticField {
    /**
     * @param {VectorField} electricField
     * @param {VectorField} magneticField
     */
    constructor(electricField, magneticField) {
        this.electricField = electricField;
        this.magneticField = magneticField;
    }

    /** @param {Transformation} transformation */
    apply(transformation) {
        return transformation.applyTo(this);
    }
}

class WireElectromagneticField extends ElectromagneticField {
    constructor(I = I0, yOffset = 0) {
        super(new VectorField(), new VectorField());
        this._currentInWire = I;
        this._yOffset = yOffset;

        this.magneticField = new VectorField();
        this.electricField = new VectorField();
        this.magneticField.sample = (/** @type {Vec3} */ pos, /** @type {Vec3} */ target) => {
            this._sample(pos, target, false);
            return target;
        };
        this.electricField.sample = (/** @type {Vec3} */ pos, /** @type {Vec3} */ target) => {
            this._sample(pos, target, true);
            return target;
        };
    }

    _sample(pos, target, setElectricField) {
        const y0 = pos.y - this._yOffset;
        const r = Math.hypot(y0, pos.z);
        if (r < 0.3) {
            target.set(0, 0, 0);
            return target;
        }
        const B = this._currentInWire / (2 * Math.PI * r);
        const theta = Math.atan2(y0, pos.z);

        if (setElectricField)
            target.set(0, -B * Math.sin(theta), -B * Math.cos(theta));
        else
            target.set(0, -B * Math.cos(theta), B * Math.sin(theta));
    }
}

class TransformedVectorField extends VectorField {
    /**
     * @param {VectorField} sourceField
     * @param {(source: Vec3, target: Vec3) => void} transform
     */
    constructor(sourceField, transform) {
        super();
        this._sourceField = sourceField;
        this._transform = transform;
    }

    sample(pos, target) {
        this._sourceField.sample(pos, target);
        this._transform(target, target);
        return target;
    }
}

class LorentzTransform extends Transformation {
    constructor(beta = 0) {
        super();
        this._beta = beta;
    }

    /** @param {number} beta */
    set beta(beta) {
        this._beta = beta;
    }

    /** @param {ElectromagneticField} electromagneticField */
    applyTo(electromagneticField) {
        const magneticField = new TransformedVectorField(
            electromagneticField.magneticField,
            (_, target) => target.multiplyScalar(this._gamma)
        );

        const electricField = new TransformedVectorField(
            electromagneticField.electricField,
            (_, target) => target.multiplyScalar(this._beta * this._gamma)
        );

        return new ElectromagneticField(electricField, magneticField);
    }

    get _gamma() {
        return 1 / Math.sqrt(1 - this._beta * this._beta);
    }
}

const chargeS = new RadialSymmetricBody({
    position: new Vec3(4, 2.5, 0),
    velocity: new Vec3(0, -0.9, 0),
    radius: 0.2,
    mass: m0,
    charge: q
});
const chargeSp = new RadialSymmetricBody({
    position: new Vec3(4, 2.5 + yOffsetSprime, 0),
    radius: 0.2,
    mass: m0,
    charge: q
});

// ── Scene: draden + ringen (inspiratie faradays_law.js:75) ──
const wireS = new AxialSymmetricBody({
    position: new Vec3(-10, 0, 0),
    axis: new Vec3(20, 0, 0),
    radius: 0.25
});
const wireSp = new AxialSymmetricBody({
    position: new Vec3(-10, yOffsetSprime, 0),
    axis: new Vec3(20, 0, 0),
    radius: 0.25
});

const B = new Vec3();
const Bp = new Vec3();
const Ep = new Vec3();
const simulation = Simulation
    .with({
        htmlDivId: "emTransformContainer",
        camera: { position: new Vec3(18, 15, 38), fieldOfView: 35 },
        infoPanel: {
            text: "<strong/>Lorentz transform of EM-fields</strong><br/>" +
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

/** @param {number} y0 */
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
const staticElectromagneticField = new WireElectromagneticField(I0, 0);
const bField = staticElectromagneticField.magneticField;
const restFrameElectromagneticField = new WireElectromagneticField(I0, yOffsetSprime);
const lorentzTransform = new LorentzTransform(0.3);
const electromagneticField = restFrameElectromagneticField.apply(lorentzTransform);

/** @param {number} beta */
function setBeta(beta) {
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    lorentzTransform.beta = beta;

    const denominator = gamma * (1 - chargeS.velocity.x * beta);
    chargeSp._state.mass = m0 * gamma;
    chargeSp._state.velocity = new Vec3(
        gamma * (chargeS.velocity.x - beta),
        chargeS.velocity.y,
        chargeS.velocity.z).divideScalar(denominator);
}
setBeta(0.3);

simulation.bind(bField.onceWith(new ArrowField({
    xRange: new Range(-8, 8, 4),
    yRange: new Range(-4, 4, 1),
    zRange: new Range(-4, 4, 1),
    scaleFactor: 0.9,
    round: true,
    colorMap: () => new Color("orange"),
    magnitudeMap: m => Math.log(1 + m)
})));
simulation.bind(electromagneticField.magneticField.onceWith(new ArrowField({
    xRange: new Range(-8, 8, 4),
    yRange: new Range(yOffsetSprime - 4, yOffsetSprime + 4, 1),
    zRange: new Range(-4, 4, 1),
    scaleFactor: 0.9,
    round: true,
    colorMap: () => new Color("orange"),
    magnitudeMap: m => Math.log(1 + m)
})));
simulation.bind(electromagneticField.electricField.onceWith(new ArrowField({
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
        setBeta(0.3)
    })
    .runsEvery(5e-3)
    .advancesBy(1e-2)
    .onStep((_, dt) => {
        bField.sample(rr0, B);
        electromagneticField.magneticField.sample(rr1, Bp);
        electromagneticField.electricField.sample(rr1, Ep);

        chargeS._force.copy(new Vec3().copy(chargeS.velocity).cross(B).multiplyScalar(q));
        chargeS.integrate(dt);

        chargeSp._force.copy(new Vec3().copy(Ep).add(chargeSp.velocity.clone().cross(Bp).multiplyScalar(q)));
        chargeSp.integrate(dt);
    })
    .append(new Slider("β = v/c")
        .withRange(new Range(0, 0.9, 0.05))
        .withValue(0.3)
        .onInput(event => setBeta(Number(event.target.value))))
    .append(new Slider("I")
        .withRange(new Range(5, 25, 1))
        .withValue(I0)
        .onInput(e => {
            // @ts-ignore
            const I = Number(e.target.value);
            staticElectromagneticField._currentInWire = I;
            restFrameElectromagneticField._currentInWire = I;
        }));