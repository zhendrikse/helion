import {
    Vec3, Simulation, Sphere, SwitchableBondView,
    Slider, Range, Lattice, LatticeView, CubicLatticeTopology, Transformation, Colour
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class BoundaryCondition extends Transformation {
    constructor({
        amplitude = 4,
        omega = 45,
        topology
    } = {}) {
        super();
        this._amplitude = amplitude;
        this._omega = omega;
        this._time = 0;
        this._topology = topology;
    }

    /** @param {Lattice} lattice */
    applyTo(lattice) {
        // Target an inner atom (not on the surface)
        // For 4x4x4, use (1,1,1) - first inner layer
        const targetIndex = this._topology 
            ? this._topology.index(2, 2, 2) 
            : lattice.bodyCount - 1;
        const targetBall = lattice.bodyAt(targetIndex);

        if (this._time < this.pulseDuration)
            targetBall.state.velocity.y = this._amplitude * Math.sin(this._omega * this._time);
    }

    /** @param {number} time */
    set time(time) { this._time = time; }
    get pulseDuration() { return 2 * Math.PI / this._omega; }
    /** @param {number} value */
    set omega(value) { this._omega = value; }
    /** @param {number} value */
    set amplitude(value) { this._amplitude = value; }
}

const topology = new CubicLatticeTopology({ nx: 4, ny: 4, nz: 4 });
const boundaryCondition = new BoundaryCondition({ topology });
const crystal = new Lattice({
    damping: 5e-3,
    bodySize: 0.07
})
.apply(topology);

// Fixate all surface atoms (outer layer)
for (let k = 0; k < topology._nz; k++)
    for (let j = 0; j < topology._ny; j++)
        for (let i = 0; i < topology._nx; i++)
            if (topology.isSurface(i, j, k)) 
                crystal.fixateBodyAt(topology.index(i, j, k));

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        color: new Colour(0x44eeee),
        castShadow: true
    },
    bondArgs: {
        thickness: 0.075,
        coils: 20,
        color: new Colour(0xffbb00),
        castShadow: true,
        tubularSegments: 400,
        bondType: SwitchableBondView.Type.Spring
    }
});

Simulation
    .with({
        htmlDivId: "cubicLatticeContainer",
        camera: {
            position: new Vec3(2, 1.25, 2.25).multiplyScalar(0.9),
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
        .withRange(new Range(0.1, 20, .01))
        .on(crystal)
        .withProperty("bondForce")
        .withValue(1.5)
    )
    .append(new Slider("Damping ")
        .withRange(new Range(0, 1, .01))
        .on(crystal)
        .withProperty("damping")
        .withValue(0.2)
    );

