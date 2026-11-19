import {
    Button, ColorMappers, DiscreteScalarField, DiscreteFieldSurfaceView,
    DropdownMenu, FixedIntervalNormalizer, Interval, Registry, Simulation, Transformation, Vec3
} from '../../../../src/index.js';

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
    entries: { RGB: 'RGB', Viridis: 'Viridis', RdYlBu: 'RdYlBu', Inferno: 'Inferno', Scientific: 'Scientific' }
});

/**
 * Base class for transformations that fill a scalar field with escape-time values.
 */
class EscapeTimeTransformation extends Transformation {
    constructor(maxIterations = MAX_ITERATIONS) {
        super();
        this.maxIterations = maxIterations;
    }

    /** @abstract @param {number} re @param {number} im */
    iterationsAt(re, im) { return this.maxIterations; }

    /** @param {DiscreteScalarField} field */
    applyTo(field) {
        const { reMin, reMax, imMin, imMax } = field.complexRange;
        const reStep = (reMax - reMin) / (field.nx - 1);
        const imStep = (imMax - imMin) / (field.ny - 1);

        for (let y = 0; y < field.ny; y++) {
            const im = imMin + y * imStep;
            for (let x = 0; x < field.nx; x++) {
                const re = reMin + x * reStep;
                field.setValueAt(x, y, this.iterationsAt(re, im));
            }
        }
    }
}

/** z(n+1) = z(n)^2 + c, with c equal to the sampled point. */
class MandelbrotTransformation extends EscapeTimeTransformation {
    /** @param {number} re @param {number} im */
    iterationsAt(re, im) {
        const cr = re, ci = im;
        let zr = 0, zi = 0, magnitudeSquared = 0, iteration = 0;
        while (magnitudeSquared <= 4 && iteration < this.maxIterations) {
            const nextReal = zr * zr - zi * zi + cr;
            zi = 2 * zr * zi + ci;
            zr = nextReal;
            magnitudeSquared = zr * zr + zi * zi;
            iteration++;
        }
        return iteration;
    }
}

/** z(n+1) = z(n)^2 + c, with a fixed c and the sampled point as z(0). */
class JuliaTransformation extends EscapeTimeTransformation {
    /** @param {[number, number]} constant */
    constructor(constant, maxIterations = MAX_ITERATIONS) {
        super(maxIterations);
        this.constant = constant;
    }

    /** @param {number} re @param {number} im */
    iterationsAt(re, im) {
        const [cr, ci] = this.constant;
        let zr = re, zi = im, magnitudeSquared = zr * zr + zi * zi, iteration = 0;
        while (magnitudeSquared <= 4 && iteration < this.maxIterations) {
            const nextReal = zr * zr - zi * zi + cr;
            zi = 2 * zr * zi + ci;
            zr = nextReal;
            magnitudeSquared = zr * zr + zi * zi;
            iteration++;
        }
        return iteration;
    }
}

