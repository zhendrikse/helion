import {
    CircleGeometry,
    DataTexture,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    RGBAFormat,
    SRGBColorSpace
} from "three";

import {Renderable2D} from "../renderer.js";

function scientificColorCodingFor(value, minVal, maxVal) {
    if (maxVal <= minVal)
        return [128, 128, 128, 255];

    value = Math.min(Math.max(value, minVal), maxVal - Number.EPSILON);
    const normalized = (value - minVal) / (maxVal - minVal);
    const segment = Math.min(3, Math.floor(4 * normalized));
    const fraction = 4 * normalized - segment;

    switch (segment) {
        case 0:
            return [0, 255 * fraction, 255, 255];
        case 1:
            return [0, 255, 255 * (1 - fraction), 255];
        case 2:
            return [255 * fraction, 255, 0, 255];
        default:
            return [255, 255 * (1 - fraction), 0, 255];
    }
}

/**
 * Three.js visualization of the 2D fluid grid.
 *
 * The grid is uploaded directly to a DataTexture; this view does not use a
 * 2D canvas context. The obstacle is a separate Three.js mesh so it remains
 * crisp when the simulation is zoomed.
 */
export class FluidDynamicsView extends Renderable2D {
    constructor(scene = {}) {
        super();

        this._scene = scene;
        this._showObstacle = true;
        this._showPressure = true;
        this._showSmoke = true;

        this._texture = null;
        this._fieldMesh = null;
        this._obstacleMesh = null;
        this._gridWidth = 0;
        this._gridHeight = 0;
    }

    set showSmoke(showSmoke) {
        this._showSmoke = showSmoke;
    }

    set showPressure(showPressure) {
        this._showPressure = showPressure;
    }

    set showObstacle(showObstacle) {
        this._showObstacle = showObstacle;
        if (this._obstacleMesh)
            this._obstacleMesh.visible = showObstacle;
    }

    canBindTo(model) {
        return Boolean(model && model.pressureAt && model.smokeAt && model.obstacleAt);
    }

    initialize(fluid) {
        this._createFieldMesh(fluid);
        this._createObstacleMesh(fluid);
    }

    _createFieldMesh(fluid) {
        this._disposeFieldMesh();

        this._gridWidth = fluid.numX;
        this._gridHeight = fluid.numY;

        const pixels = new Uint8Array(this._gridWidth * this._gridHeight * 4);
        this._texture = new DataTexture(
            pixels,
            this._gridWidth,
            this._gridHeight,
            RGBAFormat
        );
        this._texture.colorSpace = SRGBColorSpace;
        this._texture.needsUpdate = true;
        this._texture.magFilter = 1003; // THREE.LinearFilter
        this._texture.minFilter = 1003; // THREE.LinearFilter

        const geometry = new PlaneGeometry(fluid.numX * fluid.h, fluid.numY * fluid.h);
        const material = new MeshBasicMaterial({
            map: this._texture,
            side: DoubleSide
        });
        this._fieldMesh = new Mesh(geometry, material);
        this._fieldMesh.position.set(
            fluid.numX * fluid.h / 2,
            fluid.numY * fluid.h / 2,
            0
        );
        this.add(this._fieldMesh);
    }

    _createObstacleMesh(fluid) {
        if (this._obstacleMesh) {
            this.remove(this._obstacleMesh);
            this._obstacleMesh.geometry.dispose();
            this._obstacleMesh.material.dispose();
        }

        const radius = (this._scene.obstacleRadius ?? 0.15) + fluid.h;
        this._obstacleMesh = new Mesh(
            new CircleGeometry(radius, 48),
            new MeshBasicMaterial({
                color: this._showPressure ? 0x131313 : 0xdddddd,
                side: DoubleSide
            })
        );
        this._obstacleMesh.position.z = 0.01;
        this._obstacleMesh.visible = this._showObstacle;
        this.add(this._obstacleMesh);
        this._positionObstacle();
    }

    _positionObstacle() {
        if (!this._obstacleMesh)
            return;

        this._obstacleMesh.position.x = this._scene.obstacleX ?? 0;
        this._obstacleMesh.position.y = this._scene.obstacleY ?? 0;
        this._obstacleMesh.material.color.set(this._showPressure ? 0x131313 : 0xdddddd);
    }

    _disposeFieldMesh() {
        if (!this._fieldMesh)
            return;

        this.remove(this._fieldMesh);
        this._fieldMesh.geometry.dispose();
        this._fieldMesh.material.dispose();
        this._texture?.dispose();
        this._fieldMesh = null;
        this._texture = null;
    }

    synchronizeWith(fluid) {
        if (!this._fieldMesh || fluid.numX !== this._gridWidth || fluid.numY !== this._gridHeight) {
            this._createFieldMesh(fluid);
            this._createObstacleMesh(fluid);
        }

        const {min, max} = fluid.pressureRange;
        const pixels = this._texture.image.data;

        // DataTexture rows are written from the bottom of the plane upward,
        // matching the simulation's increasing y-coordinate.
        for (let j = 0; j < fluid.numY; j++) {
            for (let i = 0; i < fluid.numX; i++) {
                const index = 4 * (j * fluid.numX + i);
                const smoke = fluid.obstacleAt(j, i);
                let color;

                if (this._showPressure) {
                    color = scientificColorCodingFor(fluid.pressureAt(j, i), min, max);
                    if (this._showSmoke) {
                        color[0] = Math.max(0, color[0] - 255 * smoke);
                        color[1] = Math.max(0, color[1] - 255 * smoke);
                        color[2] = Math.max(0, color[2] - 255 * smoke);
                    }
                } else if (this._showSmoke) {
                    const shade = Math.round(255 * smoke);
                    color = [shade, shade, shade, 255];
                    if (this._scene.sceneNr === 2)
                        color = scientificColorCodingFor(smoke, 0, 1);
                } else {
                    const shade = fluid.smokeAt(j, i) === 0 ? 0 : 255;
                    color = [shade, shade, shade, 255];
                }

                pixels[index] = color[0];
                pixels[index + 1] = color[1];
                pixels[index + 2] = color[2];
                pixels[index + 3] = 255;
            }
        }

        this._texture.needsUpdate = true;
        this._positionObstacle();
    }

    dispose() {
        this._disposeFieldMesh();
        if (this._obstacleMesh) {
            this.remove(this._obstacleMesh);
            this._obstacleMesh.geometry.dispose();
            this._obstacleMesh.material.dispose();
            this._obstacleMesh = null;
        }
    }
}
