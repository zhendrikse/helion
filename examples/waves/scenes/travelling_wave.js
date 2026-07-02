import {
    RadialSymmetricBody, Vec3, Simulation, Sphere, Floor, SwitchableBondView, RadioGroup, RadioButton,
    Slider, Range, Vec2, Checkbox, Lattice
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class BoundaryCondition {
    constructor({
        amplitude = 0.8,
        omega = 45
    } = {}) {
        this._amplitude = amplitude;
        this._omega = omega;
    }

    apply(chain, t) {
        const firstBall = chain.bodyAt(0);
        const halfWaveTime = 2 * Math.PI / this._omega;
        if (t < halfWaveTime)
            firstBall.state.position.y = this._amplitude * Math.sin(this._omega * t);
    }

    set omega(value) { this._omega = value; }
    set amplitude(value) { this._amplitude = value; }
}

const count = 100;
const length = 20;
const dx = length / (count - 1);
const ballRadius = 7.5e-2;
const totalMass = 0.025;

const boundaryCondition = new BoundaryCondition()
const string = new Lattice({count, length, ballRadius})
    .addBoundaryCondition(boundaryCondition);

for (let i = 0; i < count; i++)
    string.addBody(new RadialSymmetricBody({
        radius: ballRadius,
        mass: totalMass / count,
        position: new Vec3(-length / 2 + i * dx, 0, 0)
    }));

for (let i = 0; i < count - 1; i++)
    string.connect(string.bodyAt(i), string.bodyAt(i + 1), {
        k: 1.5 * (count - 1),
        radius: ballRadius * .33,
        restLength:  0.9 * length / (count - 1),
        damping: 0.2
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
sphereViews.forEach((sphere, i) => simulation.bind(string.bodyAt(i).alwaysWith(sphere)));

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
    .append(new Slider("Damping ")
        .on(string)
        .withProperty("damping")
        .withRange(new Range(0, 1, .01))
        .withValue(0.2)
    )
    .append(new Slider("Omega ")
        .on(boundaryCondition)
        .withProperty("omega")
        .withRange(new Range(10, 100, 1))
        .withValue(45)
    )
    .append(new Slider("Amplitude ")
        .on(boundaryCondition)
        .withProperty("amplitude")
        .withRange(new Range(.1, 1, .01))
        .withValue(0.8)
    );

