import {
    Button, ColorMappers, DiscreteScalarField, DiscreteFieldSurfaceView,
    DropdownMenu, Interval, Registry, Simulation, Transformation, Vec3, Complex
} from '../../../../src/index.js';

const WIDTH = 1200;
const HEIGHT = 800;
const WORLD_HEIGHT = 4;
const SCALE = WORLD_HEIGHT / HEIGHT;
const MAX_ITERATIONS = 500;

const colorRegistry = new Registry({
    label: 'Color scheme',
    entries: { RGB: 'RGB', Viridis: 'Viridis', RdYlBu: 'RdYlBu', Inferno: 'Inferno', Scientific: 'Scientific' }
});

/**
 * Base class for transformations that fill a scalar field with escape-time values.
 */
class EscapeTimeTransformation extends Transformation {
    constructor(z0 = null, maxIterations = MAX_ITERATIONS) {
        super();
        this.maxIterations = maxIterations;
        this._z0 = z0 ? z0 : new Complex();
        this._isMandelbrot = !z0;
        this.complexRange = null;
    }

    resetRange(nx, ny) {
        const aspect = nx / ny;
        this.complexRange = this._isMandelbrot ?
            { reMin: -2.25, reMax: 1.25, imMin: -1.25, imMax: 1.25 } :
            { reMin: -1.25 * aspect, reMax: 1.25 * aspect, imMin: -1.25, imMax: 1.25 };
    }

    /** @param {DiscreteScalarField} field */
    applyTo(field) {
        const { reMin, reMax, imMin, imMax } = this.complexRange;
        const reStep = (reMax - reMin) / (field.nx - 1);
        const imStep = (imMax - imMin) / (field.ny - 1);

        for (let y = 0; y < field.ny; y++) {
            const im = imMin + y * imStep;
            for (let x = 0; x < field.nx; x++) {
                const re = reMin + x * reStep;
                field.setValueAt(x, field.ny - 1 - y, this.iterationsAt(re, im));
            }
        }
    }

    iterationsAt(re, im) {
        if (this._isMandelbrot)
            this._z0.set(re, im);

        let zr = this._isMandelbrot ? 0 : re,
            zi = this._isMandelbrot ? 0 : im,
            magnitudeSquared = this._isMandelbrot ? 0 : zr * zr + zi * zi,
            iteration = 0;

        while (magnitudeSquared <= 4 && iteration < this.maxIterations) {
            const nextReal = zr * zr - zi * zi + this._z0.re;
            zi = 2 * zr * zi + this._z0.im;
            zr = nextReal;
            magnitudeSquared = zr * zr + zi * zi;
            iteration++;
        }

        return iteration;
    }
}

/** z(n+1) = (|Re(z)| + i|Im(z)|)^2 + c, with c equal to the sampled point. */
class BurningShipTransformation extends EscapeTimeTransformation {
    resetRange(nx, ny) {
        this.complexRange = { reMin: -2.5, reMax: 1.5, imMin: -2, imMax: 2 }
    }

    iterationsAt(re, im) {
        this._z0.set(re, im);

        let zr = 0,
            zi = 0,
            magnitudeSquared = 0,
            iteration = 0;

        while (magnitudeSquared <= 16 && iteration < this.maxIterations) {
            const oldReal = Math.abs(zr);
            const oldImaginary = Math.abs(zi);
            const nextReal = oldReal * oldReal - oldImaginary * oldImaginary + this._z0.re;
            zi = 2 * oldReal * oldImaginary + this._z0.im;
            zr = nextReal;
            magnitudeSquared = zr * zr + zi * zi;
            iteration++;
        }

        return iteration;
    }
}

class Fractal {
    constructor() {
        this.escapeValuesField = new DiscreteScalarField({ nx: WIDTH, ny: HEIGHT });
        this.constant = new Complex(0.325,0.417);
        this.setType('Mandelbrot');
    }

    setType(type, constant = null) {
        this.transformation = type === 'Burning Ship'
                ? new BurningShipTransformation()
                : new EscapeTimeTransformation(constant);
        this.transformation.resetRange(this.escapeValuesField.nx, this.escapeValuesField.ny);
        this.escapeValuesField.apply(this.transformation);
    }

    /** @param {number} factor */
    zoom(factor) {
        const range = this.transformation.complexRange;
        const centerRe = 0.5 * (range.reMin + range.reMax);
        const centerIm = 0.5 * (range.imMin + range.imMax);
        const halfWidth = 0.5 * (range.reMax - range.reMin) * factor;
        const halfHeight = 0.5 * (range.imMax - range.imMin) * factor;
        this.transformation.complexRange = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.escapeValuesField.apply(this.transformation);
    }

