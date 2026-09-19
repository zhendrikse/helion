import { Registry } from '../../core/helion.js';
import { CompoundControl, DropdownMenu, Slider } from '../../core/controls.js';
import { Range } from './math.js';

class ShapeLike {
    /** @param {number} size */
    constructor(size, position = { x: 0, y: 0 }) {
        this._size = size;
        this._position = position;
    }

    get position() { return this._position; }

    /**
     * @param {number} _x
     * @param {number} _y
     */
    sample(_x, _y) {}
}

class SingleSlit extends ShapeLike {
    sample(x, y, field) {
        const holeEdge = Math.round(field.ny / 2 + this._position.y - this._size / 2);
        if (x < Math.floor(field.nx / 2 + this._position.x) - 5 || x > Math.floor(field.nx / 2 + this._position.x) + 5)
            return false;

        return y <= holeEdge || y > holeEdge + this._size;
    }
}

class DoubleSlit extends ShapeLike {
    sample(x, y, field) {
        if (x < Math.floor(field.nx / 2 + this._position.x) - 5 || x > Math.floor(field.nx / 2 + this._position.x) + 5)
            return false;

        const slitDistance = this._size;
        const dhEdge = Math.round(field.ny / 2 + this._position.y - slitDistance / 2);
        return y <= dhEdge - 10 || y > dhEdge + slitDistance + 10 || (y > dhEdge && y <= dhEdge + slitDistance);
    }
}

class Grating extends ShapeLike {
    sample(x, y, field) {
        if (y < Math.floor(field.ny / 4 + this._position.y) || y > Math.floor(3 * field.ny / 4 + this._position.y))
            return false;
        if (x < Math.floor(field.nx / 2 + this._position.x) - 5 || x > Math.floor(field.nx / 2 + this._position.x) + 5)
            return false;

        return (y - this._position.y) % this._size < this._size / 2;
    }
}

class Circle extends ShapeLike {
    sample(x, y, field) {
        const rSquared = this._size * this._size/4.0;
        return (x - (field.nx / 2 + this._position.x)) * (x - (field.nx / 2 + this._position.x)) + (y - (field.ny / 2 + this._position.y)) * (y - (field.ny / 2 + this._position.y)) < rSquared;
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
        return x >= Math.floor(field.nx / 2 + this._position.x) &&
            x <= Math.floor(field.nx / 2 + this._position.x) + this._size;
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
        return new Type(shapeConfiguration.size, shapeConfiguration.position);
    }

    constructor() {
        const id = 'shapeTypeSelect',
            label = '🟦 Shape  ',
            entries = ShapesFactory.Shapes;
        super({ id, label, entries });
    }
}

export class ShapeConfiguration {
    constructor({
                    defaultSize = 40,
                    defaultShape = Shapes.DoubleSlit,
                    defaultPosition = { x: 0, y: 0 }
                } = {}) {
        this._size = defaultSize;
        this._position = { ...defaultPosition };
        this._shape = defaultShape;
        this._onChangeEventListener = () => {};
    }

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