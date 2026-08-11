import {
    Vec3, Simulation, Sphere, Box, Slider, Range, SwitchableBondView, RadialSymmetricBody,
    MathPhysicsModelBehavior, SpringForce, Force, UniformGravitationalForce, Block
} from "../../../src/index.js";

/**
 * Artificial restoring force used to keep the chain close to
 * the horizontal/vertical corner around the pivot.
 */
class PivotForce extends Force {
    constructor({ springConstant, distance }) {
        super();

        this._springConstant = springConstant;
        this._distance = distance;
    }

    _calculateForceOn(body) {
        const pos = body.position;
        const d = this._distance;

        this._forceVector.set(0, 0, 0);

        if (pos.y < 0 && pos.y > -d && pos.x < -d)
            this._forceVector.set(0, -pos.y, 0);

        if (pos.x < 0 && pos.x > -d && pos.y < -d)
            this._forceVector.set(-pos.x, 0, 0);

        if (pos.x < 0 && pos.x > -d && pos.y < 0 && pos.y > -d)
            this._forceVector.set(-pos.x, -pos.y, 0);
    }

    applyTo(body) {
        this._calculateForceOn(body);
        body.force.addScaledVector(this._forceVector, this._springConstant);
    }
}

const gravitationalForce = new UniformGravitationalForce();
class ChainDrop extends MathPhysicsModelBehavior {
    constructor({
        totalBalls = 20,
        length = 1,
        mass = 0.1,
        amountHanging = 0.2,
        damping = 0.0
    } = {}) {
        super();

        this._totalBalls = totalBalls;
        this._length = length;
        this._mass = mass;
        this._amountHanging = amountHanging;
        this._interBallLength = length / (totalBalls - 1);
        this._balls = [];
        this._bonds = [];

        this._pivotForce = new PivotForce({
            springConstant: .5 * 300,
            distance: this._interBallLength / 2
        });
        this._springForce = new SpringForce({
            k: 300 / totalBalls,
            restLength: this._interBallLength,
            damping: damping
        });

        this._createBalls();
        this._createBonds();
    }

    get balls() { return this._balls; }
    get bonds() { return this._bonds; }
    get springConstant() { return this._springForce.k; }
    get endBall() { return this._balls[this._balls.length - 1]; }
    get ballRadius() { return this._length / 40; }
    set damping(value) { this._springForce.damping = value; }
    get damping() { return this._springForce.damping }

    set springConstant(value) {
        this._springForce.k = value / this._totalBalls;
        this._pivotForce._springConstant = .5 * value;
    }

    _createHorizontalChainSection(position, spacing, bodyMass) {
        for (let i = 0; i < this._totalBalls; i++) {
            if (position.x > 0)
                break;

            this._balls.push(new RadialSymmetricBody({
                position: position.clone(),
                velocity: new Vec3(),
                mass: bodyMass,
                radius: this.ballRadius
            }));

            position.x += spacing;
        }
    }

    _createVerticalChainSection(position, spacing, bodyMass) {
        position = this._balls[this._balls.length - 1].position.clone();
        while (position.y > -this._amountHanging) {
            position.y -= spacing;
            this._balls.push(new RadialSymmetricBody({
                position: position.clone(),
                velocity: new Vec3(),
                mass: bodyMass,
                radius: this.ballRadius
            }));
        }
    }

    _createBalls() {
        const spacing = this._interBallLength;
        const bodyMass = this._mass / this._totalBalls;
        let position = new Vec3(-this._length + this._amountHanging, 0, 0);

        this._createHorizontalChainSection(position, spacing, bodyMass);
        this._createVerticalChainSection(position, spacing, bodyMass);
    }

    _createBonds() {
        for (let i = 0; i < this._balls.length - 1; i++)
            this._bonds.push(this._balls[i].and(this._balls[i + 1]));
    }

    update(dt) {
        for (const bond of this._bonds)
            bond.apply(this._springForce);

        for (const ball of this._balls)
            ball.apply(gravitationalForce)
                .apply(this._pivotForce)
                .integrate(dt);
    }

    reset() {
        for (const ball of this._balls)
            ball.reset();

        for (const bond of this._bonds)
            bond.reset();
    }
}

const chain = new ChainDrop({
    totalBalls: 20,
    length: 1,
    mass: 0.1,
    amountHanging: 0.2,
    damping: 0.0
});

const table = new Block({
    position: new Vec3(-.5 - chain.ballRadius, -.05 - chain.ballRadius, 0),
    size: new Vec3(1, 0.1, 0.3)
});

const physicsDt = 1e-4;
let acceleration = 0;
let simulationTime = 0;
const simulation = Simulation
    .with({
        htmlDivId: "chainDropContainer",
        cameraPosition: new Vec3(1, 0.5, 2).multiplyScalar(1.75),
        controlsTarget: new Vec3(.2, -.7, 0),
        fieldOfView: 30,
        scale: 1,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .substeps(20)
    .onStep(() => {
        chain.update(physicsDt);
        const endBall = chain.endBall;
        acceleration = endBall.force.y / endBall.mass;
        simulationTime += physicsDt;
    })
    .bind(table.onceWith(new Box({ color: 0x888888, opacity: 0.3 })))
    .append(
        new Slider("Spring force ")
            .on(chain)
            .withProperty("springConstant")
            .withRange(new Range(1, 100, 1))
            .withValue(chain.springConstant)
    )
    .append(
        new Slider("Damping ")
            .on(chain)
            .withProperty("damping")
            .withRange(new Range(0, 1, 0.01))
            .withValue(chain.damping)
    );

for (const ball of chain.balls)
    simulation.bind(ball.alwaysWith(new Sphere({ color: 0x00ffff, segments: 20})));

for (const bond of chain.bonds)
    simulation.bind(bond.alwaysWith(
        new SwitchableBondView({
            bondType: SwitchableBondView.Type.Spring,
            coils: 15,
            thickness: 0.04,
            tubularSegments: 400,
            color: 0xffff66
        }))
    );

/**
 * Acceleration graph.
 *
 * The exact dataDefinition format depends on the
 * UPlotGraph implementation used by Helion.
 */

simulation.setupGraphWith({
    dataDefinition: [
        {
            label: "t",
            value: () => simulationTime
        },
        {
            label: "a (chain end)",
            value: () => acceleration
        },
        {
            label: "g",
            value: () => -9.8
        }
    ],
    title: "Acceleration of chain end",
    xLabel: "Time [s]",
    yLabel: "Acceleration [m/s²]",
    maxPoints: 500,
    labelColor: "yellow"
});