    /**
     * @param {number} u
     * @param {number} v
     */
    recenter(u, v) {
        const range = this.transformation.complexRange;
        const centerRe = range.reMin + u * (range.reMax - range.reMin);
        const centerIm = range.imMin + v * (range.imMax - range.imMin);
        const halfWidth = 0.5 * (range.reMax - range.reMin);
        const halfHeight = 0.5 * (range.imMax - range.imMin);
        this.transformation.complexRange = {
            reMin: centerRe - halfWidth, reMax: centerRe + halfWidth,
            imMin: centerIm - halfHeight, imMax: centerIm + halfHeight
        };
        this.escapeValuesField.apply(this.transformation);
    }

    reset() {
        this.transformation.resetRange(this.escapeValuesField.nx, this.escapeValuesField.ny);
        this.escapeValuesField.apply(this.transformation);
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

    /**
     * @param {number} value
     * @param {import('three').Color} target
     */
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

/**
 * Normalizes escaped points to the available color range while reserving 1
 * for points that never escape (MAX_ITERATIONS), which remain black.
 */
class FractalNormalizer {
    constructor() {
        this._min = 0;
        this._max = MAX_ITERATIONS - 1;
    }

    /** @param {Interval} range */
    adaptTo(range) {
        this._min = Math.min(range.from, MAX_ITERATIONS - 1);
        this._max = Math.min(range.to, MAX_ITERATIONS - 1);
    }

    /** @param {number} value */
    normalize(value) {
        if (value >= MAX_ITERATIONS)
            return 1;

        const span = this._max - this._min;
        if (span <= 0)
            return 0;

        // Keep 1 exclusively for points that did not escape.
        return 0.999 * Math.max(0, Math.min(1, (value - this._min) / span));
    }

    reset() {
        this._min = 0;
        this._max = MAX_ITERATIONS - 1;
    }
}

const fractalColorMapper = new FractalColorMapper('RGB');
const fractal = new Fractal();
const fractalView = new DiscreteFieldSurfaceView({
    colorMapper: fractalColorMapper,
    normalizer: new FractalNormalizer(),
    opacityFunction: () => 1,
    scale: SCALE
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
                '• Explore the Mandelbrot set, Julia sets and the Burning Ship fractal.<br/>' +
                '• Click to recenter; use the mouse wheel or buttons to zoom.'
        }
    })
    .bind(fractal.escapeValuesField.onceWith(fractalView))
    .append(new Button()
        .withText('Zoom in')
        .onClick(() => fractal.zoom(0.8))
        .togetherWith(new Button()
            .withText('Zoom out')
            .onClick(() => fractal.zoom(1.1))
            .togetherWith(new Button()
                .withText('Reset view')
                .onClick(() => fractal.reset()))))
    .append(new Button()
        .withText('Mandelbrot')
        .onClick(() => fractal.setType('Mandelbrot'))
        .togetherWith(new Button()
            .withText('Burning Ship')
            .onClick(() => fractal.setType('Burning Ship'))
        ))
    .append(new Button('Julia Z0 = ')
        .withText('0.325 + 0.417i')
        .onClick(() => fractal.setType('Julia', new Complex(0.325, 0.417)))
        .togetherWith(new Button()
            .withText('0.4 + 0.4i')
            .onClick(() => fractal.setType('Julia', new Complex(0.4, 0.4)))
        ))
    .append(new Button('Julia Z0 = ')
        .withText('-0.5251993 - 0.5251993i')
        .onClick(() => fractal.setType('Julia', new Complex(-0.5251993, -0.5251993)))
        .togetherWith(new Button()
            .withText('0.8i')
            .onClick(() => fractal.setType('Julia', new Complex(0, 0.8)))
        ))
    .append(new Button('Julia Z0 = ')
        .withText('0.285 + 0.001i')
        .onClick(() => fractal.setType('Julia', new Complex(0.285, 0.001)))
        .togetherWith(new Button()
            .withText('-0.8 + 0.156i')
            .onClick(() => fractal.setType('Julia', new Complex(-0.8, 0.156)))
        ))
    .append(new Button('Julia Z0 = ')
        .withText('-0.70176 - 0.3842i')
        .onClick(() => fractal.setType('Julia', new Complex(-0.70176, -0.3842)))
        .togetherWith(new Button()
            .withText('-0.4 + 0.6i')
            .onClick(() => fractal.setType('Julia', new Complex(-0.4, 0.6)))
        ))
    .append(new DropdownMenu()
        .for(colorRegistry)
        .withValue('RGB')
        .onChange(value => fractalColorMapper.scheme = value))
    .onPointer('pointerdown', (x, y, event) => {
        if (event.button !== 0)
            return;
        fractal.recenter(x + 0.5, -y + 0.5);
    })
    .onPointer('wheel', (_x, _y, event) => {
        event.preventDefault();
        fractal.zoom(event.deltaY < 0 ? 0.8 : 1.1);
    });