/** z(n+1) = (|Re(z)| + i|Im(z)|)^2 + c, with c equal to the sampled point. */
class BurningShipTransformation extends EscapeTimeTransformation {
    /** @param {number} re @param {number} im */
    iterationsAt(re, im) {
        const cr = re, ci = im;
        let zr = 0, zi = 0, magnitudeSquared = 0, iteration = 0;
        while (magnitudeSquared <= 16 && iteration < this.maxIterations) {
            const oldReal = Math.abs(zr);
            const oldImaginary = Math.abs(zi);
            const nextReal = oldReal * oldReal - oldImaginary * oldImaginary + cr;
            zi = 2 * oldReal * oldImaginary + ci;
            zr = nextReal;
            magnitudeSquared = zr * zr + zi * zi;
            iteration++;
        }
        return iteration;
    }
}

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
        this.transformation = new MandelbrotTransformation();
        this.apply(this.transformation);
    }

    resetRange() {
        const aspect = this.nx / this.ny;
        this.complexRange = this.type === 'Julia'
            ? { reMin: -1.5 * aspect, reMax: 1.5 * aspect, imMin: -1.5, imMax: 1.5 }
            : this.type === 'Burning Ship'
                ? { reMin: -2.5, reMax: 1.5, imMin: -2, imMax: 2 }
                : { reMin: -2, reMax: 1, imMin: -1, imMax: 1 };
    }

    /** @param {string} type */
    setType(type) {
        this.type = type;
        this.resetRange();
        this.transformation = type === 'Julia'
            ? new JuliaTransformation(this.constant)
            : type === 'Burning Ship'
                ? new BurningShipTransformation()
                : new MandelbrotTransformation();
        this.apply(this.transformation);
    }

    /** @param {[number, number]} constant */
    setJuliaConstant(constant) {
        this.constant = constant;
        if (this.type === 'Julia') {
            this.transformation = new JuliaTransformation(constant);
            this.apply(this.transformation);
        }
    }

    /** @param {number} factor */
    zoom(factor) {
        const centerRe = 0.5 * (this.complexRange.reMin + this.complexRange.reMax);
        const centerIm = 0.5 * (this.complexRange.imMin + this.complexRange.imMax);
        const halfWidth = 0.5 * (this.complexRange.reMax - this.complexRange.reMin) * factor;
        const halfHeight = 0.5 * (this.complexRange.imMax - this.complexRange.imMin) * factor;
        this.complexRange = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.apply(this.transformation);
    }

    /** @param {number} u @param {number} v */
    recenter(u, v) {
        const centerRe = this.complexRange.reMin + u * (this.complexRange.reMax - this.complexRange.reMin);
        const centerIm = this.complexRange.imMin + v * (this.complexRange.imMax - this.complexRange.imMin);
        const halfWidth = 0.5 * (this.complexRange.reMax - this.complexRange.reMin);
        const halfHeight = 0.5 * (this.complexRange.imMax - this.complexRange.imMin);
        this.complexRange = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.apply(this.transformation);
    }

    // Escape counts always lie in [0, maxIterations], keeping color normalization fixed.
    rangeAt() {
        return new Interval(0, this.maxIterations);
    }
}

class FractalColorMapper {
    constructor(scheme) {
        this._scheme = scheme;
        this.mapper = ColorMappers.get(ColorMappers.Inferno);
    }

    set scheme(value) {
        this._scheme = value;
        if (value !== 'RGB')
            this.mapper = ColorMappers.get(value)
    }

    /** @param {number} value @param {import('three').Color} target */
    map(value, target) {
        if (value >= 1)
            target.setRGB(0, 0, 0);
        else if (this._scheme !== 'RGB')
            this.mapper.map(value * 3, target);
        else
            target.setRGB(4 * value, Math.sqrt(value), Math.pow(value, 0.2));
        target.convertLinearToSRGB();
    }
}
const fractalColorMapper = new FractalColorMapper('Scientific');

const fractal = new FractalField();
const fractalView = new DiscreteFieldSurfaceView({
    colorMapper: fractalColorMapper,
    normalizer: new FixedIntervalNormalizer(new Interval(0, MAX_ITERATIONS)),
    opacityFunction: () => 1,
    scale: 0.01
});

Simulation
    .with({
        htmlDivId: 'mandelbrotJuliaContainer',
        viewport: { aspectRatio: '3 / 2', parameterMenuCollapsed: false },
        camera: { position: new Vec3(0, 0, 4), orthographic: true, controls: false },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>Fractals</strong><br>' +
                'Explore the Mandelbrot set, Julia sets and the Burning Ship fractal. ' +
                'Click to recenter; use the mouse wheel or buttons to zoom.'
        }
    })
    .bind(fractal.onceWith(fractalView))
    .append(new DropdownMenu()
        .for(fractalRegistry)
        .withValue('Mandelbrot')
        .onChange(value => fractal.setType(value)))
    .append(new DropdownMenu()
        .for(juliaRegistry)
        .withValue('0.325 + 0.417i')
        .onChange(value => fractal.setJuliaConstant(juliaConstants[value])))
    .append(new DropdownMenu()
        .for(colorRegistry)
        .withValue('Inferno')
        .onChange(value => fractalColorMapper.scheme = value))
    .append(new Button()
        .withText('Zoom in')
        .onClick(() => fractal.zoom(0.8))
        .togetherWith(new Button()
            .withText('Zoom out')
            .onClick(() => fractal.zoom(1.1))
            .togetherWith(new Button()
                .withText('Reset view')
                .onClick(() => {
                    fractal.resetRange();
                    fractal.apply(fractal.transformation);
                })))
    )
    .onPointer('pointerdown', (x, y, event) => {
        if (event.button !== 0)
            return;
        fractal.recenter(x + 0.5, y + 0.5);
    })
    .onPointer('wheel', (_x, _y, event) => {
        event.preventDefault();
        fractal.zoom(event.deltaY < 0 ? 0.8 : 1.1);
    });