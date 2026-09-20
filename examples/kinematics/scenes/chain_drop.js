import {
    Vec3, Simulation, Sphere, Box, Slider, Range, SwitchableBondView, RadialSymmetricBody,
    MathPhysicsModelBehavior, SpringForce, Force, UniformGravitationalForce, Block, G, UPlotGraph,
    BodyPair, Colour
} from '../../../src/index.js';
import {g} from '../../../src/model/phys/forces.js';

/**
 * Artificial restoring force used to keep the chain close to
 * the horizontal/vertical corner around the pivot.
 */
class PivotForce extends Force {
    /**
     * @param {{
     * springConstant?: number,
     * distance?: number
     * }} param0 
     */
    constructor({ springConstant, distance }) {
        super();

        this._springConstant = springConstant;
        this._distance = distance;
    }

    /** @param {Body} body */
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

    /** @param {Body} body */
    applyTo(body) {
        this._calculateForceOn(body);
        body.force.addScaledVector(this._forceVector, this._springConstant);
    }
}

const gravitationalForce = new UniformGravitationalForce();
class Chain extends MathPhysicsModelBehavior {
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
        /** @type {RadialSymmetricBody[]} */
        this._balls = [];
        /** @type {BodyPair[]} */
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

    /**
     * @param {Vec3} position
     * @param {number} spacing
     * @param {number} bodyMass
     */
    _createHorizontalChainSection(position, spacing, bodyMass) {
        for (let i = 0; i < this._totalBalls; i++) {
            if (position.x > 0)
                break;

            this._balls.push(new RadialSymmetricBody({
                position: position.clone(),
                mass: bodyMass,
                radius: this.ballRadius
            }));

            position.x += spacing;
        }
    }

    /**
     * @param {Vec3} position
     * @param {number} spacing
     * @param {number} bodyMass
     */
    _createVerticalChainSection(position, spacing, bodyMass) {
        position = this._balls[this._balls.length - 1].position.clone();
        while (position.y > -this._amountHanging) {
            position.y -= spacing;
            this._balls.push(new RadialSymmetricBody({
                position: position.clone(),
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

    /** @param {number} dt */
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

const chain = new Chain({
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

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 't', color: 'yellow' },
        { label: 'a (chain end)', color: 'white' },
        { label: 'g', color: 'red' }
    ],
    title: 'Acceleration of chain end',
    xLabel: 'Time [s]',
    yLabel: 'Acceleration [m/s²]',
    maxPoints: 500,
    labelColor: 'yellow'
});

const simulation = Simulation
    .with({
        htmlDivId: 'chainDropContainer',
        camera: {
            position: new Vec3(1, 0.5, 2).multiplyScalar(1.75),
            target: new Vec3(.2, -0.7, 0),
            fieldOfView: 30,
        },
        scene: {
            scale: 1
        }
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .substeps(20)
    .advancesBy(1e-4)
    .onStep((clock, dt) => chain.update(dt))
    .onFrame(timestep => {
        if (!simulation.isRunning)
            return;
        graph.push([timestep, chain.endBall.acceleration.y, g]);
    })
    .bind(table.onceWith(new Box({ color: new Colour(0x888888), opacity: 0.3 })))
    .addGraph(graph)
    .append(
        new Slider('Spring force ')
            .on(chain)
            .withProperty('springConstant')
            .withRange(new Range(1, 100, 1))
            .withValue(chain.springConstant)
    )
    .append(
        new Slider('Damping ')
            .on(chain)
            .withProperty('damping')
            .withRange(new Range(0, 1, 0.01))
            .withValue(chain.damping)
    );

for (const ball of chain.balls)
    simulation.bind(ball.alwaysWith(new Sphere({ color: Colour.Cyan, segments: 20})));

for (const bond of chain.bonds)
    simulation.bind(bond.alwaysWith(
        new SwitchableBondView({
            bondType: SwitchableBondView.Type.Spring,
            coils: 15,
            thickness: 0.04,
            tubularSegments: 400,
            color: new Colour(0xffff66)
        }))
    );

