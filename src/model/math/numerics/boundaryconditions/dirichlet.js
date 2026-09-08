export class DirichletBoundaryCondition {
    /**
     * @param {{
     * isFixed?: (x: number, y: number) => boolean,
     * valueAt?: (x: number, y: number) => number
     * }} options
     */
    constructor({
        isFixed = (x, y) => false,
        valueAt = (x, y) => 0
    }) {
        this._isFixed = isFixed;
        this._valueAt = valueAt;
    }

    /** @param {number} x  @param {number} y */
    isFixed(x, y) {
        return this._isFixed(x, y);
    }

    /** @param {number} x  @param {number} y */
    valueAt(x, y) {
        return this._valueAt(x, y);
    }
}
