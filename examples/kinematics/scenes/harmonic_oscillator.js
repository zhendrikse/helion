import {
    Vec3, Vec2, Simulation, Floor, Block, Slider, Range, Lattice, LatticeView,
    ChainTopology, UniformGravitationalForce, DragForce, ThreeJsScene, Colour, Box, UPlotGraph, Interval
} from '../../../src/index.js';
import 'uplot/dist/uPlot.min.css';
import {MeshStandardMaterial, TextureLoader, Vector2, DoubleSide} from "three";
import wood from '../../../src/textures/treeBark.jpg';
import grassColorUrl from './textures/grass.jpg';
import grassNormalUrl from './textures/grassNormal.jpg';

const count = 30;
const chainLength = 5;

const chain = new Lattice({
    k: 120,
    damping: 0.25,
    bodySize: 0.055
})
    .apply(new ChainTopology({
        count,
        length: chainLength,
        bondRestLength: 0.99 * chainLength / (count - 1),
        totalMass: 0.75,
        direction: new Vec3(0, -1, 0)
    }))
    .fixateBodyAt(0);

// The weight is an independent body, connected to the final spring element.
const weight = new Block({
    position: chain.bodyAt(count - 1).position.clone().add(new Vec3(0, -0.55, 0)),
    size: new Vec3(1, 1, 1),
    mass: 1
});

chain.connect(chain.bodyAt(count - 1), weight, {
    k: chain.k,
    restLength: 0.55,
    damping: chain.damping
});

const latticeView = LatticeView.from({
    bodyArgs: { castShadow: true },
    bondArgs: {
        thickness: 0.045,
        coils: 4,
        color: new Colour(0xffff99),
        castShadow: true,
        radiusFunction: () => 0.2
    }
});

const support = new Block({
    size: new Vec3(4, 0.25, 3),
    position: new Vec3(0, chainLength / 2 + 0.125, 0),
    fixed: true
});

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 't' },
        { label: 'Height', color: Colour.Yellow }
    ],
    title: 'Block height versus Time',
    xLabel: 'Time [s]',
    yLabel: 'Displacement',
    yRange: new Interval(-chainLength, chainLength),
    maxPoints: 5e4
});

const gravitationalForce = new UniformGravitationalForce();
const dragForce = new DragForce(-2e-4);
const woodMaterial = new MeshStandardMaterial({map: new TextureLoader().load(wood)});
Simulation
    .with({
        htmlDivId: 'harmonicOscillatorContainer',
        camera: {
            position: new Vec3(0, 0, 30),
            target: new Vec3(0, -5, 0),
            fieldOfView: 30
        },
        scene: { background: ThreeJsScene.Background.FOG },
        viewport: { aspectRatio: '3 / 4' },
        lighting: { shadows: true },
        infoPanel: {
            text: '<strong>Ꮺ Harmonic oscillator</strong><br/>Non-massless spring with weight'
        }
    })
    .withMouseClickEventListener()
    .addGraph(graph)
    .runsEvery(5e-4)
    .onStep((clock, dt) => {
        chain
            .applyToBodies(dragForce)
            .applyToBodies(gravitationalForce)
            .integrate(dt);

        weight
            .apply(dragForce)
            .apply(gravitationalForce)
            .integrate(dt);

        graph.push([clock.clockTime, weight.position.y + chainLength]);
    })
    .substeps(10)
    .bind(chain.alwaysWith(latticeView))
    .bind(weight.alwaysWith(new Box({
        material: woodMaterial,
        color: new Colour(0xffbb88),
        castShadow: true
    })))
    .bind(support.onceWith(new Box({
        material: woodMaterial,
        color: new Colour(0xDEB887),
        castShadow: true
    })))
    .addObject3D(new Floor({
        position: new Vec3(0, -chainLength * 2.5, 0),
        planeSizeXy: new Vec2(100, 100),
        planeMaterial: new MeshStandardMaterial({
            normalScale: new Vector2(3, 3),
            roughness: 1,
            map: Floor.loadTexture(grassColorUrl, 50),
            normalMap: Floor.loadTexture(grassNormalUrl, 50),
            side: DoubleSide
        })
    }))
    .append(new Slider('Spring stiffness ')
        .withRange(new Range(100, 500, 1))
        .on(chain)
        .withProperty('bondForce')
        .withValue(120)
    )
    .append(new Slider('Damping ')
        .withRange(new Range(0, 0.5, 0.01))
        .on(chain)
        .withProperty('damping')
        .withValue(0.25)
    );
latticeView.nodesVisible = false;