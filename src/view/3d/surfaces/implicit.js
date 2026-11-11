import { DoubleSide, MeshStandardMaterial } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { Renderable3D } from '../../renderer.js';
import {Colour} from "../../colormappers.js";

/**
 * Extracts an isosurface from an ImplicitSurface model using marching cubes.
 */
export class ImplicitSurfaceView extends Renderable3D {
    /**
     * @param {{
     *  resolution?: number,
     *  opacity?: number,
     *  material?: import('three').Material,
     *  maxPolyCount?: number
     * }} options
     */
    constructor({
        resolution = 32,
        opacity = 1,
        color = new Colour(0x4f9bd8),
        material = new MeshStandardMaterial({
            roughness: 0.35,
            metalness: 0.1,
        }),
        maxPolyCount = 30000
    } = {}) {
        super();
        color.asThreeJsColor(material.color);
        material.opacity = opacity;
        material.transparent = true;
        material.side = DoubleSide;
        this._marchingCubes = new MarchingCubes(resolution, material, false, false, maxPolyCount);
        this._resolution = resolution;
        this._lastTime = undefined;
        this.add(this._marchingCubes);
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    canBindTo(model) {
        return typeof model.sampleAt === 'function';
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    initialize(model) {
        const center = model.min.clone().add(model.max).multiplyScalar(0.5);
        const halfSize = model.max.clone().sub(model.min).multiplyScalar(0.5);

        this._marchingCubes.position.set(center.x, center.y, center.z);
        this._marchingCubes.scale.set(halfSize.x, halfSize.y, halfSize.z);
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    synchronizeWith(model) {
        if (typeof model.time === 'number') {
            if (model.time === this._lastTime)
                return;
            this._lastTime = model.time;
        }

        const size = this._resolution;
        const center = model.min.clone().add(model.max).multiplyScalar(0.5);
        const halfSize = model.max.clone().sub(model.min).multiplyScalar(0.5);

        this._marchingCubes.reset();
        this._marchingCubes.isolation = 0;

        for (let z = 0; z < size; z++) {
            const pz = (2 * z / size - 1) * halfSize.z + center.z;
            for (let y = 0; y < size; y++) {
                const py = (2 * y / size - 1) * halfSize.y + center.y;
                for (let x = 0; x < size; x++) {
                    const px = (2 * x / size - 1) * halfSize.x + center.x;
                    // MarchingCubes computes normals from the negative field gradient.
                    // Negate the implicit function so the sphere normals point outward.
                    this._marchingCubes.setCell(x, y, z, model.isovalue - model.sampleAt(px, py, pz));
                }
            }
        }

        this._marchingCubes.update();
    }

    dispose() {
        this._marchingCubes.geometry.dispose();
        this._marchingCubes.material.dispose();
        this.removeFromParent();
    }
}