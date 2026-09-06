export class DirichletBoundaryCondition {
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
