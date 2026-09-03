import {
    BoxGeometry, MeshBasicMaterial, InstancedMesh, Object3D
} from "three";

import {Renderable3D} from "../renderer.js";

export class DiscreteFieldBoxView extends Renderable3D {
    constructor({
        width = 200,
        height = 200,
        heightScale = 100,
        color = 0xff0033,
        opacity = 0.35
    }) {
        super();

        this._heightScale = heightScale;
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({
            transparent: true,
            opacity,
            color
        });

        this._mesh = new InstancedMesh(geometry, material, width * height);
        this.add(this._mesh);
        this._dummy = new Object3D();
    }

    canBindTo(field) {
        return field.valueAt && field.nx && field.ny;
    }

    synchronizeWith(field) {
        let index = 0;

        for (let y = 0; y < field.ny; y++)
            for (let x = 0; x < field.nx; x++) {
                const v = field.valueAt(x, y);

                // skip empty space → HUGE performance win
                if (v === 0) {
                    this._dummy.scale.set(0, 0, 0);
                    this._dummy.updateMatrix();
                    this._mesh.setMatrixAt(index++, this._dummy.matrix);
                    continue;
                }

                this._dummy.position.set(x - field.nx / 2, v, y - field.ny / 2);
                this._dummy.scale.set(1, this._heightScale, 1);
                this._dummy.updateMatrix();
                this._mesh.setMatrixAt(index++, this._dummy.matrix);
            }

        this._mesh.instanceMatrix.needsUpdate = true;
    }
}