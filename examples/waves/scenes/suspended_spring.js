import {
    Vec3, Simulation, Floor, Box, Block, Slider, Range, Vec2, Lattice, LatticeView,
    ChainTopology, UniformGravitationalForce, DragForce, ThreeJsScene, Colour
} from '../../../src/index.js';
import 'uplot/dist/uPlot.min.css';
import {DoubleSide, MeshStandardMaterial, TextureLoader, Vector2} from "three";
import wood from "../../../src/textures/treeBark.jpg";
import woodWicketColorUrl from "./textures/Wood_Wicker_011_color.png";
import woodWicketRoughnessUrl from "./textures/Wood_Wicker_011_roughness.png";
import woodWicketNormalUrl from "./textures/Wood_Wicker_011_normal.png";

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
        color: new Colour(0xffff99),
        castShadow: true,
        radiusFunction: pair => .4 * (pair.body1.radius + pair.body2.radius)
    }
});

const pole1 = new Block({
    size: new Vec3(0.2, 2.85, 0.2),
    position: new Vec3(-5, -1.25, 0)
});
const pole2 = new Block({
    size: new Vec3(0.2, 2.85, 0.2),
    position: new Vec3(5, -1.25, 0)
});

const gravitationalForce = new UniformGravitationalForce();
const dragForce = new DragForce(-1e-4);
const woodMaterial = new MeshStandardMaterial({map: new TextureLoader().load(wood)})
Simulation
    .with({
        htmlDivId: 'suspendedSpringContainer',
        camera: {
            position: new Vec3(-10, .25, 5).multiplyScalar(1.25),
            target: new Vec3(-1.5, -1.5, 0),
            fieldOfView: 20,
        },
        scene: { background: ThreeJsScene.Background.FOG },
        viewport: { aspectRatio: 4/3 },
        lighting: { shadows: true }
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
    .bind(pole1.onceWith(new Box({ material: woodMaterial, color: new Colour(0x855E42) })))
    .bind(pole2.onceWith(new Box({ material: woodMaterial, color: new Colour(0x855E42) })))
    .addObject3D(new Floor({
        position: new Vec3(0, -2.75, 0),
        planeSizeXy: new Vec2(200, 200),
        planeMaterial: new MeshStandardMaterial({
            normalScale: new Vector2(100, 100),
            roughness: 1,
            map: Floor.loadTexture(woodWicketColorUrl, 20),
            roughnessMap: Floor.loadTexture(woodWicketRoughnessUrl, 20),
            normalMap: Floor.loadTexture(woodWicketNormalUrl, 20),
            side: DoubleSide
        })
    }))
    .append(new Slider('Bond force ')
        .withRange(new Range(10, 1000, 1))
        .on(chain)
        .withProperty('bondForce')
        .withValue(30)
    )
    .append(new Slider('Damping ')
        .withRange(new Range(0, .5, .01))
        .on(chain)
        .withProperty('damping')
        .withValue(0.2)
    );

latticeView.nodesVisible = false;
