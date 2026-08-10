import {
    Vec3, Simulation, Sphere, SwitchableBondView, Arrow, RadioGroup, RadialSymmetricBody,
    MathPhysicsModelBehavior, VectorField
} from "../../../src/index.js";

const SPACING = 1.0E-10;
const K       = 5.0E-6;       // Tension / compression constant
const KT      = 5.0E-6;       // Torsion constant
const U       = 1.660E-27;
const Q       = 1.602E-19;
const RADIUS  = 3.0E-11;
const SCALE   = 1e10;

class ElectricField extends VectorField {
    constructor(position, magnitude = 0.0, frequency = 0.25) {
        super();

        this._position  = position.clone();
        this._magnitude = magnitude;
        this._frequency = frequency;
        this._time      = 0;
        this._axis = new Vec3();
    }

    update(time) {
        this._time = time;
        const omega = this._frequency * 2 * Math.PI * 1.00001E10;
        this._axis.set(0, 0.5 * SPACING * Math.cos(this._time * omega), 0);
    }

    sample(position, target) {
        const omega = this._frequency * 2 * Math.PI * 1.00001E10;
        target.set(0, this._magnitude * Math.cos(this._time * omega), 0);
    }

    get position() { return this._position; }
    get axis() { return this._axis; }
    set frequency(value) { this._frequency = value; }

    reset() {
        this._time = 0;
        this._axis.set(0, 0, 0);
    }
}

class Water extends MathPhysicsModelBehavior {
    constructor(bondAngle = 105 * Math.PI / 180) {
        super();

        this._bondAngle = bondAngle;
        const {
            oxygenPosition,
            hydrogen1Position,
            hydrogen2Position
        } = this._getPositions();

        this._oxygen = new RadialSymmetricBody({
            position: oxygenPosition,
            mass: 16 * U,
            radius: 1.2 * RADIUS,
            charge: -2 * Q
        });

        this._hydrogen1 = new RadialSymmetricBody({
            position: hydrogen1Position,
            mass: 1 * U,
            radius: 0.4 * RADIUS,
            charge: -Q
        });

        this._hydrogen2 = new RadialSymmetricBody({
            position: hydrogen2Position,
            mass: 1 * U,
            radius: 0.4 * RADIUS,
            charge: -Q
        });

        this._k       = K;
        this._kt      = KT;
        this._spacing = SPACING;
    }

    get oxygen() { return this._oxygen; }
    get hydrogen1() { return this._hydrogen1; }
    get hydrogen2() { return this._hydrogen2; }

    _getPositions(
        theta = 0,
        tilt = 20 * Math.PI / 180
    ) {
        const oxygenPosition = new Vec3(0, 0, 0);
        const angle1 = theta;
        const angle2 = this._bondAngle + theta;

        const hydrogen1Position =
            new Vec3(Math.cos(angle1),Math.sin(angle1) * Math.cos(tilt),Math.sin(angle1) * Math.sin(tilt))
                .multiplyScalar(SPACING);

        const hydrogen2Position =
            new Vec3(Math.cos(angle2),Math.sin(angle2) * Math.cos(tilt),Math.sin(angle2) * Math.sin(tilt))
                .multiplyScalar(SPACING);

        return {
            oxygenPosition,
            hydrogen1Position,
            hydrogen2Position
        };
    }

    reset() {
        this._oxygen.reset();
        this._hydrogen1.reset();
        this._hydrogen2.reset();
    }

