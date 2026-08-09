import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Arrow, RadioGroup, Renderable3D, RadialSymmetricBody
} from "../../../src/index.js";

/* ─── Fysische constanten (identiek aan VPython) ─── */
const SPACING = 1.0E-10;
const K       = 8.0E-4;
const KT      = 3.0E-5;
const U       = 1.660E-27;
const Q       = 1.602E-19;
const RAD     = 3.0E-11;
const SCALE   = 1e10;          // Display-schaal, net als je CO-demo

/* ─── Model: externe E-veld ─── */
class ElectricField {
    constructor(position, magnitude = 0, frequency = 8.0) {
        this._position  = position;
        this._magnitude = magnitude;
        this._frequency = frequency;
        this._axis      = new Vec3(0, 0, 0);
        this._field     = new Vec3(0, 0, 0);
    }

    update(time) {
        const omega = this._frequency * 2 * Math.PI * 1.00001E10;
        const c     = Math.cos(time * omega);
        // VPython: axis = 0.5*spacing*cos(...)*vector(0,1,0)
        this._axis.set(0, 0.5 * SPACING * c, 0);
        // VPython: field = magnitude*cos(...)*vector(0,1,0)
        this._field.set(0, this._magnitude * c, 0);
    }

    get position() { return this._position; }
    get axis()     { return this._axis; }
    get field()    { return this._field; }

    set frequency(value) { this._frequency = value; }

    alwaysWith(view) {
        return { model: this, view };
    }
}

/* ─── Model: CO₂-molecuul ─── */
class CarbonDioxide {
    constructor() {
        const theta = 30 * Math.PI / 180;
        const o1Pos = new Vec3(SPACING * Math.cos(theta), SPACING * Math.sin(theta), 0);
        const o2Pos = o1Pos.clone().negate();

        this._oxygen1 = new RadialSymmetricBody({
            position: o1Pos,
            velocity: new Vec3(0, 0, 0),
            mass: 16 * U,
            radius: RAD
        });
        this._oxygen2 = new RadialSymmetricBody({
            position: o2Pos,
            velocity: new Vec3(0, 0, 0),
            mass: 16 * U,
            radius: RAD
        });
        this._carbon = new RadialSymmetricBody({
            position: new Vec3(0, 0, 0),
            velocity: new Vec3(0, 0, 0),
            mass: 12 * U,
            radius: 0.8 * RAD
        });

        this._k       = K;
        this._kt      = KT;
        this._spacing = SPACING;
        this._theta   = theta;
    }

    get oxygen1() { return this._oxygen1; }
    get oxygen2() { return this._oxygen2; }
    get carbon()  { return this._carbon; }

    // Data-objecten die de SwitchableBondView verwacht: {position, axis, radius}
    get bond1ViewData() {
        const axis = this._oxygen1.position.clone().sub(this._carbon.position);
        return {
            position: this._carbon.position,
            axis: axis,
            radius: 0.3 * this._oxygen1.radius   // VPython: radius=0.3*rad
        };
    }

    get bond2ViewData() {
        const axis = this._oxygen2.position.clone().sub(this._carbon.position);
        return {
            position: this._carbon.position,
            axis: axis,
            radius: 0.3 * this._oxygen2.radius
        };
    }

    reset() {
        const s = this._spacing;
        const t = this._theta;
        this._oxygen1.position.set( s * Math.cos(t),  s * Math.sin(t), 0);
        this._oxygen1.state.velocity.set(0, 0, 0);

        this._oxygen2.position.set(-s * Math.cos(t), -s * Math.sin(t), 0);
        this._oxygen2.state.velocity.set(0, 0, 0);

        this._carbon.position.set(0, 0, 0);
        this._carbon.state.velocity.set(0, 0, 0);
    }

