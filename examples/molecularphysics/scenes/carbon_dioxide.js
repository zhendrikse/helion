import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Arrow, RadioGroup, RadialSymmetricBody, MathPhysicsModelBehavior, VectorField
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

    reset() {
        this._oxygen1.reset();
        this._oxygen2.reset();
        this._carbon.reset();
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
        const bendDir = bend.length() > 1e-20 ? bend.normalize() : new Vec3(0, 0, 0);
        const E = new Vec3();

        eField.sample(this._oxygen1.position, E);
        this._oxygen1.force.copy(E.clone().multiplyScalar(Q)
            .add(normV1.clone().multiplyScalar(-this._k * (mag1 - this._spacing)))     // Stretch
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle)) // Torsion
        );

        eField.sample(this._oxygen2.position, E);
        this.oxygen2.force.copy(E.clone().multiplyScalar(Q)
            .add(normV2.clone().multiplyScalar(-this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(-this._kt * this._spacing * angle))
        );

        eField.sample(this._carbon.position, E);
        this.carbon.force.copy(E.clone().multiplyScalar(-2 * Q)
            .add(normV1.clone().multiplyScalar( this._k * (mag1 - this._spacing)))
            .add(normV2.clone().multiplyScalar( this._k * (mag2 - this._spacing)))
            .add(bendDir.clone().multiplyScalar(2 * this._kt * this._spacing * angle))
        );

        this.oxygen1.integrate(dt);
        this.oxygen2.integrate(dt);
        this.carbon.integrate(dt);
    }
}

const co2   = new CarbonDioxide();
const field = new ElectricField(new Vec3(1.7 * SPACING, 0, 0), 200, 8.0);

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
    .bind(co2.oxygen1.alwaysWith(new Sphere({ color: 0x00ff00, segments: 36 })))
    .bind(co2.oxygen2.alwaysWith(new Sphere({ color: 0x00ff00, segments: 36 })))
    .bind(co2.carbon.alwaysWith(new Sphere({ color: 0xff0000, segments: 36 })))
    .bind(co2.oxygen1.and(co2.carbon).alwaysWith(new SwitchableBondView({
        bondType: SwitchableBondView.Type.Spring,
        thickness: 0.04,
        tubularSegments: 750,
        radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
    })))
    .bind(co2.oxygen2.and(co2.carbon).alwaysWith(new SwitchableBondView({
        bondType: SwitchableBondView.Type.Spring,
        thickness: 0.04,
        tubularSegments: 750,
        radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
    })))
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
