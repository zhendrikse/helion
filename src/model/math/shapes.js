import { Registry } from "../../core/helion.js";
import { CompoundControl, DropdownMenu, Slider } from "../../core/controls.js";
import { Range } from "./math.js";

class ShapeLike {
    constructor(size) {
        this._size = size;
    }

    sample(x, y) {}
}

class SingleSlit extends ShapeLike {
    sample(x, y, field) {
        const holeEdge = Math.round(field.nx / 2 - this._size / 2);
        if (x < Math.floor(field.nx / 2) - 5 || x > Math.floor(field.nx / 2) + 5)
            return false;

        return y <= holeEdge || y > holeEdge + this._size;
    }
}

class DoubleSlit extends ShapeLike {
    sample(x, y, field) {
        if (x < Math.floor(field.nx / 2) - 5 || x > Math.floor(field.nx / 2) + 5)
            return false;

        const slitDistance = this._size;
        const dhEdge = Math.round(field.nx / 2 - slitDistance / 2);
        return y <= dhEdge - 10 || y > dhEdge + slitDistance + 10 || (y > dhEdge && y <= dhEdge + slitDistance);
    }
}

class Grating extends ShapeLike {
    sample(x, y, field) {
        if (y < Math.floor(field.ny / 4) || y > Math.floor(3 * field.ny / 4))
            return false;
        if (x < Math.floor(field.nx / 2) - 5 || x > Math.floor(field.nx / 2) + 5)
            return false;

        return y % this._size < this._size / 2;
    }
}

class Circle extends ShapeLike {
    sample(x, y, field) {
        const rSquared = this._size * this._size/4.0;
        return (x - field.nx / 2) * (x - field.nx / 2) + (y - field.nx / 2) * (y - field.nx / 2) < rSquared;
    }
}

class Square extends ShapeLike {
    sample(x, y, field) {
        const edge = Math.round(field.nx / 2 - this._size / 2);
        if (y < edge || y > edge + this._size)
            return false;
        return !(x < edge || x > edge + this._size);
    }
}

class Line extends ShapeLike {
    sample(x, y, field) {
        for (let y = 0; y < field.ny; y++)
            if (x < Math.floor(field.nx / 2) || x > Math.floor(field.nx / 2) + this._size)
                return false;

        return true;
    }
}

class Step extends ShapeLike {
    sample(x, y, field) {
        for (let y = 0; y < field.ny; y++)
            if(x < Math.floor(field.nx / 2) || x > field.nx)
                return false;

        return true;
    }
}

export const Shapes = Object.freeze({
    SingleSlit: "SingleSlit",
    DoubleSlit: "DoubleSlit",
    Grating: "Grating",
    Circle: "Circle",
    Step: "Step",
    Line: "Line",
    Square: "Square"
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

    static create(shapeConfiguration) {
        const Type = ShapesFactory.this_.get(shapeConfiguration.shape);
        return new Type(shapeConfiguration.size);
    }

    constructor() {
        const id = "shapeTypeSelect",
            label = "🟦 Shape  ",
            entries = ShapesFactory.Shapes;
        super({ id, label, entries });
    }
}

export class ShapeConfiguration {
    constructor({
                    defaultSize = 40,
                    defaultShape = Shapes.DoubleSlit
                } = {}) {
        this._size = defaultSize;
        this._shape = defaultShape;
        this._onChangeEventListener = () => {};
    }

    get size() { return this._size; }
    get shape() { return this._shape; }

    set onChangeEventListener(onChangeEventListener) {
        this._onChangeEventListener = onChangeEventListener;
    }

    ui() {
        return new CompoundControl()
            .add(new DropdownMenu()
                .for(new ShapesFactory())
                .withValue(this._shape)
                .addEventListener("change", event => {
                    this._shape = event.target.value;
                    this._onChangeEventListener(event);
                })
            )
            .add(new Slider("📐 Size")
                .withRange(new Range(5, 50, 1))
                .withValue(this._size)
                .addEventListener("input", event => {
                    this._size = Number(event.target.value);
                    this._onChangeEventListener(event);
                })
            )
    }
}