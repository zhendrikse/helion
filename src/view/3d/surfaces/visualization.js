import {Renderable3D} from "../../renderer.js";
import {Box3} from "three";
import {CompoundControl, DropdownMenu, Slider} from "../../../core/controls.js";
import {ColorMappersFactory} from "../../colormappers.js";
import {Range} from "../../../model/math/math.js";

export class SurfaceResolution {
    constructor(uSegments = 50, vSegments = 50) {
        this.u = uSegments;
        this.v = vSegments;
    }
}

class Normalizer {
    include(value) {}

    normalize(value) {}

    reset() {}
}

export class FixedIntervalNormalizer extends Normalizer {
    constructor(interval) {
        super();
        this._interval = interval;
    }

    normalize(value) {
        return this._interval.normalize(value);
    }
}

export class AdaptiveSymmetricNormalizer extends Normalizer{
    constructor(smoothing = 0.05) {
        super();
        this._smoothing = smoothing;
        this.reset();
    }

    include(value) {
        if (!Number.isFinite(value))
            return;

        const abs = Math.abs(value);
        this._maxAbs = Math.max(this._maxAbs * (1 - this._smoothing) + abs * this._smoothing, abs);
    }

    normalize(value) {
        if (!Number.isFinite(value))
            return 0.5;

        const range = Math.max(this._maxAbs, 1e-9);
        const clamped = Math.max(-range, Math.min(range, value));

        return 0.5 + 0.5 * clamped / range;
    }

    reset() {
        this._maxAbs = 1;
    }
}

class ColorLayer {
    value(frame) {
        return 0;
    }
}

export class HeightLayer extends ColorLayer {
    value(frame) {
        return frame.position.y;
    }
}

export class GaussianCurvatureLayer extends ColorLayer {
    value(frame) {
        return frame.K;
    }
}

export class SurfaceVisualization extends Renderable3D {
    // meshLayer can be null, e.g. if we only want to show contours and nothing else
    constructor(meshLayer = null) {
        super();
        this.meshLayer = meshLayer;
        this._overlayLayers = [];
        this._model = null;
    }

    get meshLayer() {
        return this._meshLayer;
    }

    set meshLayer(layer) {
        if (this._meshLayer)
            this.remove(this._meshLayer);

        this._meshLayer = layer;

        if (!layer)
            return;

        this.add(layer);

        if (this._model) {
            layer.initialize(this._model);
            layer.synchronizeWith(this._model);
        }
    }

    canBindTo(model) {
        return model.frameAt;
    }

    addOverlayLayer(layer) {
        this._overlayLayers.push(layer);
        this.add(layer);

        if (this._model)
            layer.initialize(this._model);

        return this;
    }

    initialize(model) {
        this._model = model;
        this._meshLayer?.initialize(model);
        for (const layer of this._overlayLayers)
            layer.initialize(model);
    }

    controls({
    } = {}) {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ColorMappersFactory())
                .addEventListener("change", event => {
                    if (this._meshLayer)
                        this._meshLayer.colorMapper = ColorMappersFactory.create(event.target.value);
                })
            )
            .add(new Slider("Opacity ")
                .withRange(new Range(0, 1, 0.01))
                .withValue(this._meshLayer ? this._meshLayer.opacity : 1)
                .addEventListener("input", event => {
                    if (this._meshLayer)
                        this._meshLayer.opacity = Number(event.target.value);
                })
            );
    }

    synchronizeWith(model) {
        this._meshLayer?.synchronizeWith(model);
        for (const layer of this._overlayLayers)
            layer.synchronizeWith(model);
    }

    reset() {
        this._meshLayer?.reset();
        for (const layer of this._overlayLayers)
            layer.reset?.();
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
