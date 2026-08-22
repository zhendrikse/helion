import {
    Vec3, Simulation, Floor, Box, Block, Slider, Range, Vec2, Lattice, LatticeView,
    ChainTopology, UniformGravitationalForce, DragForce, ThreeJsScene
} from "../../../src/index.js";
import 'uplot/dist/uPlot.min.css';

const count = 50;
const chainLength = 10;
const chain = new Lattice({
    k:  30,
    damping: 0.2
})
    .apply(new ChainTopology({
        count: count,
        length: chainLength,
        bondRestLength: 0.99 * chainLength / (count - 1)
    }))
    .fixateBodyAt(0)
    .fixateBodyAt(count - 1);

const latticeView = LatticeView.from({
    bodyArgs: {
        castShadow: true
    },
    bondArgs: {
        thickness: 0.075,
        coils: 6,
        color: 0xffff99,
        castShadow: true,
        radiusFunction: pair => .4 * (pair.body1.radius + pair.body2.radius)
    }
});

const pole1 = new Block({
    size: new Vec3(0.175, 2.85, 0.175),
    position: new Vec3(-5, -1.25, 0)
})
const pole2 = new Block({
    size: new Vec3(0.175, 2.85, 0.175),
    position: new Vec3(5, -1.25, 0)
})

const gravitationalForce = new UniformGravitationalForce();
const dragForce = new DragForce(1e-4);
Simulation
    .with({
        htmlDivId: "suspendedSpringContainer",
        camera: {
            position: new Vec3(-10, .25, 5).multiplyScalar(1.25),
            target: new Vec3(-1.5, -1.5, 0),
            fieldOfView: 20,
        },
        scene: {
            background: ThreeJsScene.Background.FOG,
        },
        viewport: {
            aspectRatio: 4/3
        },
        lighting: {
            shadows: true,
        }
    })
    .withMouseClickEventListener()
    .runsEvery(1e-3)
    .substeps(40)
    .advancesBy(5e-4)
    .onStep((clock, dt) => {
        chain
            .applyToBodies(dragForce)
            .applyToBodies(gravitationalForce)
            .integrate(dt);
    })
    .bind(chain.alwaysWith(latticeView))
    .bind(pole1.onceWith(new Box({ color: 0x855E42 })))
    .bind(pole2.onceWith(new Box({ color: 0x855E42 })))
    .addObject3D(new Floor({
        type: Floor.Type.WOOD_WICKER,
        position: new Vec3(0, -2.75, 0),
        planeSizeXy: new Vec2(200, 200),
        granularity: 20
    }))
    .append(new Slider("Bond force ")
        .on(chain)
        .withProperty("bondForce")
        .withRange(new Range(10, 1000, 1))
        .withValue(30)
    )
    .append(new Slider("Damping ")
        .on(chain)
        .withProperty("damping")
        .withRange(new Range(0, .5, .01))
        .withValue(0.2)
    );

latticeView.nodesVisible = false;
