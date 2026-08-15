import {
    Vec3, Simulation, Sphere, Floor, SwitchableBondView, Transformation,
    Slider, Range, Vec2, Lattice, LatticeView, ChainTopology
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class BoundaryCondition extends Transformation {
    constructor({
        amplitude = 0.8,
        omega = 45,
    } = {}) {
        super();
        this._amplitude = amplitude;
        this._omega = omega;
        this._time = 0;
    }

    applyTo(chain) {
        const firstBall = chain.bodyAt(0);

        if (this._time < this.pulseDuration)
            firstBall.state.position.y = this._amplitude * Math.sin(this._omega * this._time);
    }

    set time(time) { this._time = time; }
    get pulseDuration() { return 2 * Math.PI / this._omega; }
    set omega(value) { this._omega = value; }
    set amplitude(value) { this._amplitude = value; }
}

const count = 100;
const chainLength = 20;
const boundaryCondition = new BoundaryCondition();
const chain = new Lattice({
      k:  1.5 * (count - 1),
      damping: 0.2
    })
    .apply(new ChainTopology({
        count: count,
        length: chainLength,
        bondRestLength: 0.9 * chainLength / (count - 1) // Springs are intentionally stretched to create initial tension
    }))
    .fixateBodyAt(0)
    .fixateBodyAt(count - 1);

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        castShadow: true
    },
    bondArgs: {
        thickness: 0.05,
        coils: 20,
        color: 0x00ff00,
        castShadow: true,
        tubularSegments: 300,
        bondType: SwitchableBondView.Type.Cylinder
    }
});

Simulation
    .with({
        htmlDivId: "travellingWaveContainer",
        cameraPosition: new Vec3(-10, .25, 1.5).multiplyScalar(1.4),
        shadowsEnabled: true,
        fieldOfView: 30,
        background: Simulation.Background.FOG,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(2e-3)
    .substeps(20)
    .advancesBy(2e-4)
    .onStep((clock, dt) => {
        boundaryCondition.time = clock.simulatedTime;
        chain.apply(boundaryCondition);
        chain.integrate(dt);
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
        .withRange(new Range(10, 2000, 1))
        .withValue(1.5 * (count - 1))
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
