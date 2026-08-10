import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Arrow, RadioGroup, Renderable3D, RadialSymmetricBody, MathPhysicsModelBehavior, VectorField
} from "../../../src/index.js";

const SPACING = 1.0E-10;
const K      = 8.0E-4;
const KT     = 3.0E-5;
const U      = 1.660E-27;
const Q      = 1.602E-19;
const RADIUS = 3.0E-11;
const SCALE  = 1e10; 

class ElectricField extends VectorField {
    constructor( position, magnitude = 0, frequency = 8.0 ) {
        super();
        this._position = position.clone();
        this._magnitude = magnitude;
        this._frequency = frequency; // Current simulation time.
        this._time = 0;              
        this._axis = new Vec3();     // Reusable vector for Arrow.
    }

    update(time) {
        this._time = time;
        const omega = this._frequency * 2 * Math.PI * 1.00001E10;
        this._axis.set( 0, 0.5 * SPACING * Math.cos(this._time * omega), 0 ); 
    }

    sample(position, target) {
        const omega = this._frequency * 2 * Math.PI * 1.00001E10;
        target.set( 0, this._magnitude * Math.cos(this._time * omega), 0 );
    }

    get position() { return this._position; }
    get axis() { return this._axis; }
    set frequency(value) { this._frequency = value; }
}

class CarbonDioxide extends MathPhysicsModelBehavior {
    constructor() {
        super();
        const theta = 30 * Math.PI / 180;
        const o1Pos = new Vec3(SPACING * Math.cos(theta), SPACING * Math.sin(theta), 0);
        const o2Pos = o1Pos.clone().negate();

        this._oxygen1 = new RadialSymmetricBody({
            position: o1Pos,
            mass: 16 * U,
            radius: RADIUS
        });
        this._oxygen2 = new RadialSymmetricBody({
            position: o2Pos,
            mass: 16 * U,
            radius: RADIUS
        });
        this._carbon = new RadialSymmetricBody({
            mass: 12 * U,
            radius: 0.8 * RADIUS
        });

        this._k       = K;       // Transversal bond constant
        this._kt      = KT;      // Longitudinal / torsion bond constant
        this._spacing = SPACING;
        this._theta   = theta;
    }

    get oxygen1() { return this._oxygen1; }
    get oxygen2() { return this._oxygen2; }
    get carbon()  { return this._carbon; }
    get bond1() { return this._carbon.and(this._oxygen1); }
    get bond2() { return this._carbon.and(this._oxygen2); }

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

        // Deviation of angle from linearity: acos( dot(v1,-v2) / (|v1||v2|) )
        const mag1 = v1.length();
        const mag2 = v2.length();
        let angle = 0;
        if (mag1 > 1e-20 && mag2 > 1e-20) {
            const cosA = Math.max(-1, Math.min(1, v1.dot(v2.clone().negate()) / (mag1 * mag2)));
            angle = Math.acos(cosA);
        }

        const normV1 = v1.clone().normalize();
        const normV2 = v2.clone().normalize();
        const bend = v1.clone().add(v2);

        const bendDir = bend.length() > 1e-20
            ? bend.normalize()
            : new Vec3(0, 0, 0);

        const E = new Vec3();

        // ── Oxygen 1 ──
        eField.sample(this._oxygen1.position, E);
        const fO1 = E.clone().multiplyScalar(Q)
            .add(normV1.clone().multiplyScalar(-this._k * (mag1 - this._spacing))) // Stretch
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle)); // Torsie
        this._oxygen1.state.velocity.add(fO1.divideScalar(this._oxygen1.mass).multiplyScalar(dt));
        this._oxygen1.position.add(this._oxygen1.state.velocity.clone().multiplyScalar(dt));

        // ── Oxygen 2 ──
        eField.sample(this._oxygen2.position, E);
        const fO2 = E.clone().multiplyScalar(Q)
            .add(normV2.clone().multiplyScalar(-this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle));
        this._oxygen2.state.velocity.add(fO2.divideScalar(this._oxygen2.mass).multiplyScalar(dt));
        this._oxygen2.position.add(this._oxygen2.state.velocity.clone().multiplyScalar(dt));

        // ── Carbon ──
        eField.sample(this._carbon.position, E);
        const fC = E.clone().multiplyScalar(-2 * Q)
            .add(normV1.clone().multiplyScalar( this._k * (mag1 - this._spacing)))
            .add(normV2.clone().multiplyScalar( this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(2 * this._kt * this._spacing * angle));
        this._carbon.state.velocity.add(fC.divideScalar(this._carbon.mass).multiplyScalar(dt));
        this._carbon.position.add(this._carbon.state.velocity.clone().multiplyScalar(dt));
    }
}

class CarbonDioxideView extends Renderable3D {
    constructor({
        bondType = SwitchableBondView.Type.Spring
    } = {}) {
        super();

        this._o1 = new Sphere({ color: 0x00ff00, segments: 36 });
        this._c  = new Sphere({ color: 0xff0000, segments: 36 });
        this._o2 = new Sphere({ color: 0x00ff00, segments: 36 });

        this._bond1 = new SwitchableBondView({
            bondType,
            thickness: 0.04,
            tubularSegments: 750,
            radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
        });
        this._bond2 = new SwitchableBondView({
            bondType,
            thickness: 0.04,
            tubularSegments: 750,
            radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
        });

        this.add(this._o1, this._c, this._o2, this._bond1, this._bond2);
    }

    canBindTo(model) {
        return model instanceof CarbonDioxide;
    }

    initialize(co2) {
        this._o1.initialize(co2.oxygen1);
        this._c.initialize(co2.carbon);
        this._o2.initialize(co2.oxygen2);
        this._bond1.initialize(co2.bond1);
        this._bond2.initialize(co2.bond2);
    }

    synchronizeWith(co2) {
        this._o1.synchronizeWith(co2.oxygen1);
        this._c.synchronizeWith(co2.carbon);
        this._o2.synchronizeWith(co2.oxygen2);
        this._bond1.synchronizeWith(co2.bond1);
        this._bond2.synchronizeWith(co2.bond2);
    }
}

const co2   = new CarbonDioxide();
const field = new ElectricField(new Vec3(1.7 * SPACING, 0, 0), 200, 8.0);
const co2View = new CarbonDioxideView();

Simulation
    .with({
        htmlDivId: "carbonDioxideContainer",
        scale: SCALE,
        cameraPosition: new Vec3(3, 0, 3),
        fieldOfView: 40,
        parameterMenuCollapsed: false,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-13)
    .substeps(2)
    .onStep((clock, dt) => {
        field.update(clock.simulatedTime);
        co2.update(field, dt);
    })
    .onReset(() => {
        co2.reset();
        field.update(0);
    })
    .bind(co2.alwaysWith(co2View))
    .bind(field.alwaysWith(new Arrow({
        color: 0xff00ff,
        round: true,
        size: 1.0e-11,
        magnitudeMap: magnitude => magnitude
    })))
    .append(new RadioGroup()
        .add("8 ", () => field.frequency = 8.0)
        .add("5.291 ", () => field.frequency = 5.291)
        .add("1.5 ", () => field.frequency = 1.5)
        .add("2.76 ", () => field.frequency = 2.76)
        .checked(0)
    );
