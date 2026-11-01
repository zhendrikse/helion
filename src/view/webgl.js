import { PlaneGeometry, ShaderMaterial, Mesh }  from 'three';
import { Renderable3D } from "./renderer.js";

export class ShaderView extends Renderable3D {
    constructor({
        vertexShader,
        fragmentShader,
        aspectRatio = 1
    } = {}) {
        super();
        this._vertexShader = vertexShader;
        this._fragmentShader = fragmentShader;
        this._canvasGeometry = new PlaneGeometry(aspectRatio, 1);
    }

    initialize(model) {
        const canvasMaterial = new ShaderMaterial({
            uniforms: model.uniforms,
            vertexShader: this._vertexShader,
            fragmentShader: this._fragmentShader
        });

        this.add(new Mesh(this._canvasGeometry, canvasMaterial));
    }

    canBindTo(model) {
        return model.uniforms;
    }
}