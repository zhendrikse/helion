import { Object3D } from "three";

export class Renderable3D extends Object3D {
    bind(model) {}
    initialize() {}
    render() {}
    reset() {}
}

export class Renderer {
    add(viewObject) {}

    render(view, time) {}

    resize() {}

    attach(viewport) {}
}

export class CompositeRenderer {
    constructor(renderers = [] = {}) {
        this._renderers = renderers; // array van Renderer-instanties
    }

    add(viewObject) {
        for (const renderer of this._renderers)
            renderer.add(viewObject);
    }

    render(view, time) {
        for (const renderer of this._renderers)
            renderer.render(view, time);
    }
}