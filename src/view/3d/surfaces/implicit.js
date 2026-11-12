import {
    BufferAttribute, BufferGeometry, Color, DoubleSide, LineBasicMaterial, LineSegments, MeshStandardMaterial
} from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { Renderable3D } from '../../renderer.js';
import { Colour, ColorMappers } from '../../colormappers.js';
import { ImplicitDifferentialGeometry, DifferentialFrame } from '../../../model/math/numerics/diffgeometry.js';
import { Vec3 } from '../../../model/math/objects.js';

/**
 * Extracts an isosurface from an ImplicitSurface model using marching cubes.
 * Optionally colors vertices by mean curvature and displays principal directions.
 */
export class ImplicitSurfaceView extends Renderable3D {
    /**
     * @param {{
     *  resolution?: number,
     *  opacity?: number,
     *  material?: import('three').Material,
     *  maxPolyCount?: number,
     *  curvatureColors?: boolean,
     *  showPrincipalDirections?: boolean,
     *  principalDirectionStride?: number,
     *  principalDirectionScale?: number
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
        maxPolyCount = 30000,
        curvatureColors = true,
        showPrincipalDirections = false,
        principalDirectionStride = 250,
        principalDirectionScale = 0.08
    } = {}) {
        super();
        color.asThreeJsColor(material.color);
        material.opacity = opacity;
        material.transparent = true;
        material.side = DoubleSide;
        material.vertexColors = curvatureColors;

        this._marchingCubes = new MarchingCubes(resolution, material, false, false, maxPolyCount);
        this._resolution = resolution;
        this._lastTime = undefined;
        this._curvatureColors = curvatureColors;
        this._showPrincipalDirections = showPrincipalDirections;
        this._principalDirectionStride = Math.max(1, principalDirectionStride);
        this._principalDirectionScale = principalDirectionScale;
        this._differentialGeometry = null;
        this._frame = new DifferentialFrame();
        this._colorMapper = ColorMappers.get(ColorMappers.Seismic);
        this._color = new Color();
        this._principalLines = new LineSegments(
            new BufferGeometry(),
            new LineBasicMaterial({ vertexColors: true, transparent: true })
        );
        this._marchingCubes.add(this._principalLines);
        this._principalLines.visible = showPrincipalDirections;
        this.add(this._marchingCubes);
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    canBindTo(model) {
        return typeof model.sampleAt === 'function';
    }

    /** @param {import('../../../model/math/surfaces.js').ImplicitSurface} model */
    initialize(model) {
        this._lastTime = undefined;
        const center = model.min.clone().add(model.max).multiplyScalar(0.5);
        const halfSize = model.max.clone().sub(model.min).multiplyScalar(0.5);

        this._marchingCubes.position.set(center.x, center.y, center.z);
        this._marchingCubes.scale.set(halfSize.x, halfSize.y, halfSize.z);

        // Set the finite-difference step relative to the sampled volume.
        const eps = Math.min(halfSize.x, halfSize.y, halfSize.z) / this._resolution * 0.1;
        this._differentialGeometry = new ImplicitDifferentialGeometry(model, { eps });
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

        if (this._curvatureColors || this._showPrincipalDirections)
            this.#updateDifferentialGeometry(center, halfSize);
    }

    #updateDifferentialGeometry(center, halfSize) {
        const geometry = this._marchingCubes.geometry;
        const positions = geometry.attributes.position;
        if (!positions || positions.count === 0)
            return;

        let colors = geometry.getAttribute('color');
        if (this._curvatureColors && (!colors || colors.count !== positions.count)) {
            colors = new BufferAttribute(new Float32Array(positions.count * 3), 3);
            geometry.setAttribute('color', colors);
        }

        const colorValues = colors?.array;
        const curvature = this._curvatureColors ? new Float32Array(positions.count) : null;
        const cache = new Map();
        let maxAbsCurvature = 0;

        // MarchingCubes emits triangle vertices without sharing them. Cache frames by
        // position so the finite-difference calculation is done only once per location.
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
            let meanCurvature = cache.get(key);

            if (meanCurvature === undefined) {
                const point = new Vec3(
                    center.x + x * halfSize.x,
                    center.y + y * halfSize.y,
                    center.z + z * halfSize.z
                );
                const frame = this._differentialGeometry.differentialFrameAt(point, this._frame);
                meanCurvature = frame ? 0.5 * (frame.k1 + frame.k2) : 0;
                cache.set(key, meanCurvature);
            }

            if (curvature) {
                curvature[i] = meanCurvature;
                maxAbsCurvature = Math.max(maxAbsCurvature, Math.abs(meanCurvature));
            }
        }

        if (curvature) {
            const scale = Math.max(maxAbsCurvature, 1e-9);
            for (let i = 0; i < positions.count; i++) {
                this._colorMapper.map(0.5 + 0.5 * curvature[i] / scale, this._color);
                const offset = i * 3;
                colorValues[offset] = this._color.r;
                colorValues[offset + 1] = this._color.g;
                colorValues[offset + 2] = this._color.b;
            }
            colors.needsUpdate = true;
        }

        if (this._showPrincipalDirections)
            this.#updatePrincipalDirectionLines(positions, center, halfSize);
    }

    #updatePrincipalDirectionLines(positions, center, halfSize) {
        const linePositions = [];
        const lineColors = [];
        const stride = this._principalDirectionStride;
        const scale = this._principalDirectionScale;
        const seen = new Set();

        for (let i = 0; i < positions.count; i += stride) {
            const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
            const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const point = new Vec3(
                center.x + x * halfSize.x,
                center.y + y * halfSize.y,
                center.z + z * halfSize.z
            );
            if (!this._differentialGeometry.differentialFrameAt(point, this._frame))
                continue;

            for (const [direction, rgb] of [
                [this._frame.d1, [1, 0.25, 0.15]],
                [this._frame.d2, [0.15, 0.75, 1]]
            ]) {
                linePositions.push(
                    x, y, z,
                    x + direction.x * scale / halfSize.x,
                    y + direction.y * scale / halfSize.y,
                    z + direction.z * scale / halfSize.z
                );
                lineColors.push(...rgb, ...rgb);
            }
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(linePositions), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(lineColors), 3));

        this._principalLines.geometry.dispose();
        this._principalLines.geometry = geometry;
    }

    set principalDirectionsVisible(visible) {
        this._showPrincipalDirections = visible;
        this._principalLines.visible = visible;
    }

    dispose() {
        this._marchingCubes.geometry.dispose();
        this._marchingCubes.material.dispose();
        this._principalLines.geometry.dispose();
        this._principalLines.material.dispose();
        this.removeFromParent();
    }
}
