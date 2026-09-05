import {Renderable3D} from "../../renderer.js";
import {Box3} from "three";
import {Checkbox, CompoundControl, DropdownMenu, Slider} from "../../../core/controls.js";
import {ColorMappers} from "../../colormappers.js";
import {Interval, Range} from "../../../model/math/math.js";
import {GlyphLayer, Layer, SurfaceLayer} from "./layers.js";
import {Registry} from "../../../core/helion.js";

export class SurfaceResolution {
    constructor(uSegments = 50, vSegments = 50) { this.u = uSegments; this.v = vSegments; }
}

class Normalizer {
    adaptTo(range) {}
    normalize(value) {}
    reset() {}
}

export class FixedIntervalNormalizer extends Normalizer {
    constructor(interval) { super(); this._interval = interval; }
    normalize(value) { return this._interval.normalize(value); }
}

export class AdaptiveSymmetricNormalizer extends Normalizer {
    constructor(smoothing = 0.05) { super(); this._smoothing = smoothing; this._maxAbs = 1; }
    adaptTo(range) {
        if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return;
        const maxAbs = Math.max(Math.abs(range.min), Math.abs(range.max));
        this._maxAbs = Math.max(this._maxAbs * (1 - this._smoothing) + maxAbs * this._smoothing, maxAbs);
    }
    normalize(value) {
        if (!Number.isFinite(value)) return 0.5;
        const range = Math.max(this._maxAbs, 1e-9);
        const clamped = Math.max(-range, Math.min(range, value));
        return 0.5 + 0.5 * clamped / range;
    }
    reset() { this._maxAbs = 1; }
}

export class AdaptiveNormalizer extends Normalizer {
    constructor(smoothing = 0.05) { super(); this._smoothing = smoothing; this._min = 0; this._max = 1; }
    adaptTo(range) {
        if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return;
        this._min = this._min * (1 - this._smoothing) + range.min * this._smoothing;
        this._max = this._max * (1 - this._smoothing) + range.max * this._smoothing;
    }
    normalize(value) {
        if (!Number.isFinite(value)) return 0.5;
        const range = Math.max(this._max - this._min, 1e-9);
        const clamped = Math.max(this._min, Math.min(this._max, value));
        return (clamped - this._min) / range;
    }
    reset() { this._min = 0; this._max = 1; }
}

class ColorLayer {
    value(frame) { return 0; }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Height)(); }
    preferredNormalizer() { return new AdaptiveSymmetricNormalizer(); }
}

export class HeightLayer extends ColorLayer {
    value(frame) { return frame.position.y; }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Gradient)(); }
}

export class GaussianCurvatureLayer extends ColorLayer {
    value(frame) { return frame.k1 * frame.k2; }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Seismic)(); }
}

export class MeanCurvatureLayer extends ColorLayer {
    value(frame) { return .5 * (frame.k1 + frame.k2); }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Scientific)(); }
}

export class ShapeIndexLayer extends ColorLayer {
    value(frame) {
        const denominator = frame.k1 - frame.k2;
        if (Math.abs(denominator) < 1e-12) return 0;
        return (2 / Math.PI) * Math.atan((frame.k1 + frame.k2) / denominator);
    }
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.RdYlBu)(); }
    preferredNormalizer() { return new FixedIntervalNormalizer(new Interval(-1, 1)); }
}

export class CurvednessLayer extends ColorLayer {
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.RdYlBu)(); }
    preferredNormalizer() { return new AdaptiveNormalizer(); }
    value(frame) { return Math.sqrt(0.5 * (frame.k1 * frame.k1 + frame.k2 * frame.k2)); }
}

export class PrincipalCurvature1Layer extends ColorLayer {
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Viridis)(); }
    value(frame) { return frame.k1; }
}

export class PrincipalCurvature2Layer extends ColorLayer {
    preferredColorMapper() { return new ColorMappers().get(ColorMappers.Inferno)(); }
    value(frame) { return frame.k2; }
}

