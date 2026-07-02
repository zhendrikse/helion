import {
    Vec3, Simulation, Sphere, Floor, SwitchableBondView,
    Slider, Range, Vec2, Lattice, LatticeView, ChainTopology
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

const boundaryCondition = new BoundaryCondition();
const chain = new Lattice()
    .apply(new ChainTopology())
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
        chain.update(clock.simulatedTime, dt)
    })
    .bind(chain.alwaysWith(latticeView))
    .addObject3D(new Floor({
        type: Floor.Type.WOOD_WICKER,
        position: new Vec3(0, -1.75, 0),
        planeSizeXy: new Vec2(200, 200),
        granularity: 20
    }))
    .append(latticeView.ui())
    .append(new Slider("Bond force ")
        .on(chain)
        .withProperty("bondForce")
        .withRange(new Range(0.1, 20, .01))
        .withValue(1.5)
    )
    .append(new Slider("Damping ")
        .on(chain)
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

