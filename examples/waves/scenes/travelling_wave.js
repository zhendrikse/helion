import {
    RadialSymmetricBody, Vec3, Simulation, Sphere, Floor, Bond, SwitchableBondView, RadioGroup, RadioButton,
    Slider, Range, Vec2, Checkbox
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
class Chain {
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
        this._bonds = [];
        this._length = length;

        this.#createBalls(ballRadius, totalMass, count);

        for (let i = 0; i < count - 1; i++)
            this._bonds.push(Bond.between(this._balls[i].and(this._balls[i + 1]), {
                    k: 1.5 * (count - 1),
                    radius: ballRadius * .33,
                    restLength:  0.9 * length / (count - 1),
                    damping: 0.2
                }));
    }

    set bondForce(value) { this._bonds.forEach(bond => bond.k = (this.size -1) * value); }

    set omega(value) { this._omega = value; }

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

    updateBoundaryCondition(t) {
        const firstBall = this._balls[0];
        const x = -this._length / 2;
        firstBall.state.position = new Vec3(x, 0, 0);

        const halfWaveTime = 2 * Math.PI / this._omega;
        if (t < halfWaveTime)
            firstBall.state.position = new Vec3(x, this._amplitude * Math.sin(this._omega * t), 0);
    }

    update(t, dt) {
        this.updateBoundaryCondition(t);

        for (const ball of this._balls)
            ball.clearForce();

        for (const bond of this._bonds)
            bond.applyForce();

        for (let i = 1; i < this.size - 1; i++)
            this._balls[i].integrate(dt);
    }
}

const string = new Chain({
    amplitude: 1.5,
    count: 100,
    length: 20,
    ballRadius: 7.5e-2
});

const simulation = Simulation
    .with({
        htmlDivId: "travellingWaveContainer",
        cameraPosition: new Vec3(-10, .5, 1.5).multiplyScalar(1.5),
        shadowsEnabled: true,
        fieldOfView: 30,
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
        granularity: 20
    }));

// Attach spheres and helices to balls and springs
const sphereViews = [];
for (let i = 0; i < string.size; i++)
    sphereViews.push(new Sphere({ castShadow: true }));

const bondViews = [];
for (let i = 1; i < string.size; i++)
    bondViews.push(new SwitchableBondView({
        thickness: 4e-3,
        coils: 10,
        color: 0x00ff00,
        castShadow: true,
        tubularSegments: 100, // for performance
        bondType: SwitchableBondView.Type.Cylinder
    }));

bondViews.forEach((bond, i) => simulation.bind(string.bondAt(i).alwaysWith(bond)));
sphereViews.forEach((sphere, i) => simulation.bind(string.ballAt(i).alwaysWith(sphere)));

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
    .append(new Checkbox("Show nodes ")
        .addEventListener("change",
            event => sphereViews.forEach(sphere => sphere.visible = event.target.checked)
        )
        .checked(true)
    )
    .append(new Slider("Bond force ")
        .on(string)
        .withProperty("bondForce")
        .withRange(new Range(0.1, 20, .01))
        .withValue(1.5)
    )
    .append(new Slider("Omega ")
        .on(string)
        .withProperty("omega")
        .withRange(new Range(10, 100, 1))
        .withValue(45)
    );

