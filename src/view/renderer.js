import { Object3D, Box3 } from "three";

export class Renderable3D extends Object3D {
    canBindTo(model) {}
    initialize(model) {}
    synchronizeWith(model) {}
    reset() {}

    get boundingBox() {
        const boundingBox = new Box3();
        boundingBox.setFromObject(this);
        return boundingBox;
    }
}

export class Renderer {
    add(viewObject) {}

    render(view, time) {}

    resize() {}

    attach(viewport) {}
}