export class ColorLayers extends Registry {
    static Height = "Height";
    static GaussianCurvature = "GaussianCurvature";
    static MeanCurvature = "MeanCurvature";
    static Curvedness = "Curvedness";
    static ShapeIndex = "ShapeIndex";
    constructor(label = "Color ") {
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

export class SurfaceVisualization extends Renderable3D {
    static Display = Object.freeze({ Surface: "surface", Glyphs: "glyphs", None: "none" });
    constructor({
        resolution = new SurfaceResolution(100, 100),
        glyphType = GlyphLayer.GlyphTypes.BOXES,
        glyphScale = 0.8,
        colorLayer = new HeightLayer(),
        colorMapper = colorLayer.preferredColorMapper(),
        normalizer = colorLayer.preferredNormalizer(),
        opacity = 1,
        display = SurfaceVisualization.Display.Surface
    } = {}) {
        super();
        this._options = {resolution, glyphType, glyphScale, colorLayer, colorMapper, normalizer, opacity};
        this._surfaceLayer = new SurfaceLayer({...this._options});
        this._glyphLayer = new GlyphLayer({...this._options});
        this._overlayLayers = [];
        this._model = null;
        this._meshLayer = null;
        this.display(display);
    }
    get glyphLayer() { return this._glyphLayer; }
    get surfaceLayer() { return this._surfaceLayer; }
    get meshLayer() { return this._meshLayer; }
    display(type) {
        switch (type) {
            case SurfaceVisualization.Display.Surface: this._display(this._surfaceLayer); break;
            case SurfaceVisualization.Display.Glyphs: this._display(this._glyphLayer); break;
            case SurfaceVisualization.Display.None: this._display(null); break;
        }
        return this;
    }
    _display(layer) {
        if (this._meshLayer) this.remove(this._meshLayer);
        this._meshLayer = layer;
        if (!layer) return;
        this.add(layer);
        if (this._model) { layer.initialize(this._model); layer.synchronizeWith(this._model); }
    }
    canBindTo(model) {
        if (!model.frameAt) throw new Error("Surface visualization needs frameAt(), which is not supported by the current model.");
        return true;
    }
    addOverlayLayer(layer) {
        this._overlayLayers.push(layer); this.add(layer);
        if (this._model) layer.initialize(this._model);
        return this;
    }
    initialize(model) {
        this._model = model;
        this._meshLayer?.initialize(model);
        for (const layer of this._overlayLayers) layer.initialize(model);
    }
    ui() {
        const colorMappers = new ColorMappers("🎨 Color map");
        return new CompoundControl()
            .add(new DropdownMenu().for(colorMappers).addEventListener("change", event => {
                this._surfaceLayer.colorMapper = colorMappers.get(event.target.value)();
                this._glyphLayer.colorMapper = colorMappers.get(event.target.value)();
            }))
            .add(new Slider("🪟 Opacity ").withRange(new Range(0, 1, 0.01)).withValue(this._options.opacity)
                .addEventListener("input", event => {
                    this._surfaceLayer.opacity = Number(event.target.value);
                    this._glyphLayer.opacity = Number(event.target.value);
                }));
    }
    colorLayerUI() {
        const colorLayers = new ColorLayers("🖌️ Color ");
        return new DropdownMenu().for(colorLayers).addEventListener("change", event => {
            const colorLayer = colorLayers.get(event.target.value)();
            this._surfaceLayer.colorLayer = colorLayer;
            this._surfaceLayer.colorMapper = colorLayer.preferredColorMapper();
            this._surfaceLayer.normalizer = colorLayer.preferredNormalizer();
            this._glyphLayer.colorLayer = colorLayer;
            this._glyphLayer.colorMapper = colorLayer.preferredColorMapper();
            this._glyphLayer.normalizer = colorLayer.preferredNormalizer();
            for (const layer of this._overlayLayers) {
                layer.colorLayer = colorLayer;
                layer.colorMapper = colorLayer.preferredColorMapper();
                layer.normalizer = colorLayer.preferredNormalizer();
            }
        });
    }
    synchronizeWith(model) {
        this._meshLayer?.synchronizeWith(model);
        for (const layer of this._overlayLayers) layer.synchronizeWith(model);
    }
    reset() {
        this._meshLayer?.reset();
        for (const layer of this._overlayLayers) layer.reset?.();
    }
    get boundingBox() {
        const box = new Box3();
        if (this._meshLayer) box.union(this._meshLayer.boundingBox);
        for (const layer of this._overlayLayers) box.union(layer.boundingBox ?? new Box3());
        return box;
    }
}
