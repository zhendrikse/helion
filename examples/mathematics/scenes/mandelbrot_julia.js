import {
    Button, Colour, ColorMappers, DiscreteScalarField, DiscreteFieldSurfaceView,
    DropdownMenu, FixedIntervalNormalizer, Interval, Registry, Simulation,
    ThreeJsScene, Vec3, hsvToRgb
} from '../../../src/index.js';

const WIDTH = 600;
const HEIGHT = 400;
const MAX_ITERATIONS = 500;

const juliaConstants = {
    '0.325 + 0.417i': [0.325, 0.417],
    '0.4 + 0.4i': [0.4, 0.4],
    '-0.4 + 0.6i': [-0.4, 0.6],
    '-0.5251993 - 0.5251993i': [-0.5251993, -0.5251993],
    '0.285 + 0.001i': [0.285, 0.001],
    '-0.8 + 0.156i': [-0.8, 0.156],
    '0.8i': [0, 0.8],
    '-0.70176 - 0.3842i': [-0.70176, -0.3842]
};

const fractalRegistry = new Registry({
    label: 'Fractal',
    entries: {
        Mandelbrot: 'Mandelbrot',
        Julia: 'Julia',
        'Burning Ship': 'Burning Ship'
    }
});

const juliaRegistry = new Registry({
    label: 'Julia constant',
    entries: Object.fromEntries(Object.entries(juliaConstants).map(([name, value]) => [name, value]))
});

const colorRegistry = new Registry({
    label: 'Color scheme',
    entries: { RGB: 'RGB', Hue: 'Hue', Inferno: 'Inferno' }
});

/**
 * A scalar field containing the escape iteration count for every point
 * in the currently selected region of the complex plane.
 */
class FractalField extends DiscreteScalarField {
    constructor() {
        super({ nx: WIDTH, ny: HEIGHT });
        this.maxIterations = MAX_ITERATIONS;
        this.type = 'Mandelbrot';
        this.constant = juliaConstants['0.325 + 0.417i'];
        this.resetRange();
        this.compute();
    }

    resetRange() {
        const aspect = this.nx / this.ny;
        this.range = this.type === 'Julia'
            ? { reMin: -1.5 * aspect, reMax: 1.5 * aspect, imMin: -1.5, imMax: 1.5 }
            : this.type === 'Burning Ship'
                ? { reMin: -2.5, reMax: 1.5, imMin: -2, imMax: 2 }
                : { reMin: -2, reMax: 1, imMin: -1, imMax: 1 };
    }

    setType(type) {
        this.type = type;
        this.resetRange();
        this.compute();
    }

    setJuliaConstant(constant) {
        this.constant = constant;
        this.compute();
    }

    /** @param {number} factor */
    zoom(factor) {
        const centerRe = 0.5 * (this.range.reMin + this.range.reMax);
        const centerIm = 0.5 * (this.range.imMin + this.range.imMax);
        const halfWidth = 0.5 * (this.range.reMax - this.range.reMin) * factor;
        const halfHeight = 0.5 * (this.range.imMax - this.range.imMin) * factor;
        this.range = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.compute();
    }

    /** @param {number} u @param {number} v */
    recenter(u, v) {
        const centerRe = this.range.reMin + u * (this.range.reMax - this.range.reMin);
        const centerIm = this.range.imMin + v * (this.range.imMax - this.range.imMin);
        const halfWidth = 0.5 * (this.range.reMax - this.range.reMin);
        const halfHeight = 0.5 * (this.range.imMax - this.range.imMin);
        this.range = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.compute();
    }

    // The view uses a fixed normalization: escape counts are always in [0, maxIterations].
    rangeAt() {
        return new Interval(0, this.maxIterations);
    }

