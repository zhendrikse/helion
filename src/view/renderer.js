import { Object3D } from "three";

export class Renderable3D extends Object3D {
    canBindTo(model) {}
    initialize(model) {}
    synchronizeWith(model) {}
    reset() {}
}

export class Renderer {
    add(viewObject) {}

    render(view, time) {}

    resize() {}

    attach(viewport) {}
}