    update(eField, dt) {
        const v1 = this._oxygen1.position.clone().sub(this._carbon.position);
        const v2 = this._oxygen2.position.clone().sub(this._carbon.position);

        // Hoekafwijking van lineariteit: acos( dot(v1,-v2) / (|v1||v2|) )
        const mag1 = v1.length();
        const mag2 = v2.length();
        let angle = 0;
        if (mag1 > 1e-20 && mag2 > 1e-20) {
            const cosA = Math.max(-1, Math.min(1, v1.dot(v2.clone().negate()) / (mag1 * mag2)));
            angle = Math.acos(cosA);
        }

        const normV1 = v1.clone().normalize();
        const normV2 = v2.clone().normalize();
        const bendDir = v1.clone().add(v2).normalize();   // norm(v1+v2)

        const E = eField.field;

        // ── Oxygen 1 ──
        const fO1 = E.clone().multiplyScalar(Q)                                    // Coulomb
            .add(normV1.clone().multiplyScalar(-this._k * (mag1 - this._spacing))) // Stretch
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle)); // Torsie
        this._oxygen1.state.velocity.add(fO1.divideScalar(this._oxygen1.mass).multiplyScalar(dt));
        this._oxygen1.position.add(this._oxygen1.state.velocity.clone().multiplyScalar(dt));

        // ── Oxygen 2 ──
        const fO2 = E.clone().multiplyScalar(Q)
            .add(normV2.clone().multiplyScalar(-this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle));
        this._oxygen2.state.velocity.add(fO2.divideScalar(this._oxygen2.mass).multiplyScalar(dt));
        this._oxygen2.position.add(this._oxygen2.state.velocity.clone().multiplyScalar(dt));

        // ── Carbon ──
        const fC = E.clone().multiplyScalar(-2 * Q)
            .add(normV1.clone().multiplyScalar( this._k * (mag1 - this._spacing)))
            .add(normV2.clone().multiplyScalar( this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(2 * this._kt * this._spacing * angle));
        this._carbon.state.velocity.add(fC.divideScalar(this._carbon.mass).multiplyScalar(dt));
        this._carbon.position.add(this._carbon.state.velocity.clone().multiplyScalar(dt));
    }

    alwaysWith(view) {
        return { model: this, view };
    }
}

/* ─── View: CO₂ + 2 veren + E-veld-pijl ─── */
class CarbonDioxideView extends Renderable3D {
    constructor({
                    bondType = SwitchableBondView.Type.Spring
                } = {}) {
        super();

        // VPython kleuren: O=green, C=red, springs=yellow, E-field=magenta
        this._o1 = new Sphere({ color: 0x00ff00, segments: 24 });
        this._c  = new Sphere({ color: 0xff0000, segments: 24 });
        this._o2 = new Sphere({ color: 0x00ff00, segments: 24 });

        this._bond1 = new SwitchableBondView({
            bondType,
            color: 0xffff00,        // geel
            coils: 10,
            thickness: 0.33,        // ≈ VPython: thickness=0.1*rad, radius=0.3*rad
            tubularSegments: 60,
            radialSegments: 8
        });
        this._bond2 = new SwitchableBondView({
            bondType,
            color: 0xffff00,
            coils: 10,
            thickness: 0.33,
            tubularSegments: 60,
            radialSegments: 8
        });

        this.add(this._o1, this._c, this._o2, this._bond1, this._bond2);
    }

    canBindTo(model) {
        return model instanceof CarbonDioxide;
    }

    initialize(model) {
        this._o1.initialize(model.oxygen1);
        this._c.initialize(model.carbon);
        this._o2.initialize(model.oxygen2);
        this._bond1.initialize(model.bond1ViewData);
        this._bond2.initialize(model.bond2ViewData);
    }

    synchronizeWith(model) {
        this._o1.synchronizeWith(model.oxygen1);
        this._c.synchronizeWith(model.carbon);
        this._o2.synchronizeWith(model.oxygen2);
        this._bond1.synchronizeWith(model.bond1ViewData);
        this._bond2.synchronizeWith(model.bond2ViewData);
    }
}

/* ─── Simulatie-opzet ─── */
const co2   = new CarbonDioxide();
const field = new ElectricField(new Vec3(1.7 * SPACING, 0, 0), 200, 8.0);

const co2View = new CarbonDioxideView({
    bondType: SwitchableBondView.Type.Spring
});

const eArrow = new Arrow({
    color: 0xff00ff,      // magenta
    round: false,
    castShadow: true
});

const simulation = Simulation
    .with({
        htmlDivId: "carbonDioxideContainer",
        scale: SCALE,
        cameraPosition: new Vec3(3, 2, 4),
        fieldOfView: 40,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-13)
    .onStep((clock, dt) => {
        field.update(clock.simulatedTime);
        co2.update(field, dt);
    })
    .onReset(() => {
        co2.reset();
        field.update(0);
    })
    .bind(co2.alwaysWith(co2View))
    .bind(field.alwaysWith(eArrow))
    .append(new RadioGroup()
        .add("8 ", () => field.frequency = 8.0)
        .add("5.291 ", () => field.frequency = 5.291)
        .add("1.5 ", () => field.frequency = 1.5)
        .add("2.76 ", () => field.frequency = 2.76)
        .checked(0)
    );
