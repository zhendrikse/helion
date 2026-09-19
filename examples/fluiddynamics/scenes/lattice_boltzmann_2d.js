import {
    AdaptiveSymmetricNormalizer, ColorMappers, Colour, DiscreteFieldSurfaceView, DropdownMenu, FixedIntervalNormalizer,
    Interval, LatticeBoltzmannFluid2D, Simulation, TiledPlane, Vec3
} from '../../../src/index.js';

const NX = 160;
const NY = 80;
const CELL_SIZE = 0.08;

const fluid = new LatticeBoltzmannFluid2D({
    nx: NX,
    ny: NY,
    viscosity: 0.02,
    flowSpeed: 0.10,
    barrierX: Math.floor(NX * 0.15),
});

// const curlView = new DiscreteFieldSurfaceView({
//     colorMapper: ColorMappers.get(ColorMappers.Inferno),
//     //opacityFunction: v => Math.min(1, Math.abs(v - 0.5) * 5),
// });
// curlView.scale.set(CELL_SIZE, CELL_SIZE, 1);

const curlView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Inferno),
    normalizer: new AdaptiveSymmetricNormalizer(0.06),
    //opacityFunction: v => Math.min(1, Math.abs(v - 0.5) * 3)
});

const barrierView = new TiledPlane({
    cellSize: CELL_SIZE,
    colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: Colour.Black.asHexValue() }),
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    opacityFunction: value => value
});

barrierView.position.z = 0.01;
Simulation.with({
        htmlDivId: 'latticeBoltzmann2dContainer',
        camera: {
            position: new Vec3(0, 0, 12.5),
            orthographic: true,
            controls: false
        },
        headUpDisplay: true,
        lighting: { enabled: false },
        infoPanel: {
            text:
                '<strong>🌊 2D lattice-Boltzmann fluid</strong><br/>' +
                'A simple D2Q9 fluid flowing from left to right around a barrier. ' +
                'The background shows vorticity (curl).'
        }
    })
    .maxOutCpu(() => fluid.evolve(), 20, 30)
    .appendStartStopResetUI()
    .bind(fluid.curlField.alwaysWith(curlView))
    .bind(fluid.barrierField.onceWith(barrierView))
    .append(new DropdownMenu()
        .for(new ColorMappers())
        .withValue(ColorMappers.Inferno)
        // @ts-ignore
        .onChange(event => curlView._colorMapper = ColorMappers.get(event.target.value)));

