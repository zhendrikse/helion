import {
    Vec3, Simulation, Sphere, Floor, Bond, SwitchableBondView, RadioGroup,
    Slider, Range, Vec2, ChainTopology, Lattice, LatticeView
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

class InitialDisplacement {
    constructor(displacement = new Vec3(7, 0, 0)) {
        this._displacement = displacement;
        this._done = false;
    }

    apply(lattice) {
        if (this._done)
            return;

        lattice.bodyAt(0).position.add(this._displacement);
        this._done = true;
    }

    reset() {
        this._done = false;
    }
}

const displacement = new InitialDisplacement();
const chain = new Lattice({
        k: 300,
        damping: 0.5,
        bodySize: 1,
        bondRadius: 0.6
    })
    .apply(new ChainTopology({
        count: 5,
        length: 40,
        totalMass: 7.5
    }))
    .addBoundaryCondition(displacement);

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        castShadow: true,
        color: "red"
    },
    bondArgs: {
        thickness: 0.04,
        tubularSegments: 500,
        coils: 30,
        color: 0xffff4d,
        castShadow: true
    }
});
latticeView.position.y = 4

const simulation = Simulation
    .with({
        htmlDivId: "oscillatorContainer",
        cameraPosition: new Vec3(17, 6, -4).multiplyScalar(1.75),
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
        chain.update(clock.simulatedTime, dt);

        if (!simulation.isRunning)
            return;

        const plotData = [clock.clockTime];
        for (let i = 0; i < chain.bodyCount; i++)
            plotData.push(chain.bodyAt(i).position.x);

        simulation.plot(plotData);
    })
    .bind(chain.alwaysWith(latticeView))
    .onReset(() => {
        const plotData = [0];
        for (let i = 0; i < chain.size; i++)
            plotData.push(chain.ballAt(i).position.x);
        simulation.plot(plotData);
        displacement.reset();
    })
    .append(latticeView.ui())
    .append(new Slider("Damping ")
        .withRange(new Range(0, 1, .01))
        .on(chain)
        .withProperty("damping")
        .withValue(0.2)
    );