    update(eField, dt) {
        const v1 = this._hydrogen1.position.clone().sub(this._oxygen.position);
        const v2 = this._hydrogen2.position.clone().sub(this._oxygen.position);

        const mag1 = v1.length();
        const mag2 = v2.length();

        // Bond angle
        let angle = 0;
        if (mag1 > 1e-20 && mag2 > 1e-20) {
            const cosAngle = Math.max(-1, Math.min(1, v1.dot(v2) / (mag1 * mag2)));
            angle = Math.acos(cosAngle);
        }

        const normV1 = mag1 > 1e-20 ? v1.clone().normalize() : new Vec3();
        const normV2 = mag2 > 1e-20 ? v2.clone().normalize() : new Vec3();
        const vSum = v1.clone().add(v2);
        const bondDirection = vSum.length() > 1e-20 ? vSum.normalize() : new Vec3();

        const E = new Vec3();
        eField.sample(this._hydrogen1.position, E);

        const coulombH1 = E.clone().multiplyScalar(this._hydrogen1.charge);
        const stretchH1 = normV1
            .clone()
            .multiplyScalar(-this._k * (mag1 - this._spacing));

        const torqueH1 = bondDirection
            .clone()
            .multiplyScalar(this._kt * this._spacing * (angle - this._bondAngle));

        this._hydrogen1.force.copy(coulombH1.add(stretchH1).add(torqueH1));

        eField.sample(this._hydrogen2.position, E);
        const coulombH2 = E.clone().multiplyScalar(this._hydrogen2.charge);

        const stretchH2 = normV2
            .clone()
            .multiplyScalar(-this._k * (mag2 - this._spacing));

        const torqueH2 = bondDirection
            .clone()
            .multiplyScalar(this._kt * this._spacing * (angle - this._bondAngle));

        this.hydrogen2.force.copy(coulombH2.add(stretchH2).add(torqueH2));

        eField.sample(this._oxygen.position, E);
        const coulombO = E.clone().multiplyScalar(this._oxygen.charge);

        const stretchO = normV1
            .clone()
            .multiplyScalar(this._k * (mag1 - this._spacing))
            .add(normV2.clone().multiplyScalar(this._k * (mag2 - this._spacing)));

        const torqueO = bondDirection
            .clone()
            .multiplyScalar(-2 * this._kt * this._spacing * (angle - this._bondAngle));

        this.oxygen.force.copy(coulombO.add(stretchO).add(torqueO));

        this.oxygen.integrate(dt);
        this.hydrogen1.integrate(dt);
        this.hydrogen2.integrate(dt);
    }
}

const water = new Water();
const field = new ElectricField(
    new Vec3(1.7 * SPACING, 0, 0),
    120.0,
    0.25
);
const electricArrow = new Arrow({
    color: 0xff00ff,
    round: true,
    size: 1.0e-11,
    magnitudeMap: magnitude => magnitude
});

Simulation
    .with({
        htmlDivId: "waterMoleculeContainer",
        scale: SCALE,
        cameraPosition: new Vec3(3, 1.5, 3),
        fieldOfView: 40,
        parameterMenuCollapsed: false,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(5e-13)
    .substeps(2)
    .onStep((clock, dt) => {
        field.update(clock.simulatedTime);
        water.update(field, dt);
    })
    .onReset(() => {
        water.reset();
        field.reset();
    })
    .bind(water.oxygen.alwaysWith(new Sphere({color: 0xff0000, segments: 36})))
    .bind(water.hydrogen1.alwaysWith(new Sphere({color: 0x0000ff, segments: 36})))
    .bind(water.hydrogen2.alwaysWith(new Sphere({color: 0x0000ff, segments: 36})))
    .bind(water.oxygen.and(water.hydrogen1).alwaysWith(new SwitchableBondView({
        bondType: SwitchableBondView.Type.Spring,
        coils: 40,
        thickness: 0.1,
        tubularSegments: 750,
        radiusFunction: pair => 0.15 * (pair.body1.radius + pair.body2.radius)
    })))
    .bind(water.oxygen.and(water.hydrogen2).alwaysWith(new SwitchableBondView({
        bondType: SwitchableBondView.Type.Spring,
        coils: 40,
        thickness: 0.1,
        tubularSegments: 750,
        radiusFunction: pair => 0.15 * (pair.body1.radius + pair.body2.radius)
    })))
    .bind(field.alwaysWith(electricArrow))
    .append(new RadioGroup()
        .add("0.25", () => field.frequency = 0.25)
        .add("8",    () => field.frequency = 8.0)
        .add("5.291", () => field.frequency = 5.291)
        .add("1.5",  () => field.frequency = 1.5)
        .add("2.76", () => field.frequency = 2.76)
        .checked(0)
    );
