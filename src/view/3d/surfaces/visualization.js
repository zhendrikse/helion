import {Renderable3D} from '../../renderer.js';
import {Box3} from 'three';
import {CompoundControl, DropdownMenu, Slider} from '../../../core/controls.js';
import {ColorMapper, ColorMappers} from '../../colormappers.js';
import { Range} from '../../../model/math/math.js';
import {GlyphLayer, Layer, SurfaceLayer} from './layers.js';
import { DiscreteFieldSurface } from '../../../model/math/surfaces.js';
import { ColorLayers, ColorLayer, HeightLayer} from "./color_layers.js";

export class SurfaceResolution {
    constructor(uSegments = 50, vSegments = 50) { this.u = uSegments; this.v = vSegments; }
}

export class SurfaceVisualization extends Renderable3D {
    static Display = Object.freeze({ Surface: 'surface', Glyphs: 'glyphs', None: 'none' });
    /**
     * @param {Object} [param0={}]
     * @param {SurfaceResolution} [param0.resolution=new SurfaceResolution(100, 100)]
     * @param {string} [param0.glyphType=GlyphLayer.GlyphTypes.BOXES]
     * @param {number} [param0.glyphScale=0.8]
     * @param {ColorLayer} [param0.colorLayer=new HeightLayer()]
     * @param {ColorMapper} [param0.colorMapper=new ColorMappers().get(ColorMappers.Gradient)()]
     * @param {Normalizer} [param0.normalizer=new AdaptiveSymmetricNormalizer()]
     * @param {Material} [param0.material] Custom surface material, e.g. one with a texture map.
     * @param {boolean} [param0.vertexColors=true] Whether to multiply the material by vertex colors.
     * @param {number} [param0.opacity=1]
     * @param {string} [param0.display=SurfaceVisualization.Display.Surface]
     */
    constructor({
        resolution = new SurfaceResolution(100, 100),
        glyphType = GlyphLayer.GlyphTypes.BOXES,
        glyphScale = 0.8,
        colorLayer = new HeightLayer(),
        colorMapper = colorLayer.preferredColorMapper(),
        normalizer = colorLayer.preferredNormalizer(),
        material,
        vertexColors = true,
        opacity = 1,
        display = SurfaceVisualization.Display.Surface
    } = {}) {
        super();
        this._options = {resolution, glyphType, glyphScale, colorLayer, colorMapper, normalizer, material, vertexColors, opacity};
        this._surfaceLayer = new SurfaceLayer({...this._options});
        this._glyphLayer = new GlyphLayer({...this._options});
        /** @type {Layer[]} */
        this._overlayLayers = [];
        this._model = null;
        this._meshLayer = null;
        this.display(display);
    }
    get glyphLayer() { return this._glyphLayer; }
    get surfaceLayer() { return this._surfaceLayer; }
    get meshLayer() { return this._meshLayer; }
    /** @param {string} type */
    display(type) {
        switch (type) {
            case SurfaceVisualization.Display.Surface:
                this._display(this._surfaceLayer);
                break;
            case SurfaceVisualization.Display.Glyphs:
                this._display(this._glyphLayer);
                break;
            case SurfaceVisualization.Display.None:
                this._display(null);
                break;
        }
        return this;
    }

    /** @param {Layer} layer */
    _display(layer) {
        if (this._meshLayer)
            this.remove(this._meshLayer);
        this._meshLayer = layer;
        if (!layer) return;
        this.add(layer);
        if (this._model) { layer.initialize(this._model); layer.synchronizeWith(this._model); }
    }

    /** @param {DiscreteFieldSurface} model */
    canBindTo(model) {
        if (!model.frameAt) throw new Error('Surface visualization needs frameAt(), which is not supported by the current model.');
        return true;
    }

    /** @param {Layer} layer */
    addOverlayLayer(layer) {
        this._overlayLayers.push(layer); this.add(layer);
        if (this._model) layer.initialize(this._model);
        return this;
    }

    /** @param {DiscreteFieldSurface} model */
    initialize(model) {
        this._model = model;
        this._meshLayer?.initialize(model);
        for (const layer of this._overlayLayers) layer.initialize(model);
    }

    ui() {
        const colorMappers = new ColorMappers('🎨 Color map');
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(colorMappers)
                .onChange(value => {
                    this._surfaceLayer.colorMapper = colorMappers.get(value)();
                    this._glyphLayer.colorMapper = colorMappers.get(value)();
                }))
            .add(new Slider('🪟 Opacity ')
                .withRange(new Range(0, 1, 0.01))
                .withValue(this._options.opacity)
                .onInput(value => {
                    this._surfaceLayer.opacity = value;
                    this._glyphLayer.opacity = value;
                }));
    }

    colorLayerUI() {
        const colorLayers = new ColorLayers('🖌️ Color ');
        return new DropdownMenu()
            .for(colorLayers)
            .onChange(value => {
                const colorLayer = colorLayers.get(value)();
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

    /** @param {DiscreteFieldSurface} model */
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
        if (this._meshLayer)
            box.union(this._meshLayer.boundingBox);

        for (const layer of this._overlayLayers)
            box.union(layer.boundingBox ?? new Box3());
        return box;
    }
}
