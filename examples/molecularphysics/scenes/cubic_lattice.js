import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Slider, Range, Lattice, LatticeView, CubicLatticeTopology, Transformation
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class BoundaryCondition extends Transformation {
    constructor({
        amplitude = 0.1,
        omega = 45,
    } = {}) {
        super();
        this._amplitude = amplitude;
        this._omega = omega;
        this._time = 0;
    }

    applyTo(lattice) {
        const cornerBall = lattice.bodyAt(lattice.bodyCount - 1);

        if (this._time < this.pulseDuration)
            cornerBall.state.velocity.y = this._amplitude * Math.sin(this._omega * this._time);
    }

    set time(time) { this._time = time; }
    get pulseDuration() { return 2 * Math.PI / this._omega; }
    set omega(value) { this._omega = value; }
    set amplitude(value) { this._amplitude = value; }
}

const boundaryCondition = new BoundaryCondition();
const crystal = new Lattice({
        damping: 0.05,
        bodySize: 0.07
    })
    .apply(new CubicLatticeTopology({
        nx: 3,
        ny: 3,
        nz: 3
    }));

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        color: 0x44eeee,
        castShadow: true
    },
    bondArgs: {
        thickness: 0.05,
        coils: 20,
        color: 0xffffaa,
        castShadow: true,
        tubularSegments: 400,
        bondType: SwitchableBondView.Type.Cylinder
    }
});

Simulation
    .with({
        htmlDivId: "cubicLatticeContainer",
        camera: {
            position: new Vec3(2, 1.5, 2.25).multiplyScalar(.625),
            fieldOfView: 30,
        }
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .advancesBy(1e-4)
    .substeps(5)
    .onStep((clock, dt) => {
        boundaryCondition.time = clock.simulatedTime;
        crystal.apply(boundaryCondition);
        crystal.integrate(dt)
    })
    .bind(crystal.alwaysWith(latticeView))
    .append(latticeView.ui())
    .append(new Slider("Bond force ")
        .on(crystal)
        .withProperty("bondForce")
        .withRange(new Range(0.1, 20, .01))
        .withValue(1.5)
    )
    .append(new Slider("Damping ")
        .on(crystal)
        .withProperty("damping")
        .withRange(new Range(0, 1, .01))
        .withValue(0.2)
    );

