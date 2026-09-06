export class DirichletBoundaryCondition {
    /**
     * @typedef {Object} DirichletBoundaryConditionOptions
     * @property {(x: number, y: number) => boolean} isFixed
     * @property {(x: number, y: number) => number} valueAt
     */

    /**
     * @param {DirichletBoundaryConditionOptions} options
     */
    constructor({
        isFixed,
        valueAt
    }) {
        this._isFixed = isFixed;
        this._valueAt = valueAt;
    }

    isFixed(x, y) {
        return this._isFixed(x, y);
    }

    valueAt(x, y) {
        return this._valueAt(x, y);
    }
}
