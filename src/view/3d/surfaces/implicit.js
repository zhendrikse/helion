import {
    BufferAttribute, BufferGeometry, Color, DoubleSide, MeshStandardMaterial
} from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { Renderable3D } from '../../renderer.js';
import { Colour, ColorMappers } from '../../colormappers.js';
import { ImplicitDifferentialGeometry, DifferentialFrame } from '../../../model/math/numerics/diffgeometry.js';
import { Vec3 } from '../../../model/math/objects.js';
import { Interval } from '../../../model/math/math.js';
import { MeanCurvatureLayer } from './color_layers.js';
import { PrincipalDirectionsLayer } from './layers.js';

/**
 * Extracts an isosurface from an ImplicitSurface model using marching cubes.
 * Vertex colors are calculated through the shared surface color-layer pipeline.
 */
export class ImplicitSurfaceView extends Renderable3D {
    /**
     * @param {{
     *  resolution?: number,
     *  opacity?: number,
     *  color?: Colour,
     *  material?: import('three').Material,
     *  maxPolyCount?: number,
     *  colorLayer?: import('./color_layers.js').ColorLayer,
     *  colorMapper?: import('../../colormappers.js').ColorMapper,
     *  normalizer?: import('./color_layers.js').Normalizer,
     *  showPrincipalDirections?: boolean,
     *  principalDirectionStride?: number,
     *  principalDirectionScale?: number
     * }} options
     */
    constructor({
        resolution = 32,
        opacity = 1,
        color = new Colour(0x4f9bd8),
        material = new MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }),
        maxPolyCount = 30000,
        colorLayer = new MeanCurvatureLayer(),
        colorMapper = colorLayer.preferredColorMapper(),
        normalizer = colorLayer.preferredNormalizer(),
        showPrincipalDirections = false,
        principalDirectionStride = 250,
        principalDirectionScale = 0.08
    } = {}) {
        super();
        color.asThreeJsColor(material.color);
        material.opacity = opacity;
        material.transparent = true;
        material.side = DoubleSide;
        material.vertexColors = true;

        this._marchingCubes = new MarchingCubes(resolution, material, false, false, maxPolyCount);
        this._resolution = resolution;
        this._lastTime = undefined;
        this._colorLayer = colorLayer;
        this._colorMapper = colorMapper;
        this._normalizer = normalizer;
        this._showPrincipalDirections = showPrincipalDirections;
        this._principalDirectionStride = Math.max(1, principalDirectionStride);
        this._principalDirectionScale = principalDirectionScale;
        this._differentialGeometry = null;
        this._frame = new DifferentialFrame();
        this._color = new Color();
        this._principalDirectionsLayer = new PrincipalDirectionsLayer({
            scale: principalDirectionScale,
            showSecondDirection: true,
            colorMode: PrincipalDirectionsLayer.ColorMode.Direction
        });
        this._principalDirectionsLayer.visible = showPrincipalDirections;
        this.add(this._marchingCubes, this._principalDirectionsLayer);
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    canBindTo(model) {
        return typeof model.sampleAt === 'function';
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    initialize(model) {
        this._lastTime = undefined;
        this._normalizer.reset();
        const center = model.min.clone().add(model.max).multiplyScalar(0.5);
        const halfSize = model.max.clone().sub(model.min).multiplyScalar(0.5);

        this._marchingCubes.position.set(center.x, center.y, center.z);
        this._marchingCubes.scale.set(halfSize.x, halfSize.y, halfSize.z);

        const eps = Math.min(halfSize.x, halfSize.y, halfSize.z) / this._resolution * 0.1;
        this._differentialGeometry = new ImplicitDifferentialGeometry(model, { eps });
        this._principalDirectionsLayer.initialize(model);
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
                    this._marchingCubes.setCell(x, y, z, model.isovalue - model.sampleAt(px, py, pz));
                }
            }
        }

        this._marchingCubes.update();
        this.#updateDifferentialGeometry(center, halfSize);
    }

    #updateDifferentialGeometry(center, halfSize) {
        const geometry = this._marchingCubes.geometry;
        const positions = geometry.attributes.position;
        if (!positions || positions.count === 0)
            return;

        const colors = new BufferAttribute(new Float32Array(positions.count * 3), 3);
        geometry.setAttribute('color', colors);
        const colorValues = colors.array;
        const frames = new Map();
        const values = new Float32Array(positions.count);
        const range = new Interval(Infinity, -Infinity);
        const directionFrames = [];
        const seenDirections = new Set();

        // MarchingCubes emits unshared triangle vertices. Reuse differential frames
        // at identical positions to avoid repeating finite-difference calculations.
        const frameAtVertex = (index) => {
            const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
            const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
            let frame = frames.get(key);
            if (!frame) {
                const point = new Vec3(
                    center.x + x * halfSize.x,
                    center.y + y * halfSize.y,
                    center.z + z * halfSize.z
                );
                frame = new DifferentialFrame();
                if (!this._differentialGeometry.differentialFrameAt(point, frame))
                    frame = null;
                frames.set(key, frame);
            }
            return frame;
        };

        for (let i = 0; i < positions.count; i++) {
            const frame = frameAtVertex(i);
            const value = frame ? this._colorLayer.value(frame) : 0;
            values[i] = value;
            range.include(value);
        }

        this._normalizer.adaptTo(range);
        for (let i = 0; i < positions.count; i++) {
            this._colorMapper.map(this._normalizer.normalize(values[i]), this._color);
            const offset = i * 3;
            colorValues[offset] = this._color.r;
            colorValues[offset + 1] = this._color.g;
            colorValues[offset + 2] = this._color.b;
        }
        colors.needsUpdate = true;

        if (this._showPrincipalDirections) {
            for (let i = 0; i < positions.count; i += this._principalDirectionStride) {
                const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
                const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
                if (seenDirections.has(key)) continue;
                seenDirections.add(key);
                const frame = frameAtVertex(i);
                if (frame) directionFrames.push(frame);
            }
            this._principalDirectionsLayer.synchronizeWithFrames(directionFrames);
        }
    }


    set colorLayer(colorLayer) {
        this._colorLayer = colorLayer;
        this._normalizer = colorLayer.preferredNormalizer();
        this._normalizer.reset();
        this._colorMapper = colorLayer.preferredColorMapper();
        this._lastTime = undefined;
    }

    set colorMapper(colorMapper) {
        this._colorMapper = colorMapper;
        this._lastTime = undefined;
    }

    set normalizer(normalizer) {
        this._normalizer = normalizer;
        this._normalizer.reset();
        this._lastTime = undefined;
    }

    set principalDirectionsVisible(visible) {
        this._showPrincipalDirections = visible;
        this._principalDirectionsLayer.visible = visible;
        this._lastTime = undefined;
    }

    dispose() {
        this._marchingCubes.geometry.dispose();
        this._marchingCubes.material.dispose();
        this._principalDirectionsLayer.dispose();
        this.removeFromParent();
    }
}
