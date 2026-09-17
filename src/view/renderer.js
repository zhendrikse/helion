import { Object3D, Box3 } from 'three';
import { MathPhysicsModelBehavior } from '../core/helion';
import { Viewport } from '../core/viewport';

/**
 * Base class for all view objects that are to be coupled with a model and rendered in the scene. 
 * All 3D objects that can be rendered in the scene should extend this class.
 * 
 * @interface Renderable
 * @extends {Object3D}
 * @property {Box3} boundingBox - The bounding box of the object.
 * @method canBindTo(model) - Determines if the object can bind to the given model.
 * @method initialize(model) - Initializes the object with the given model.
 * @method synchronizeWith(model) - Synchronizes the object with the given model.
 * @method reset() - Resets a view (when it has state) to its initial state.
 * @method dispose() - Disposes of the object and releases any resources it holds.  
 */
export class Renderable extends Object3D {
    /** @param {MathPhysicsModelBehavior} _model */
    canBindTo(_model) { return false; }
    /** @param {MathPhysicsModelBehavior} _model */
    initialize(_model) {}
    /** @param {MathPhysicsModelBehavior} _model */
    synchronizeWith(_model) {}
    reset() {}
    dispose() {}

    get boundingBox() {
        const boundingBox = new Box3();
        boundingBox.setFromObject(this);
        return boundingBox;
    }
}

export class Renderable3D extends Renderable {}
export class Renderable2D extends Renderable {}

export class Renderer {
    /** @param {Object3D} _viewObject */
    add(_viewObject) {}

    /**
     * @param {number} _time
     */
    render(_time) {}

    resize() {}

    /** @param {Viewport} _viewport */
    attach(_viewport) {}

    /**
     * @param {Renderable} _anObject 
     * @param {Object} _options 
     */
    frameSceneOn(_anObject, _options) {}

    /**
     * @param {Renderable} _anObject 
     * @param {Object} _options 
     */
    provideAxesAround(_anObject, _options) {}
}
