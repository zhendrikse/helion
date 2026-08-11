import {
    Vec3, Simulation, Sphere, SwitchableBondView, PairForce, SpringForce, Force,
    Arrow, RadioGroup, RadialSymmetricBody, MathPhysicsModelBehavior, VectorField, CoulombForce
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

class BendForce extends Force {
    constructor({ k, restLength }) {
        super();

        this._k = k;
        this._restLength = restLength;

        this._v1 = new Vec3();
        this._v2 = new Vec3();
        this._sum = new Vec3();
        this._force = new Vec3();
    }

    _calculateForceOn(bondPairs) {
        const center = bondPairs.body1.body1;
        const outer1 = bondPairs.body1.body2;
        const outer2 = bondPairs.body2.body2;

        this._v1.copy(outer1.position).sub(center.position); // v1 = O1 - C
        this._v2.copy(outer2.position).sub(center.position); // v2 = O2 - C

        const mag1 = this._v1.length();
        const mag2 = this._v2.length();

        if (mag1 <= 1e-20 || mag2 <= 1e-20)
            return;

        // angle = acos(dot(v1, -v2) / (|v1| |v2|))
        //
        // This is the deviation from linearity.
        // Therefore: linear molecule -> angle = 0
        const cosAngle = Math.max(-1, Math.min(
            1,
            -this._v1.dot(this._v2) / (mag1 * mag2)
        ));

        const angle = Math.acos(cosAngle);

        // norm(v1 + v2)
        this._sum.copy(this._v1).add(this._v2);
        const sumLength = this._sum.length();
        if (sumLength <= 1e-20)
            return;

        this._sum.multiplyScalar(1 / sumLength);

        // torque_force = -kt * spacing * angle * norm(v1 + v2)
        this._forceVector.copy(this._sum).multiplyScalar(-this._k * this._restLength * angle);
    }

    applyTo(bondPairs) {
        this._calculateForceOn(bondPairs);
        bondPairs.body1.body2.force.add(this._forceVector);
        bondPairs.body2.body2.force.add(this._forceVector);
        bondPairs.body1.body1.force.addScaledVector(this._forceVector, -2);
    }
}

class CarbonDioxide extends MathPhysicsModelBehavior {
    constructor(theta) {
        super();
        const o1Pos = new Vec3(SPACING * Math.cos(theta), SPACING * Math.sin(theta), 0);
        const o2Pos = o1Pos.clone().negate();

        this._oxygen1 = new RadialSymmetricBody({
            position: o1Pos,
            mass: 16 * U,
            radius: RADIUS,
            charge: Q
        });
        this._oxygen2 = new RadialSymmetricBody({
            position: o2Pos,
            mass: 16 * U,
            radius: RADIUS,
            charge: Q
        });
        this._carbon = new RadialSymmetricBody({
            mass: 12 * U,
            radius: 0.8 * RADIUS,
            charge: -2 * Q
        });
    }

    get oxygen1() { return this._oxygen1; }
    get oxygen2() { return this._oxygen2; }
    get carbon()  { return this._carbon; }
    get bond1() { return this._carbon.and(this._oxygen1); }
    get bond2() { return this._carbon.and(this._oxygen2); }

    reset() {
        this._oxygen1.reset();
        this._oxygen2.reset();
        this._carbon.reset();
    }

    apply(force) {
        this._oxygen1.apply(force);
        this._oxygen2.apply(force);
        this._carbon.apply(force);
        return this;
    }

    integrate(dt) {
        this._oxygen1.integrate(dt);
        this._oxygen2.integrate(dt);
        this._carbon.integrate(dt);
    }
}

const co2   = new CarbonDioxide(30 * Math.PI / 180);
const electricField = new ElectricField(new Vec3(1.7 * SPACING, 0, 0), 200, 8.0);
const coulombForce = CoulombForce.in(electricField);
const bondForce = new SpringForce({k: K, restLength: SPACING});
const bendForce = new BendForce({k: KT, restLength: SPACING});

const bondView1 = new SwitchableBondView({
    bondType: SwitchableBondView.Type.Spring,
    thickness: 0.04,
    tubularSegments: 750,
    radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
});
const bondView2 = new SwitchableBondView({
    bondType: SwitchableBondView.Type.Spring,
    thickness: 0.04,
    tubularSegments: 750,
    radiusFunction: pair => .3 * (pair.body1.radius + pair.body2.radius)
});

const dt = 5e-13;
let simulatedTime = 0;
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
    .runsEvery(1e-2)
    .substeps(2)
    .onStep(() => {
        electricField.update(simulatedTime);

        co2.apply(coulombForce);
        co2.bond1.apply(bondForce);
        co2.bond2.apply(bondForce);
        co2.bond1.and(co2.bond2).apply(bendForce);
        co2.integrate(dt);

        simulatedTime += dt;
    })
    .onReset(() => {
        co2.reset();
        electricField.update(0);
        simulatedTime = 0;
    })
    .bind(co2.oxygen1.alwaysWith(new Sphere({ color: 0x00ff00, segments: 36 })))
    .bind(co2.oxygen2.alwaysWith(new Sphere({ color: 0x00ff00, segments: 36 })))
    .bind(co2.carbon.alwaysWith(new Sphere({ color: 0xff0000, segments: 36 })))
    .bind(co2.oxygen1.and(co2.carbon).alwaysWith(bondView1))
    .bind(co2.oxygen2.and(co2.carbon).alwaysWith(bondView2))
    .bind(electricField.alwaysWith(new Arrow({
        color: 0xff00ff,
        round: true,
        size: 1.0e-11,
        magnitudeMap: magnitude => magnitude
    })))
    .append(new RadioGroup()
        .add("8 ", () => electricField.frequency = 8.0)
        .add("5.291 ", () => electricField.frequency = 5.291)
        .add("1.5 ", () => electricField.frequency = 1.5)
        .add("2.76 ", () => electricField.frequency = 2.76)
        .checked(0)
    )
    .append(new RadioGroup()
        .add("Springs", () => {
            bondView1.bondType = SwitchableBondView.Type.Spring;
            bondView2.bondType = SwitchableBondView.Type.Spring;
        })
        .add("Cylinders", () => {
            bondView1.bondType = SwitchableBondView.Type.Cylinder;
            bondView2.bondType = SwitchableBondView.Type.Cylinder;
        })
        .checked(0)
    );

