import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Slider, Range, Lattice, LatticeView, CubicLatticeTopology
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class CornerKick {
    constructor({
    } = {}) {
        this._done = false;
    }

    apply(lattice, t) {
        if (this._done) return;

        lattice.bodyAt(lattice.bodyCount - 1).state.position.y += .025;
        this._done = true;
    }

    reset() {
        this._done = false;
    }
}

const boundaryCondition = new CornerKick();
const crystal = new Lattice({
        damping: 0.05,
        bodySize: 0.07
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
        color: 0x44eeee,
        castShadow: true
    },
    bondArgs: {
        thickness: 3e-3,
        coils: 20,
        color: 0xffffaa,
        castShadow: true,
        tubularSegments: 300,
        bondType: SwitchableBondView.Type.Cylinder
    }
});

Simulation
    .with({
        htmlDivId: "cubicLatticeContainer",
        cameraPosition: new Vec3(2, 1.5, 2.25).multiplyScalar(.625),
        fieldOfView: 30,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-5)
    .substeps(50)
    .onStep((clock, dt) => crystal.update(clock.simulatedTime, dt))
    .onReset(() => boundaryCondition.reset())
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

