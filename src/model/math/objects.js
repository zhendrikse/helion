import {MathPhysicsModelBehavior} from "../../core/helion.js";
import {degToRad, Vec3} from "./math.js";
import {Integrators} from "./numerics/integrators/integrators.js";

/**
 * A vector model.
 *
 * Arrow expects:
 *     position
 *     axis
 */
export class VectorModel extends MathPhysicsModelBehavior {
    constructor(position = new Vec3(), axis = new Vec3()) {
        super();
        this.position = position;
        this.axis = axis;
    }

    clone() {
        return new VectorModel(this.position.clone(), this.axis.clone());
    }

    copy(vectorModel) {
        this.axis.copy(vectorModel.axis);
        this.position.copy(vectorModel.position);
    }

    apply(transformation) {
        transformation.applyTo(this.axis);
        return this;
    }
}

/**
 * A line (segment) between two points.
 */
export class LineSegment extends MathPhysicsModelBehavior {
    /**
     * @param fromVec3 coordinates of from-point.
     * @param toVec3 coordinates of to-point.
     * @param value a color can be passed on to this segment by using the hue scalar value for a color.
     */
    constructor(fromVec3, toVec3, value=0) {
        super();
        this.from = fromVec3;
        this.to = toVec3;
        this.scalar = value;
    }

    clone() {
        return new LineSegment(this.from.clone(), this.to.clone(), this.scalar);
    }

    get position() {
        return this.from.clone()
            .add(this.to)
            .multiplyScalar(0.5);
    }

    get axis() {
         return this.to.clone().sub(this.from);
    }

    apply(transformation) {
        transformation.applyTo(this.from);
        transformation.applyTo(this.to);
        return this;
    }
}

export class Segments extends MathPhysicsModelBehavior {
    constructor() {
        super();
        this._segments = [];
    }

    get count() { return this._segments.length }

    [Symbol.iterator]() {
        return this._segments[Symbol.iterator]();
    }

    clear() {
        this._segments.length = 0;
    }

    push(segment) {
        this._segments.push(segment);
    }
}

export class Grid extends Segments {
    constructor({
        size = 5,
        stepSize = 1
    } = {}) {
        super();
        this._gridLines = [];
        if (stepSize <=0 || stepSize > size)
            throw new Error("Step size must be between 0 and size, but was " + stepSize);

        let pos = -size;
        for (let i = -size / stepSize; i <= size / stepSize; i++) {
            const verticalLine = new LineSegment(new Vec3(pos, -size, 0), new Vec3(pos, size, 0));
            this._gridLines.push(verticalLine);
            const horizontalLine = new LineSegment(new Vec3(-size, pos, 0), new Vec3(size, pos,0));
            this._gridLines.push(horizontalLine);
            pos += stepSize;
        }
        this._gridLines.forEach(line => this.push(line));
    }

    apply(matrix) {
        this.clear();
        for (const segment of this._gridLines)
            this.push(segment.clone().apply(matrix));
    }
}

export class SegmentedCircle extends Segments {
    constructor({
        radius = 1,
        segments = 96,
        color = 0xffaa55
    } = {}) {
        super();

        this._color = color;
        this._points = [];

        for (let i = 0; i < segments; i++) {
            const t1 = 2 * Math.PI * i / segments;
            const t2 = 2 * Math.PI * (i + 1) / segments;

            this._points.push({
                from: new Vec3(radius * Math.cos(t1), radius * Math.sin(t1), 0),
                to: new Vec3(radius * Math.cos(t2), radius * Math.sin(t2), 0)
            });
        }

        this._points.forEach(segment => this.push(new LineSegment(segment.from.clone(), segment.to.clone(), color)));
    }

    apply(matrix) {
        this.clear();

        for (const segment of this._points) {
            const from = segment.from.clone();
            const to = segment.to.clone();

            matrix.applyTo(from);
            matrix.applyTo(to);

            this.push(new LineSegment(from, to, this._color));
        }

        return this;
    }
}

export class StrangeAttractor extends Segments {
    constructor({
        initialPosition = new Vec3(),
        dt = 0.01,
        steps = 10000
    } = {}) {
        super();

        this.initialPosition = initialPosition;
        this.dt = dt;
        this.steps = steps;

        this.generate();
    }

    derivative(point) {}

    hue(parameter, index) {
        return 0.5;
    }

    generate() {
        this.clear();
        let position = this.initialPosition.clone();

        for (let i = 0; i < this.steps; i++) {
            const previous = position.clone();
            Integrators.rk4VectorStep(position, this.dt, p => this.derivative(p));
            const distance = position.distanceTo(previous);
            this.push(new LineSegment(previous, position.clone(), this.hue(distance)));
        }
    }
}

export class LinearCombination {
    constructor({ basis, coefficients }) {
        this._basis = basis;
        this._coefficients = coefficients;
    }

    evaluate(x, numberOfTerms = this._basis.length) {
        let result = 0;

        for (let n = 0; n < numberOfTerms; n++)
            result += this._coefficients[n] * this._basis[n](x);

        return result;
    }
}

export class FunctionGraph extends Segments {
    constructor({
        func,
        interval,
        samples = 200,
        yOffset = 0
    }) {
        super();

        this._function = func;
        this._interval = interval;
        this._samples = samples;
        this._yOffset = yOffset;

        this.update();
    }

    setFunction(func) {
        this._function = func;
        this.update();
    }

    update() {
        this.clear();
        const dx = this._interval.range / this._samples;
        let x1 = this._interval.from;
        let y1 = this._function(x1) + this._yOffset;

        for (let i = 1; i <= this._samples; i++) {
            const x2 = this._interval.from + i * dx;
            const y2 = this._function(x2) + this._yOffset;
            this.push(new LineSegment(new Vec3(x1, y1, 0), new Vec3(x2, y2, 0)));
            x1 = x2;
            y1 = y2;
        }
    }
}

export class Turtle extends Segments {
    static PenState = Object.freeze({
        UP: false,
        DOWN: true
    });

    constructor({
        penState = Turtle.PenState.UP,
        color =0xffff00
    } = {}) {
        super();

        this.currentColor = color;
        this.penState = penState;
        this._initialColor = color;
        this._initialPenState = penState;

        this.angle = 0;
        this.x = 0;
        this.y = 0;
    }

    reset() {
        this.angle = 0;
        this.x = 0;
        this.y = 0;
        this.currentColor = this._initialColor;
        this.penState = this._initialPenState;
        this.clear();
    }

    right(angle) {
        this.angle += degToRad(angle);
        return this;
    }

    left(angle) {
        this.angle -= degToRad(angle);
        return this;
    }

    backward(distance) {
        return this.forward(-distance);
    }

    penDown() {
        this.penState = Turtle.PenState.DOWN;
        return this;
    }

    penUp() {
        this.penState = Turtle.PenState.UP;
        return this;
    }

    color(color) {
        this.currentColor = color;
        return this;
    }

    forward(distance) {
        const newX = this.x + distance * Math.cos(this.angle);
        const newY = this.y - distance * Math.sin(this.angle);

        this.goto(newX, newY);
        return this;
    }

    goto(x, y) {
        const from = new Vec3(this.x, this.y, 0);
        const to = new Vec3(x, y, 0);

        if (this.penState === Turtle.PenState.DOWN)
            this.push(new LineSegment(from, to, this.currentColor));

        this.x = x;
        this.y = y;

        return this;
    }
}