    compute() {
        const { reMin, reMax, imMin, imMax } = this.range;
        const reStep = (reMax - reMin) / (this.nx - 1);
        const imStep = (imMax - imMin) / (this.ny - 1);
        const [constantRe, constantIm] = this.constant;

        for (let y = 0; y < this.ny; y++) {
            const im = imMin + y * imStep;

            for (let x = 0; x < this.nx; x++) {
                const re = reMin + x * reStep;
                let zr = this.type === 'Julia' ? re : 0;
                let zi = this.type === 'Julia' ? im : 0;
                const cr = this.type === 'Julia' ? constantRe : re;
                const ci = this.type === 'Julia' ? constantIm : im;
                const escapeRadiusSquared = this.type === 'Burning Ship' ? 16 : 4;
                let magnitudeSquared = 0;
                let iteration = 0;

                while (magnitudeSquared <= escapeRadiusSquared && iteration < this.maxIterations) {
                    const oldReal = this.type === 'Burning Ship' ? Math.abs(zr) : zr;
                    const oldImaginary = this.type === 'Burning Ship' ? Math.abs(zi) : zi;
                    const nextReal = oldReal * oldReal - oldImaginary * oldImaginary + cr;
                    zi = 2 * oldReal * oldImaginary + ci;
                    zr = nextReal;
                    magnitudeSquared = zr * zr + zi * zi;
                    iteration++;
                }

                this.setValueAt(x, y, iteration);
            }
        }
    }
}

class FractalColorMapper {
    constructor(scheme) {
        this.scheme = scheme;
        this.inferno = ColorMappers.get(ColorMappers.Inferno);
    }

    /** @param {number} value @param {import('three').Color} target */
    map(value, target) {
        if (value >= 1) {
            target.setRGB(0, 0, 0);
        } else if (this.scheme === 'Hue') {
            hsvToRgb((value * 5) % 1, 1, 1, target);
        } else if (this.scheme === 'Inferno') {
            this.inferno.map(value, target);
        } else {
            target.setRGB(value, Math.sqrt(value), Math.pow(value, 0.2));
        }
    }
}

const fractal = new FractalField();
const fractalView = new DiscreteFieldSurfaceView({
    colorMapper: new FractalColorMapper('RGB'),
    normalizer: new FixedIntervalNormalizer(new Interval(0, MAX_ITERATIONS)),
    opacityFunction: () => 1,
    scale: 0.01
});
const fractalBinding = fractal.alwaysWith(fractalView);

const simulation = Simulation.with({
    htmlDivId: 'mandelbrotJuliaContainer',
    viewport: { aspectRatio: '3 / 2', parameterMenuCollapsed: false },
    camera: {
        position: new Vec3(0, 0, 10),
        target: new Vec3(0, 0, 0),
        orthographic: true,
        controls: false
    },
    scene: {
        background: ThreeJsScene.Background.PLAIN,
        backgroundColor: Colour.Black
    },
    lighting: { enabled: false },
    headUpDisplay: { enabled: false },
    infoPanel: {
        text: '<strong>Fractals</strong><br>' +
            'Explore the Mandelbrot set, Julia sets and the Burning Ship fractal. ' +
            'Click to recenter; use the mouse wheel or buttons to zoom.'
    }
});

const synchronize = () => fractalBinding.forceSynchronize();
simulation.bind(fractalBinding);

simulation
    .append(new DropdownMenu()
        .for(fractalRegistry)
        .withValue('Mandelbrot')
        .onChange(value => {
            fractal.setType(value);
        }))
    .append(new DropdownMenu()
        .for(juliaRegistry)
        .withValue('0.325 + 0.417i')
        .onChange(value => {
            fractal.setJuliaConstant(juliaConstants[value]);
        }))
    .append(new DropdownMenu()
        .for(colorRegistry)
        .withValue('RGB')
        .onChange(value => {
            fractalView.colorMapper = new FractalColorMapper(value);
        }))
    .append(new Button('Zoom in').withText('+')
        .onClick(() => {
            fractal.zoom(0.8);
        }))
    .append(new Button('Zoom out').withText('−')
        .onClick(() => {
            fractal.zoom(1.1);
        }))
    .append(new Button('Reset view')
        .onClick(() => {
            fractal.resetRange();
            fractal.compute();
        }));

simulation
    .onPointer('pointerdown', (x, y, event) => {
        if (event.button !== 0)
            return;
        fractal.recenter(x + 0.5, y + 0.5);
        synchronize();
    })
    .onPointer('wheel', (_x, _y, event) => {
        event.preventDefault();
        fractal.zoom(event.deltaY < 0 ? 0.8 : 1.1);
        synchronize();
    });
