import {Renderable3D} from "../../renderer.js";
import {InstancedMeshSurfaceView, StandardSurfaceView} from "./surfaceviews.js";
import {Checkbox, CompoundControl, DropdownMenu, Slider} from "../../../core/controls.js";
import {Registry} from "../../../core/helion.js";
import {Range} from "../../../model/math/math.js";
import {ColorMappersFactory} from "../../colormappers.js";
import {NormalizedScalarField, SurfaceScalarFields} from "../../../model/math/fields.js";

export const SurfaceTypes = Object.freeze({
    SURFACE: "Surface",
    CONTOURS: "Contours",
    SURFACE_CONTOURS: "SurfaceContours",
    BOXES: "Boxes",
    CAPSULES: "Capsules",
    CYLINDERS: "Cylinders",
    CONES: "Cones",
    ICOSAHEDRONS: "Icosahedrons",
    TILES: "Tiles",
    SPHERES: "Spheres"
});

class SurfaceFactory extends Registry {
    static create(type, options) {
        const this_ = new SurfaceFactory();
        const Type = this_.get(type);
        switch (type) {
            case SurfaceTypes.SURFACE:
                return new Type({contours: false, ...options});
            case SurfaceTypes.CONTOURS:
                const surface = new Type({contours: true, ...options});
                surface.surfaceVisible = false;
                return surface;
            case SurfaceTypes.SURFACE_CONTOURS:
                return new Type({contours: true, ...options});
            case SurfaceTypes.SPHERES:
                return new Type({shape: "Sphere", ...options});
            case SurfaceTypes.BOXES:
                return new Type({shape: "Box", ...options});
            case SurfaceTypes.CAPSULES:
                return new Type({shape: "Capsule", ...options});
            case SurfaceTypes.CYLINDERS:
                return new Type({shape: "Cylinder", ...options});
            case SurfaceTypes.ICOSAHEDRONS:
                return new Type({shape: "Icosahedron", ...options});
            case SurfaceTypes.TILES:
                return new Type({shape: "Plane", ...options});
            case SurfaceTypes.CONES:
                return new Type({shape: "Cone", ...options});
        }
    }

    constructor({
        id = "surfaceSelect",
        label = "Surface type ",
        entries = {
            Surface: StandardSurfaceView,
            Contours: StandardSurfaceView,
            SurfaceContours: StandardSurfaceView,
            Boxes: InstancedMeshSurfaceView,
            Capsules: InstancedMeshSurfaceView,
            Cylinders: InstancedMeshSurfaceView,
            Cones: InstancedMeshSurfaceView,
            Icosahedrons: InstancedMeshSurfaceView,
            Tiles: InstancedMeshSurfaceView,
            Spheres: InstancedMeshSurfaceView
        }
    } = {}) {
        super({ id, label, entries });
    }
}

class SurfaceType {
    constructor(surfaceType) {
        this.surfaceType = surfaceType;
    }

    with(options) {
        return new SurfaceVisualization(SurfaceFactory.create(this.surfaceType, options));
    }
}

export class SurfaceVisualization extends Renderable3D {
    constructor(view) {
        super();

        this._view = view;
        this._model = null;
        this.add(view);
    }

    static ofType(Type) {
        return new SurfaceType(Type);
    }

    get boundingBox() {
        return this._view.boundingBox;
    }

    dispose() {
        this._view.dispose();
    }

    controls({
        scalarFieldSelect = false
    } = {}) {
        const compoundControl = new CompoundControl()
            .add(new DropdownMenu()
                .for(new ColorMappersFactory())
                .addEventListener("change", (event) =>
                    this._view.colorMapper = ColorMappersFactory.create(event.target.value))
            )
            .add(new DropdownMenu()
            .for(new SurfaceFactory())
            .addEventListener("change", event =>
                this.view = SurfaceFactory.create(event.target.value, this._view.options))
            )
            .add(new Slider("Opacity ")
                .on(this._view._mesh.material)
                .withProperty("opacity")
                .withRange(new Range(0, 1, 0.01))
                .withValue(this._view._mesh.material.opacity)
                .togetherWith(new Checkbox("Wireframe ")
                    .on(this._view)
                    .withProperty("wireframe")
                )
            );

        if (scalarFieldSelect)
            compoundControl.add(new DropdownMenu()
                .for(SurfaceScalarFields)
                .addEventListener("change", (event) => {
                    const newScalarField = SurfaceScalarFields.get(event.target.value)(this._scalarField._surface);
                    this._normalizedScalarField = new NormalizedScalarField(newScalarField, this._normalizer);
                    this._normalizedScalarField.reset();
                    this._colorMapper = newScalarField.recommendedColorMapper;
                    this._scalarField = newScalarField;
                    this._dirty = true;
                }));

        return compoundControl;
    }

    canBindTo(model) {
        if (!model.sample)
            throw new Error("Cannot bind surface to a model that does not support sample(u, v)");
        if (!model.principalFrameAt)
            throw new Error("Cannot bind surface to a model that does not support normalAt(u, v)");
        return true;
    }

    initialize(model) {
        this._view.initialize(model);
        this._model = model;
    }

    synchronizeWith(model) {
        this._view.synchronizeWith(model);
    }

    reset() {
        this._view.reset?.();
    }

    set view(newView) {
        if (this._view) {
            this.remove(this._view);
            this._view.dispose();
        }

        this._view = newView;
        this.add(newView);

        if (this._model) {
            newView.initialize(this._model);
            newView.synchronizeWith(this._model);
        }
    }
}