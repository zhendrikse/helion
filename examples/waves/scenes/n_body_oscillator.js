import {
    Vec3, Simulation, Sphere, Floor, SwitchableBondView, Transformation,
    Slider, Range, Vec2, ChainTopology, Lattice, LatticeView, ThreeJsScene, UPlotGraph, Colour
} from '../../../src/index.js';
import 'uplot/dist/uPlot.min.css';
import {DoubleSide, MeshStandardMaterial, Vector2} from "three";
import woodWicketColorUrl from "./textures/Wood_Wicker_011_color.png";
import woodWicketRoughnessUrl from "./textures/Wood_Wicker_011_roughness.png";
import woodWicketNormalUrl from "./textures/Wood_Wicker_011_normal.png";

class InitialDisplacement extends Transformation {
    constructor(displacement = new Vec3(7, 0, 0)) {
        super();
        this._displacement = displacement;
    }

    /** @param {Lattice} lattice */
    applyTo(lattice) {
        lattice.bodyAt(0).position.add(this._displacement);
    }
}

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
    .apply(new InitialDisplacement());

const latticeView = LatticeView.from({
    bodyView: Sphere,
    bondView: SwitchableBondView,
    bodyArgs: {
        castShadow: true,
        color: Colour.Red
    },
    bondArgs: {
        thickness: 0.075,
        tubularSegments: 600,
        coils: 30,
        color: new Colour(0xffff4d),
        castShadow: true
    }
});
latticeView.position.y = 4;

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 't' },
        { label: 'left', color: Colour.Blue },
        { label: 'right', color: Colour.Red },
        { label: 'ball3', color: Colour.Red },
        { label: 'ball4', color: Colour.Red },
        { label: 'ball5', color: Colour.Blue }
    ],
    title: 'Kinetic Energy vs Time',
    xLabel: 'Time [s]',
    yLabel: 'Displacement'
});

const simulation = Simulation
    .with({
        htmlDivId: 'oscillatorContainer',
        camera: {
            position: new Vec3(17, 6, -4).multiplyScalar(1.75),
            fieldOfView: 45
        },
        scene: { background: ThreeJsScene.Background.FOG },
        lighting: { shadows: true },
        viewport: { aspectRatio: '19/12' }
    })
    .withMouseClickEventListener()
    .runsEvery(4e-3)
    .advancesBy(1e-3)
    .addObject3D(new Floor({
        planeSizeXy: new Vec2(300, 300),
        planeMaterial: new MeshStandardMaterial({
            normalScale: new Vector2(100, 100),
            roughness: 1,
            map: Floor.loadTexture(woodWicketColorUrl, 15),
            roughnessMap: Floor.loadTexture(woodWicketRoughnessUrl, 15),
            normalMap: Floor.loadTexture(woodWicketNormalUrl, 15),
            side: DoubleSide
        })
    }))
    .addGraph(graph)
    .onStep((clock, dt) => {
        chain.integrate(dt);

        if (!simulation.isRunning)
            return;

        const plotData = [clock.clockTime];
        for (let i = 0; i < chain.bodyCount; i++)
            plotData.push(chain.bodyAt(i).position.x);

        graph.push(plotData);
    })
    .bind(chain.alwaysWith(latticeView))
    .onReset(() => {
        const plotData = [0];
        for (let i = 0; i < chain.size; i++)
            plotData.push(chain.ballAt(i).position.x);
        graph.reset();
        graph.push(plotData);
        chain.apply(new InitialDisplacement());
    })
    .append(latticeView.ui())
    .append(new Slider('Damping ')
        .withRange(new Range(0, 1, .01))
        .on(chain)
        .withProperty('damping')
        .withValue(0.2)
    );

