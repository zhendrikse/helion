import {ColorMapper, ColorMappers} from '../../colormappers.js';
import {Interval} from '../../../model/math/math.js';
import {Registry} from '../../../core/utils.js';
import {DifferentialFrame} from '../../../model/math/numerics/diffgeometry.js';

export class Normalizer {
    /** @param {Interval} rangeInterval */
    adaptTo(rangeInterval) {}

    /**
     * @abstract
     * @param {number} value
     * @return {number}
     */
    normalize(value) { return 0; }
    reset() {}
}

export class FixedIntervalNormalizer extends Normalizer {
    /** @param {Interval} interval */
    constructor(interval = new Interval(0, 1)) {
        super();
        this._interval = interval;


        this._min = Infinity;
        this._max = -Infinity;
    }

    /** @param {Interval} _rangeInterval */
    adaptTo(_rangeInterval) {
        // Interval is fixed (nomen est omen), so we intentionally do nothing here
    }

    /** @param {number} value */
    normalize(value) {
        return this._interval.normalize(value);
    }
}

export class AdaptiveSymmetricNormalizer extends Normalizer {
    constructor(smoothing = 0.05) {
        super();
        this._smoothing = smoothing;
        this._maxAbs = 1;
        this._initialized = false;
    }

    /** @param {Interval} rangeInterval */
    adaptTo(rangeInterval) {
        if (!Number.isFinite(rangeInterval.from) || !Number.isFinite(rangeInterval.to))
            return;

        const maxAbs = Math.max(Math.abs(rangeInterval.from), Math.abs(rangeInterval.to));
        if (!this._initialized) {
            this._maxAbs = maxAbs;
            this._initialized = true;
            return;
        }

        this._maxAbs = Math.max(this._maxAbs * (1 - this._smoothing) + maxAbs * this._smoothing, maxAbs);
    }

    /** @param {number} value */
    normalize(value) {
        if (!Number.isFinite(value))
            return 0.5;
        const range = Math.max(this._maxAbs, 1e-9);
        const clamped = Math.max(-range, Math.min(range, value));
        return 0.5 + 0.5 * clamped / range;
    }

    reset() {
        this._maxAbs = 1;
        this._initialized = false;
    }
}

export class AdaptiveNormalizer extends Normalizer {
    constructor(smoothing = 0.05) {
        super(); this._smoothing = smoothing;
        this._min = 0;
        this._max = 1;
        this._initialized = false;
    }

    /** @param {Interval} rangeInterval */
    adaptTo(rangeInterval) {
        if (!Number.isFinite(rangeInterval.from) || !Number.isFinite(rangeInterval.to))
            return;

        if (!this._initialized) {
            this._min = rangeInterval.from;
            this._max = rangeInterval.to;
            this._initialized = true;
            return;
        }

        this._min = this._min * (1 - this._smoothing) + rangeInterval.from * this._smoothing;
        this._max = this._max * (1 - this._smoothing) + rangeInterval.to * this._smoothing;
    }

    /** @param {number} value */
    normalize(value) {
        if (!Number.isFinite(value))
            return 0.5;

        const range = Math.max(this._max - this._min, 1e-9);
        const clamped = Math.max(this._min, Math.min(this._max, value));
        return (clamped - this._min) / range;
    }

    reset() {
        this._min = 0;
        this._max = 1;
        this._initialized = false;
    }
}

export class ColorLayer {
    /** @param {DifferentialFrame} frame */
    value(frame) {
        return 0;
    }

    /** @return {ColorMapper} */
    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.Height)();
    }

    /** @return {Normalizer} */
    preferredNormalizer() {
        return new AdaptiveSymmetricNormalizer();
    }
}

export class HeightLayer extends ColorLayer {
    /** @param {DifferentialFrame} frame */
    value(frame) {
        return frame.position.y;
    }

    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.Gradient)();
    }
}

export class GaussianCurvatureLayer extends ColorLayer {
    /** @param {DifferentialFrame} frame */
    value(frame) {
        return frame.k1 * frame.k2;
    }

    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.Seismic)();
    }
}

export class MeanCurvatureLayer extends ColorLayer {
    /** @param {DifferentialFrame} frame */
    value(frame) {
        return .5 * (frame.k1 + frame.k2);
    }

    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.Scientific)();
    }
}

export class ShapeIndexLayer extends ColorLayer {
    /** @param {DifferentialFrame} frame */
    value(frame) {
        const denominator = frame.k1 - frame.k2;
        if (Math.abs(denominator) < 1e-12)
            return 0;

        return (2 / Math.PI) * Math.atan((frame.k1 + frame.k2) / denominator);
    }

    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.RdYlBu)();
    }

    preferredNormalizer() {
        return new FixedIntervalNormalizer(new Interval(-1, 1));
    }
}

export class CurvednessLayer extends ColorLayer {
    preferredColorMapper() {
        return new ColorMappers().get(ColorMappers.RdYlBu)();
    }

    preferredNormalizer() {
        return new AdaptiveNormalizer();
    }

    /** @param {DifferentialFrame} frame */
    value(frame) {
        return Math.sqrt(0.5 * (frame.k1 * frame.k1 + frame.k2 * frame.k2));
    }
}

export class PrincipalCurvature1Layer extends ColorLayer {
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Viridis)(); }

    /** @param {DifferentialFrame} frame */
    value(frame) {
        return frame.k1;
    }
}

export class PrincipalCurvature2Layer extends ColorLayer {
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Inferno)(); }

    /** @param {DifferentialFrame} frame */
    value(frame) {
        return frame.k2;
    }
}

export class ColorLayers extends Registry {
    static Height = 'Height';
    static GaussianCurvature = 'GaussianCurvature';
    static MeanCurvature = 'MeanCurvature';
    static Curvedness = 'Curvedness';
    static ShapeIndex = 'ShapeIndex';
    constructor(label = 'Color ') {
        super({ label, entries: {
                Height: () => new HeightLayer(),
                PrincipalCurvature1: () => new PrincipalCurvature1Layer(),
                PrincipalCurvature2: () => new PrincipalCurvature2Layer(),
                GaussianCurvature: () => new GaussianCurvatureLayer(),
                MeanCurvature: () => new MeanCurvatureLayer(),
                ShapeIndex: () => new ShapeIndexLayer(),
                Curvedness: () => new CurvednessLayer()
            }});
    }
}
