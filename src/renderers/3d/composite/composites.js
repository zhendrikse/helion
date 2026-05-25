import { Group, Vector3, Color } from "three";
import { Arrow } from "../primitives/primitives.js";
import { VectorFieldVector, ComplexScalarFieldValue, Complex} from "../../../math/math.js";

//
// Plane waves
//
export class ElectromagneticWave extends Group {
    constructor({
                    electricFieldColor = new Color("orange"),
                    magneticFieldColor = new Color("cyan"),
                    arrowSize = 1,
                    numArrows = 100,
                    scalingFunction = (position, lambda) => .5, // default: fixed scaling with increasing distance
                } = {}) {
        super();
        this._electricFieldArrows = [];
        this._magneticFieldArrows = [];
        this._numArrows = numArrows;
        this._eletricFieldColor = electricFieldColor;
        this._magneticFieldColor = magneticFieldColor;
        this._arrowSize = arrowSize;
        this._scalingFunction = scalingFunction;

        // Optimization for vector calculations
        this._tempPosition = new Vector3();
        this._tempAxis = new Vector3();
        this._tempPosition = new Vector3();
        this._i_hat = new Vector3(1, 0, 0);

        this._planeWave = null;
    }

    attachTo(planeWave) {
        // Sanity checks
        if (!planeWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._planeWave = planeWave;
        this._createEmWaveFor(planeWave);
    }

    _updateFieldVectorAt(index) {
        const fieldVector = this._electricFieldArrows[index].body;

        // x = distance along wave
        const x = this._tempPosition.copy(fieldVector.position)
            .sub(this._planeWave.position)
            .length();

        // Field vectors haven't been added to the renderer by the application, so we need to sync state here:
        const scaling = this._scalingFunction(fieldVector.position);
        fieldVector.axis.y = scaling * this._planeWave.valueAt(x);

        // Magnetic field (orthogonal)
        this._magneticFieldArrows[index].body.axis.copy(
            this._tempAxis.copy(fieldVector.axis).cross(this._i_hat)
        );
    }

    render(transform) {
        for (let index = 0; index < this._electricFieldArrows.length; index++)
            this._updateFieldVectorAt(index);
        for (const arrow of this._electricFieldArrows)
            arrow.render(transform);
        for (const arrow of this._magneticFieldArrows)
            arrow.render(transform);
    }

    _createEmWaveFor(planeWave) {
        const ds = planeWave.lambda / 10.0;
        const dr1 = planeWave.position.clone().normalize().multiplyScalar(ds);
        const position = planeWave.position.clone();
        for (let ct = 0; ct < this._numArrows; ct++) {
            const electricFieldArrow = new Arrow({
                color: this._eletricFieldColor,
                size: this._arrowSize,
                round: true
            });
            const magneticFieldArrow = new Arrow({
                color: this._magneticFieldColor,
                size: this._arrowSize,
                round: true
            });
            electricFieldArrow.attachTo(new VectorFieldVector({position}));
            magneticFieldArrow.attachTo(new VectorFieldVector({position}));
            this._magneticFieldArrows.push(magneticFieldArrow);
            this._electricFieldArrows.push(electricFieldArrow);
            this.add(electricFieldArrow, magneticFieldArrow);

            position.add(dr1);
        }
    }
}

export class OneDimensionalComplexPlaneWave3D extends Group {
    constructor({
                    size = 1,
                    numArrows = 70,
                    round = false
                } = {}) {
        super();
        this._arrows = [];

        this._numArrows = numArrows;
        this._round = round;
        this._size = size;
        this._complexPlaneWave = null;
    }

    attachTo(complexPlaneWave) {
        // Sanity checks
        if (!complexPlaneWave.valueAt)
            throw new Error("Body does not implement valueAt(), hence it cannot be attached to this view.");

        this._complexPlaneWave = complexPlaneWave;

        const position = new Vector3().copy(complexPlaneWave.position);
        for (let i = 0; i < this._numArrows; i++)
            this._createArrowAt(position, i);
    }

    _createArrowAt(position, index) {
        const x = position.x + index * 0.5;
        const arrow = new Arrow({
            round: this._round,
            size: this._size,
            colorMap: (axis) => new Color().setHSL(1.0 - new Complex(axis.z, axis.y).phase() / (2 * Math.PI), 1.0, 0.5)
        });

        arrow.attachTo(new ComplexScalarFieldValue({ position: new Vector3(x, position.y, position.z) }));
        this._arrows.push(arrow);
        this.add(arrow);
    }

    render(transform) {
        for (let arrow of this._arrows)
            arrow.body.value = this._complexPlaneWave.valueAt(arrow.body.position.x);

        for (let arrow of this._arrows)
            arrow.render(transform);
    }
}