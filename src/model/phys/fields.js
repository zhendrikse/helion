import {DiscreteScalarField} from "../math/fields.js";
import {Registry} from "../../core/helion.js";
import {DropdownMenu} from "../../core/controls.js";

/**
 * This PotentialField class can be used as an obstacle mask
 * for classical wave scattering simulations as well as
 * quantum wave scattering simulations.
 */
export class PotentialField extends DiscreteScalarField {
    static Type = Object.freeze({
        Circle: "Circle",
        Square: "Square",
        Line: "Line",
        Step: "Step",
        SingleHole: "SingleHole",
        DoubleHole: "DoubleHole",
        Grating: "Grating"
    })

    static Shapes = new Registry({
        id: "surfaceShapeSelect",
        label: "🟦 Shape ",
        entries: PotentialField.Type
    });

    constructor({
        nx = 100,
        ny = 100,
        size = 40,
        energy = 0.1,
        softness = 0,
        potentialType = PotentialField.Type.DoubleHole
    } = {}) {
        super({ nx, ny });
        this._potentialType = potentialType;
        this._energy = energy;
        this._size = size;
        this._softness = softness;
        this.reset();
    }

    set size(value) {
        this._size = value;
    }

    set energy(value) {
        this._energy = value;
    }

    get shapeSelector() {
        return new DropdownMenu()
            .for(PotentialField.Shapes)
            .withValue(this._potentialType)
            .addEventListener("change", event => {
                    this._potentialType = event.target.value;
                    this.reset();
                }
            );
    }

    reset() {
        super.reset();
        const max = this.nx;
        switch (this._potentialType) {
            case PotentialField.Type.Circle:
                const rSquared = this._size * this._size/4.0;
                for (let y=0; y<max; y++)
                    for (let x=0; x<max; x++)
                        if ((x-max/2)**2 + (y-max/2)**2 < rSquared)
                            this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.Square:
                const edge = Math.round(max/2 - this._size/2);
                for (let y=edge; y<edge+this._size; y++)
                    for (let x=edge; x<edge+this._size; x++)
                        this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.Line:
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<Math.floor(max/2)+this._size; x++)
                        this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.Step:
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2); x<max; x++)
                        this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.SingleHole:
                const holeEdge = Math.round(max/2 - this._size/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= holeEdge || y > holeEdge+this._size)
                            this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.DoubleHole:
                const dhEdge = Math.round(max/2 - this._size/2);
                for (let y=0; y<max; y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y <= dhEdge-10 || y > dhEdge+this._size+10 || (y>dhEdge && y<=dhEdge+this._size))
                            this._data[y*max+x] = this._energy;
                break;
            case PotentialField.Type.Grating:
                for (let y=Math.floor(max/4); y<Math.floor(3*max/4); y++)
                    for (let x=Math.floor(max/2)-5; x<Math.floor(max/2)+5; x++)
                        if (y % this._size < this._size/2)
                            this._data[y*max+x] = this._energy;
                break;
            default:
                throw new Error(`Unknown potential type "${this._potentialType}"`);
        }
        this._applySoftness();
    }

    set softness(softness) {
        this._softness = softness;
    }

    _applySoftness() {
        for (let s=0; s < this._softness; s++) {
            const oldV = this._data.slice();
            for (let y = 1; y < this.nx - 1; y++)
                for (let x = 1; x < this.nx - 1; x++) {
                    const i = y * this.nx + x;
                    this._data[i] = (oldV[i + 1] + oldV[i - 1] + oldV[i + this.nx] + oldV[i - this.nx]) * .25;
                }
        }
    }
}
