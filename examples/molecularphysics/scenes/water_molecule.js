import {
    Vec3, Simulation, Sphere, SwitchableBondView, VectorView, RadioGroup, RadialSymmetricBody,
    MathPhysicsModelBehavior, VectorField, CoulombForce, SpringForce, Force, EC
} from "../../../src/index.js";

const BOND_LENGTH   = 1.0E-10;
const BOND_CONSTANT = 5.0E-6;       // Spring constant
const ANGLE_CONSTANT= 5.0E-6;       // Bend constant
const ATOMIC_MASS_UNIT= 1.660E-27;
const OXYGEN_RADIUS = 1.2 * 3.0E-11;
const HYDROGEN_RADIUS = 0.4 * 3.0e-11;
const WATER_ANGLE = 105 * Math.PI / 180;
const SCALE         = 1e10;

class ElectricField extends VectorField {
    constructor(position, magnitude = 0.0, frequency = 0.25) {
        super();

        this._position  = position.clone();
        this._magnitude = magnitude;
        this._frequency = frequency;
        this._time      = 0;
        this._direction = new Vec3();
    }

    sample(position, target) {
        target.set(0, this._magnitude * this.direction.y, 0);
    }

    get omega() { return this._frequency * 2 * Math.PI * 1.00001E10; }
    get direction() { return this._direction.set(0, Math.cos(this._time * this.omega), 0); }
    get position() { return this._position; }
    set frequency(value) { this._frequency = value; }
    set time(value) { this._time = value; }

    reset() {
        this._time = 0;
        this._direction.set(0, 0, 0);
    }
}

/**
 * TorqueForce force F = k * (theta - theta0) * u, where u is the unit 
 * vector along the bisector of the two bonds. The force is applied to 
 * the two outer atoms and the center atom in a tri-atomic molecule.
 * The force on the center atom is equal and opposite to the sum of the 
 * forces on the two outer atoms.
 */
class TorqueForce extends Force {
    constructor({ k, restAngle = 0, restLength }) {
        super();

        this._k = k;
        this._restAngle = restAngle;
        this._restLength = restLength;

        this._force = new Vec3();
        this._v1 = new Vec3();
        this._v2 = new Vec3();
        this._bisector = new Vec3();
    }

    _calculateForceOn(bondPairs) {
        const center = bondPairs.body1.body1;
        const outer1 = bondPairs.body1.body2;
        const outer2 = bondPairs.body2.body2;

        this._v1.copy(outer1.position).sub(center.position); // v1 = h1.pos - oxygen.pos
        this._v2.copy(outer2.position).sub(center.position); // v2 = h2.pos - oxygen.pos

        const mag1 = this._v1.length();
        const mag2 = this._v2.length();
        if (mag1 <= 1e-20 || mag2 <= 1e-20)
            return;

        // angle = acos(dot(v1, v2) / (|v1| |v2|))
        const cosAngle = Math.max(-1, Math.min(
            1,
            this._v1.dot(this._v2) / (mag1 * mag2)
        ));
        const angle = Math.acos(cosAngle);

        // norm(v1 + v2)
        this._bisector.copy(this._v1).add(this._v2);
        const bisectorLength = this._bisector.length();
        if (bisectorLength <= 1e-20)
            return;

        this._bisector.multiplyScalar(1 / bisectorLength);

        // torque_force = kt * spacing * (angle - bond_angle) * norm(v1 + v2)
        this._forceVector.copy(this._bisector).multiplyScalar(this._k * this._restLength * (angle - this._restAngle));
    }

    applyTo(bondPairs) {
        this._calculateForceOn(bondPairs);
        bondPairs.body1.body2.force.add(this._forceVector);
        bondPairs.body2.body2.force.add(this._forceVector);
        bondPairs.body1.body1.force.addScaledVector(this._forceVector, -2);
    }
}

class Water extends MathPhysicsModelBehavior {
    constructor(bondAngle) {
        super();

        this._bondAngle = bondAngle;
        const {
            oxygenPosition,
            hydrogen1Position,
            hydrogen2Position
        } = this._getPositions();

        this._oxygen = new RadialSymmetricBody({
            position: oxygenPosition,
            mass: 16 * ATOMIC_MASS_UNIT ,
            radius: OXYGEN_RADIUS,
            charge: -2 * EC
        });

        this._hydrogen1 = new RadialSymmetricBody({
            position: hydrogen1Position,
            mass: ATOMIC_MASS_UNIT ,
            radius: HYDROGEN_RADIUS,
            charge: EC
        });

        this._hydrogen2 = new RadialSymmetricBody({
            position: hydrogen2Position,
            mass: ATOMIC_MASS_UNIT ,
            radius: HYDROGEN_RADIUS,
            charge: EC
        });
    }

