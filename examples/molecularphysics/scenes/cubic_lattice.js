import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Slider, Range, Lattice, LatticeView, CubicLatticeTopology
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class CornerKick {
    constructor({
        velocity = new Vec3(0, .5, 0)
    } = {}) {
        this._velocity = velocity;
        this._done = false;
    }

    apply(lattice, t) {
        if (this._done) return;

        lattice.bodyAt(0).state.velocity.copy(this._velocity);
        this._done = true;
    }
}

const boundaryCondition = new CornerKick();
const crystal = new Lattice({
        damping: 0.2,
        particleRadius: 0.08
    })
    .apply(new CubicLatticeTopology({
        nx: 3,
        ny: 3,
        nz: 3
    }))
    .addBoundaryCondition(boundaryCondition);

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        castShadow: true
    },
    bondArgs: {
        thickness: 4e-3,
        coils: 10,
        color: 0x00ff00,
        castShadow: true,
        tubularSegments: 100, // for performance
        bondType: SwitchableBondView.Type.Cylinder
    }
});

Simulation
    .with({
        htmlDivId: "cubicLatticeContainer",
        cameraPosition: new Vec3(2, 1.5, 2.25),
        fieldOfView: 30,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-4)
    .substeps(5)
    .onStep((clock, dt) => {
        crystal.update(clock.simulatedTime, dt)
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

