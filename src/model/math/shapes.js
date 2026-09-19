import { Registry } from '../../core/helion.js';
import { CompoundControl, DropdownMenu, Slider } from '../../core/controls.js';
import {Range, Vec2} from './math.js';

class ShapeLike {
    /**
     * @param {Vec2} position
     * @param {number} size
     * @param {number} lineWidth
     */
    constructor(size, position = new Vec2(), lineWidth = 5) {
        this._size = size;
        this._position = position;
        this._lineWidth = lineWidth;
    }

    get position() { return this._position; }

    /**
     * @abstract
     * @param {number} x
     * @param {number} y
     * @param {DiscreteScalarField} field
     */
    sample(x, y, field) {}
}

class SingleSlit extends ShapeLike {
    sample(x, y, field) {
        const holeEdge = Math.round(field.ny / 2 + this._position.y - this._size / 2);
        if (x < Math.floor(field.nx / 2 + this._position.x) - this._lineWidth ||
            x > Math.floor(field.nx / 2 + this._position.x) + this._lineWidth)
            return false;

        return y <= holeEdge || y > holeEdge + this._size;
    }
}

class DoubleSlit extends ShapeLike {
    sample(x, y, field) {
        if (x < Math.floor(field.nx / 2 + this._position.x) - this._lineWidth ||
            x > Math.floor(field.nx / 2 + this._position.x) + this._lineWidth)
            return false;

        const slitDistance = this._size;
        const dhEdge = Math.round(field.ny / 2 + this._position.y - slitDistance / 2);
        return y <= dhEdge - 10 || y > dhEdge + slitDistance + 10 || (y > dhEdge && y <= dhEdge + slitDistance);
    }
}

class Grating extends ShapeLike {
    sample(x, y, field) {
        if (y < Math.floor(field.ny / 4 + this._position.y) ||
            y > Math.floor(3 * field.ny / 4 + this._position.y))
            return false;
        if (x < Math.floor(field.nx / 2 + this._position.x) - this._lineWidth ||
            x > Math.floor(field.nx / 2 + this._position.x) + this._lineWidth)
            return false;

        return (y - this._position.y) % this._size < this._size / 2;
    }
}

class Circle extends ShapeLike {
    sample(x, y, field) {
        const rSquared = this._size * this._size / 4.0;
        const xx = (x - (field.nx / 2 + this._position.x));
        const yy = (y - (field.ny / 2 + this._position.y));
        return  xx * xx + yy * yy < rSquared;
    }
}

class Square extends ShapeLike {
    sample(x, y, field) {
        const xEdge = Math.round(field.nx / 2 + this._position.x - this._size / 2);
        const yEdge = Math.round(field.ny / 2 + this._position.y - this._size / 2);
        if (y < yEdge || y > yEdge + this._size)
            return false;
        return !(x < xEdge || x > xEdge + this._size);
    }
}

class Line extends ShapeLike {
    sample(x, y, field) {
        const gap = 30;
        const lineX = Math.floor(field.nx / 2 + this._position.x);

        return x >= lineX &&
            x <= lineX + this._lineWidth &&
            y >= gap &&
            y <= field.ny - gap;
    }
}

class Step extends ShapeLike {
    sample(x, y, field) {
        return x >= Math.floor(field.nx / 2 + this._position.x);
    }
}

export const Shapes = Object.freeze({
    SingleSlit: 'SingleSlit',
    DoubleSlit: 'DoubleSlit',
    Grating: 'Grating',
    Circle: 'Circle',
    Step: 'Step',
    Line: 'Line',
    Square: 'Square'
});

export class ShapesFactory extends Registry {
    static Shapes = {
        SingleSlit: SingleSlit,
        DoubleSlit: DoubleSlit,
        Grating: Grating,
        Circle: Circle,
        Step: Step,
        Line: Line,
        Square: Square
    };

    static this_ = new ShapesFactory();

    /** @param {ShapeConfiguration} shapeConfiguration */
    static create(shapeConfiguration) {
        const Type = ShapesFactory.this_.get(shapeConfiguration.shape);
        return new Type(shapeConfiguration.size, shapeConfiguration.position, shapeConfiguration.defaultLineThickness);
    }

    constructor() {
        const id = 'shapeTypeSelect',
            label = '🟦 Shape  ',
            entries = ShapesFactory.Shapes;
        super({ id, label, entries });
    }
}

export class ShapeConfiguration {
    /**
     * @param {{
     *     defaultSize?: number,
     *     defaultShape?: string,
     *     defaultPosition?: Vec2,
     *     defaultLineWidth?: number
     * }} param0
     */
    constructor({
        defaultSize = 40,
        defaultShape = Shapes.DoubleSlit,
        defaultLineWidth = 5,
        defaultPosition = new Vec2(0, 0)
    } = {}) {
        this._size = defaultSize;
        this._position = { ...defaultPosition };
        this._shape = defaultShape;
        this._defaultLineWidth = defaultLineWidth;
        this._onChangeEventListener = () => {};
    }

    get defaultLineThickness() { return this._defaultLineWidth; }
    get size() { return this._size; }
    get shape() { return this._shape; }
    get position() { return this._position; }

    /**
     * @param {() => void} onChangeEventListener
     */
    set onChangeEventListener(onChangeEventListener) {
        this._onChangeEventListener = onChangeEventListener;
    }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ShapesFactory())
                .withValue(this._shape)
                .addEventListener('change', event => {
                    // @ts-ignore
                    this._shape = event.target.value;
                    this._onChangeEventListener(event);
                })
            )
            .add(new Slider('📐 Size')
                .withRange(new Range(5, 50, 1))
                .withValue(this._size)
                .addEventListener('input', event => {
                    // @ts-ignore
                    this._size = Number(event.target.value);
                    this._onChangeEventListener(event);
                })
            );
    }
}