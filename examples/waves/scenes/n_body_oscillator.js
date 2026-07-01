import {
    RadialSymmetricBody, Vec3, Simulation, Sphere, Floor, Bond, SwitchableBondView, RadioGroup, RadioButton,
    Slider, Range, Vec2
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

//
// Physics model
//
class Chain {
    constructor(numBalls = 5, k = 300, damping = 0.5) {
        this._damping = damping;
        this._balls = [];
        this._bonds = [];

        for (let i = 0; i < numBalls; i++) {
            this._balls.push(new RadialSymmetricBody({
                position: new Vec3(i * 10 - 30, 3, 0),
                radius: 1,
                mass: 1.5
            }));

            if (i !== 0)
                this._bonds.push(Bond.between(this._balls[i - 1].and(this._balls[i]), k, 0.5));
        }
    }

    get size() { return this._balls.length; }

    ballAt(index) { return this._balls[index]; }
    bondAt(index) { return this._bonds[index]; }

    set damping(damping) { this._damping = damping; }

    _updateChainSegment(left, right, bond, dt) {
        const relativeVelocity = left.velocity.clone().sub(right.velocity);
        const dampingForce = relativeVelocity
            .projectOnVector(bond.axis.clone().normalize())
            .multiplyScalar(this._damping);
        const force = bond.force.add(dampingForce);

        left.apply(force.clone().negate(), dt);
        right.apply(force, dt);
        bond.synchronize();
    }

    evolve(dt) {
        for (let i = 0; i < this._balls.length - 1; i++)
            this._updateChainSegment(this._balls[i], this._balls[i + 1], this._bonds[i], dt);
    }

    initialDisturbance(displacement = 5) {
        this._balls[0].position.add(new Vec3(displacement, 0, 0));
        this._bonds[0].synchronize();
    }
}

const chain = new Chain();
chain.initialDisturbance(7);

const simulation = Simulation
    .with({
        htmlDivId: "oscillatorContainer",
        cameraPosition: new Vec3(17, 6, 17),
        shadowsEnabled: true,
        fieldOfView: 45,
        background: Simulation.Background.FOG,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .addObject3D(new Floor({
        type: Floor.Type.WOOD_WICKER,
        planeSizeXy: new Vec2(200, 200),
        granularity: 5
    }))
    .setupGraphWith({
            dataDefinition: [
                { label: "t" },
                { label: "left", color: "blue" },
                { label: "right", color: "red" },
                { label: "ball3", color: "red" },
                { label: "ball4", color: "red" },
                { label: "ball5", color: "blue" },
            ],
            title: "Kinetic Energy vs Time",
            xLabel: "Time [s]",
            yLabel: "Displacement"
        }
    )
    .onStep((clock, dt) => {
        const damping = 0.2;
        chain.evolve(dt);

        if (!simulation.isRunning)
            return;

        const plotData = [clock.clockTime];
        for (let i = 0; i < chain.size; i++)
            plotData.push(chain.ballAt(i).position.x);
        simulation.plot(plotData);
    })
    .onReset(() => {
        chain.initialDisturbance(7);
        const plotData = [0];
        for (let i = 0; i < chain.size; i++)
            plotData.push(chain.ballAt(i).position.x);
        simulation.plot(plotData);
    });

// Attach spheres and helices to balls and springs
const bondViews = [];
for (let i = 0; i < chain.size; i++) {
    const color = i === 0 || i === chain.size - 1 ? 0x3333ff : 0xff0000;
    const sphere = new Sphere({ color, castShadow: true });
    simulation.bind(chain.ballAt(i).alwaysWith(sphere));
    if (i === 0)
        continue;

    const bondView = new SwitchableBondView({
        thickness: 0.05,
        coils: 30,
        color: 0xffff4d,
        castShadow: true
    });
    simulation.bind(chain.bondAt(i - 1).alwaysWith(bondView));
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
        }))
    )
    .append(new Slider("Damping ")
        .withRange(new Range(0.2, 1, .01))
        .on(chain)
        .withProperty("damping")
        .withValue(0.5)
    );

