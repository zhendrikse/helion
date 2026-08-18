import { Color } from "three";
import {
    Segments, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Transformation
} from "../../../src/index.js";

const size = 5;

class Matrix2D extends Transformation{
    constructor(a, b, c, d) {
        super();
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    applyTo(vector) {
        return new Vec3(
            this.a * vector.x + this.b * vector.y,
            this.c * vector.x + this.d * vector.y,
            vector.z
        );
    }
}

class Grid extends Segments {
    constructor({
        size = 5,
        color = new Color(0xffaa55)
    } = {}) {
        super();
        this._color = color;
        this._gridLines = [];
        for (let i = -size; i <= size; i++) {
            const verticalLine = new LineSegment(new Vec3(i, -size, 0), new Vec3(i,  size, 0), color);
            this._gridLines.push(verticalLine);
            const horizontalLine = new LineSegment(new Vec3(-size, i, 0), new Vec3( size, i, 0), color);
            this._gridLines.push(horizontalLine);
        }
        this._gridLines.forEach(line => this.push(line));
    }

    apply(matrix) {
        this.clear();
        for (const segment of this._gridLines)
            this.push(new LineSegment(matrix.applyTo(segment.from), matrix.applyTo(segment.to), this._color));
    }
}

const transformation = new Matrix2D(
    2, 1,
    0, 1
);

const originalGrid = new Grid({ size: size, color: new Color(0xffaa55) });
const transformedGrid = new Grid({ size: size, color: new Color(0x44aaff) });
transformedGrid.apply(transformation);

Simulation
    .with({
        htmlDivId: "matrixTransformationContainer",
        cameraPosition: new Vec3(0, 0, 4 * (size + 0.1))
    })
    .bind(originalGrid.onceWith(new LineSegmentsView({ lineWidth: 2 })))
    .bind(transformedGrid.onceWith(new LineSegmentsView({ lineWidth: 2 })))
    .append(new Slider("a")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(2)
        .onInput(event => {
            transformation.a = event.target.value;
            transformedGrid.apply(transformation);
        })
    )
    .append(new Slider("b")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(1)
        .onInput(event => {
            transformation.b = event.target.value;
            transformedGrid.apply(transformation);
        })
    )
    .append(new Slider("c")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(0)
        .onInput(event => {
            transformation.c = event.target.value;
            transformedGrid.apply(transformation);
        })
    )
    .append(new Slider("d")
        .withRange(new Range(-2, 2, 0.01))
        .withValue(1)
        .onInput(event => {
            transformation.d = event.target.value;
            transformedGrid.apply(transformation);
        })
    );