    get oxygen() { return this._oxygen; }
    get hydrogen1() { return this._hydrogen1; }
    get hydrogen2() { return this._hydrogen2; }
    get bond1() { return this._oxygen.and(this._hydrogen1); }
    get bond2() { return this._oxygen.and(this._hydrogen2); }

    _getPositions(
        theta = 0,
        tilt = 20 * Math.PI / 180
    ) {
        const angle2 = this._bondAngle + theta;
        return {
            oxygenPosition: new Vec3(0, 0, 0),
            hydrogen1Position:
                new Vec3(Math.cos(theta),Math.sin(theta) * Math.cos(tilt),Math.sin(theta) * Math.sin(tilt))
                    .multiplyScalar(BOND_LENGTH  ),
            hydrogen2Position:
                new Vec3(Math.cos(angle2),Math.sin(angle2) * Math.cos(tilt),Math.sin(angle2) * Math.sin(tilt))
                    .multiplyScalar(BOND_LENGTH  )
        };
    }

    reset() {
        this._oxygen.reset();
        this._hydrogen1.reset();
        this._hydrogen2.reset();
    }

    apply(force) {
        this._oxygen.apply(force);
        this._hydrogen1.apply(force);
        this._hydrogen2.apply(force);
        return this;
    }

    integrate(dt) {
        this._oxygen.integrate(dt);
        this._hydrogen1.integrate(dt);
        this._hydrogen2.integrate(dt);
    }
}

const water = new Water(WATER_ANGLE);
const electricField = new ElectricField(new Vec3(1.7 * BOND_LENGTH  , 0, 0), 120.0, 0.25);
const coulombForce = CoulombForce.in(electricField);
const bondForce = new SpringForce({ k: BOND_CONSTANT, restLength: BOND_LENGTH   });
const torqueForce = new TorqueForce({ k: ANGLE_CONSTANT , restAngle: WATER_ANGLE, restLength: BOND_LENGTH   });

const electricArrow = new VectorView({
    vectorProperty: body => body.direction,
    color: 0xff00ff,
    size: 1.0e-11,
    magnitudeMap: magnitude => magnitude * BOND_LENGTH * 0.5
});

const bondView1 = new SwitchableBondView({
    bondType: SwitchableBondView.Type.Spring,
    coils: 40,
    thickness: 0.1,
    tubularSegments: 750,
    radiusFunction: pair => 0.15 * (pair.body1.radius + pair.body2.radius)
});

const bondView2 = new SwitchableBondView({
    bondType: SwitchableBondView.Type.Spring,
    coils: 40,
    thickness: 0.1,
    tubularSegments: 750,
    radiusFunction: pair => 0.15 * (pair.body1.radius + pair.body2.radius)
});

Simulation
    .with({
        htmlDivId: "waterMoleculeContainer",
        camera: {
            position: new Vec3(3, 0, 3),
            fieldOfView: 40,
        },
        scene: {
            scale: SCALE
        },
        viewport: {
            aspectRatio: "4/3"
        },
        parameterMenuCollapsed: false
    })
    .withMouseClickEventListener()
    .runsEvery(2.5e-3)
    .substeps(5)
    .advancesBy(5e-13)
    .onStep((clock, dt) => {
        electricField.time = clock.simulatedTime;

        water.apply(coulombForce);
        water.bond1.apply(bondForce);
        water.bond2.apply(bondForce);
        water.bond1.and(water.bond2).apply(torqueForce);
        water.integrate(dt);
    })
    .onReset(() => {
        water.reset();
        electricField.reset();
    })
    .bind(water.oxygen.alwaysWith(new Sphere({color: 0xff0000, segments: 36})))
    .bind(water.hydrogen1.alwaysWith(new Sphere({color: 0x0000ff, segments: 36})))
    .bind(water.hydrogen2.alwaysWith(new Sphere({color: 0x0000ff, segments: 36})))
    .bind(water.oxygen.and(water.hydrogen1).alwaysWith(bondView1))
    .bind(water.oxygen.and(water.hydrogen2).alwaysWith(bondView2))
    .bind(electricField.alwaysWith(electricArrow))
    .append(new RadioGroup()
        .add("0.25", () => electricField.frequency = 0.25)
        .add("8",    () => electricField.frequency = 8.0)
        .add("5.291", () => electricField.frequency = 5.291)
        .add("1.5",  () => electricField.frequency = 1.5)
        .add("2.76", () => electricField.frequency = 2.76)
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
