import { DiscreteFieldSurfaceView } from './views.js';

/**
 * Visualizes the pressure/smoke/obstacle combination used by the 2D fluid solver.
 *
 * The pressure field is the model bound to this view. The smoke and obstacle
 * fields are additional state needed to reproduce the fluid visualization.
 */
export class FluidDynamicsView extends DiscreteFieldSurfaceView {
    /**
     * @param {{
     *   smokeField: import('../../model/math/fields.js').DiscreteScalarField,
     *   obstacleField: import('../../model/math/fields.js').DiscreteScalarField,
     *   scale?: number
     * }} options
     */
    constructor({ smokeField, obstacleField, scale = 1 } = {}) {
        super({ scale });
        this._smokeField = smokeField;
        this._obstacleField = obstacleField;
    }

    /** @param {import('../../model/math/fields.js').DiscreteScalarField} pressureField */
    canBindTo(pressureField) {
        super.canBindTo(pressureField);

        if (this._smokeField?.nx !== pressureField.nx || this._smokeField?.ny !== pressureField.ny)
            throw new Error('FluidDynamicsView needs a smoke field with the same dimensions as the pressure field.');

        if (this._obstacleField?.nx !== pressureField.nx || this._obstacleField?.ny !== pressureField.ny)
            throw new Error('FluidDynamicsView needs an obstacle field with the same dimensions as the pressure field.');

        return true;
    }

    /** @param {import('../../model/math/fields.js').DiscreteScalarField} pressureField */
    synchronizeWith(pressureField) {
        const width = pressureField.nx;
        const height = pressureField.ny;
        const range = pressureField.rangeAt();

        const pressureSpan = range.to - range.from;

        let index = 0;
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                const pressure = pressureField.valueAt(i, j);
                const normalizedPressure = pressureSpan === 0
                    ? 0.5
                    : (pressure - range.from) / pressureSpan;
                const smoke = this._obstacleField.valueAt(i, j);

                const [red, green, blue] = this._scientificColor(normalizedPressure);

                this._pixels[index++] = Math.max(0, red - 255 * smoke);
                this._pixels[index++] = Math.max(0, green - 255 * smoke);
                this._pixels[index++] = Math.max(0, blue - 255 * smoke);
                this._pixels[index++] = 255;
            }
        }

        this._texture.needsUpdate = true;
        this._mesh.material.map.needsUpdate = true;
    }

    /** @param {number} value normalized to [0, 1] */
    _scientificColor(value) {
        value = Math.min(Math.max(value, 0), 0.9999);

        const scaled = 4 * value;
        const segment = Math.floor(scaled);
        const s = scaled - segment;

        switch (segment) {
            case 0:
                return [0, 255 * s, 255];
            case 1:
                return [0, 255, 255 * (1 - s)];
            case 2:
                return [255 * s, 255, 0];
            default:
                return [255, 255 * (1 - s), 0];
        }
    }
}
