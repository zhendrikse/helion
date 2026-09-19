import {
    AdaptiveSymmetricNormalizer, ColorMappers, Colour, FixedIntervalNormalizer,
    Interval, LatticeBoltzmannFluid2D, Simulation, TiledPlane, Vec3
} from '../../../src/index.js';

const NX = 150;
const NY = 75;
const CELL_SIZE = 0.08;

const fluid = new LatticeBoltzmannFluid2D({
    nx: NX,
    ny: NY,
    viscosity: 0.02,
    flowSpeed: 0.10,
    barrierX: Math.floor(NX * 0.15),
});

const curlView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Seismic),
    normalizer: new AdaptiveSymmetricNormalizer(0.04),
    //opacityFunction: v => Math.min(1, Math.abs(v - 0.5) * 3)
});

const barrierView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: Colour.Black.asHexValue() }),
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => value
});

barrierView.position.z = 0.01;

const simulation = Simulation
    .with({
        htmlDivId: 'latticeBoltzmann2dContainer',
        camera: {
            position: new Vec3(0, 0, 15),
            orthographic: true,
            controls: false
        },
        headUpDisplay: false,
        lighting: { enabled: false },
        infoPanel: {
            text:
                '<strong>🌊 2D lattice-Boltzmann fluid</strong><br/>' +
                'A simple D2Q9 fluid flowing from left to right around a barrier. ' +
                'The background shows vorticity (curl).'
        }
    })
    .maxOutCpu(() => fluid.evolve())
    .appendStartStopResetUI();

simulation.bind(fluid.curlField.alwaysWith(curlView));
simulation.bind(fluid.barrierField.alwaysWith(barrierView));
