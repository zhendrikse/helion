import {
    RadialSymmetricBody, Vec3, Simulation, Sphere, Floor, Bond, SwitchableBondView, RadioGroup, RadioButton,
    Slider, Range, Vec2
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
class String1D {
    constructor({
        count = 80,
        length = 10,
        totalMass = 0.025,
        amplitude = 0.8,
        ballRadius = 0.05,
        omega = 45
    } = {}) {
        this._amplitude = amplitude;
        this._omega = omega;
        this._balls = [];
        this._forces = [];
        this._bonds = [];

        this._length = length;
        this._l0 = 0.9 * length / (count - 1);

        this.#createBalls(ballRadius, totalMass, count);
        this.#createBonds(count);
        for (let i = 0; i < count; i++)
            this._forces.push(new Vec3());
    }

    get size() { return this._balls.length }

    ballAt(index) { return this._balls[index]; }

    bondAt(index) { return this._bonds[index]; }

    #createBalls(radius, totalMass, count) {
        const dx = this._length / (count - 1);
        const mass = totalMass / count;
        const left = -this._length / 2;

        for (let i = 0; i < count; i++)
            this._balls.push(new RadialSymmetricBody({
                radius: radius,
                mass: mass,
                position: new Vec3(left + i * dx, 0, 0)
            }));
    }

    #createBonds(count) {
        for (let i = 0; i < count - 1; i++)
            this._bonds.push(Bond.between(this._balls[i].and(this._balls[i + 1]), 1.64 * (count - 1), 0.025));
    }

    #driveFirstBall(t) {
        const firstBall = this._balls[0];
        const x = -this._length / 2;
        firstBall.state.position = new Vec3(x, 0, 0);

        const halfWaveTime = 2 * Math.PI / this._omega;
        if (t < halfWaveTime)
            firstBall.state.position = new Vec3(x, this._amplitude * Math.sin(this._omega * t), 0);
    }

    #updateForces() {
        for (let i = 1; i < this.size - 1; i++) {
            const left = this._balls[i - 1];
            const right = this._balls[i + 1];

            this._forces[i].set(0, 0, 0);

            // left
            const deltaL = this._balls[i].positionVectorTo(left);
            const stretchL = deltaL.length() - this._l0;
            this._forces[i].add(deltaL.normalize().multiplyScalar(this._bonds[i - 1].k * stretchL));

            // right
            const deltaR = this._balls[i].positionVectorTo(right);
            const stretchR = deltaR.length() - this._l0;
            this._forces[i].add(deltaR.normalize().multiplyScalar(this._bonds[i].k * stretchR));
        }
    }

    #integrate(dt) {
        for (let i = 1; i < this.size - 1; i++)
            this._balls[i].apply(this._forces[i], dt);
    }

    update(t, dt) {
        this.#driveFirstBall(t);
        this.#updateForces();
        this.#integrate(dt);

        for (const bond of this._bonds)
            bond.synchronize();
    }

    reset() {
        for (let i = 0; i < this.size; i++) {
            this._balls[i].reset();
            this._forces[i].set(0, 0, 0);
        }

        for (const bond of this._bonds)
            bond.update(0);
    }
}

const string = new String1D({
    amplitude: 1.5,
    count: 100,
    length: 20,
    ballRadius: 7.5e-2
});

const simulation = Simulation
    .with({
        htmlDivId: "travellingWaveContainer",
        cameraPosition: new Vec3(-10, .5, 1.5).multiplyScalar(1.2),
        shadowsEnabled: true,
        fieldOfView: 60,
        background: Simulation.Background.FOG,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-4)
    .substeps(5)
    .onStep((clock, dt) => {
        string.update(clock.simulatedTime, dt)
    })
    .addObject3D(new Floor({
        type: Floor.Type.WOOD_WICKER,
        position: new Vec3(0, -1.75, 0),
        planeSizeXy: new Vec2(200, 200),
        granularity: 5
    }));

// Attach spheres and helices to balls and springs
const bondViews = [];
for (let i = 0; i < string.size; i++) {
    simulation.bind(string.ballAt(i).alwaysWith(new Sphere({ castShadow: true })));
    if (i === 0)
        continue;

    const bondView = new SwitchableBondView({
        thickness: 4e-3,
        coils: 10,
        color: 0x00ff00,
        castShadow: true,
        tubularSegments: 100, // for performance
        bondType: SwitchableBondView.Type.Cylinder
    });
    simulation.bind(string.bondAt(i - 1).alwaysWith(bondView));
    bondViews.push(bondView);
}

simulation
    .append(new RadioGroup(
        new RadioButton("Springs ")
            .checked(true)
            .addEventListener("change", event => {
                for (const bondView of bondViews)
                    bondView.bondType = SwitchableBondView.Type.Spring;
            }),
        new RadioButton("Cylinders")
            .addEventListener("change", event => {
                for (const bondView of bondViews)
                    bondView.bondType = SwitchableBondView.Type.Cylinder;
            })
        ).checked(1)
    )
//     .append(new Slider("Damping ")
//         .withRange(new Range(0.2, 1, .01))
//         .on(chain)
//         .withProperty("damping")
//         .withValue(0.5)
//     );

