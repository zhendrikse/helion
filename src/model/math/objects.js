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

export class LineSegment extends MathPhysicsModelBehavior {
    constructor(from, to, color) {
        super();
        this.from = from;
        this.to = to;
        this.color = color;
    }

    clone() {
        return new LineSegment(this.from.clone(), this.to.clone(), this.color);
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
        stepSize = 1,
        color = 0xffaa55
    } = {}) {
        super();
        this._color = color;
        this._gridLines = [];
        if (stepSize <=0 || stepSize > size)
            throw new Error("Step size must be between 0 and size, but was " + stepSize);

        let pos = -size;
        for (let i = -size / stepSize; i <= size / stepSize; i++) {
            const verticalLine = new LineSegment(new Vec3(pos, -size, 0), new Vec3(pos, size, 0), color);
            this._gridLines.push(verticalLine);
            const horizontalLine = new LineSegment(new Vec3(-size, pos, 0), new Vec3(size, pos,0), color);
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

    color(param, index) {
        return 0xffff00;
    }

    generate() {
        this.clear();
        let position = this.initialPosition.clone();

        for (let i = 0; i < this.steps; i++) {
            const previous = position.clone();
            Integrators.rk4VectorStep(position, this.dt, p => this.derivative(p));
            const distance = position.distanceTo(previous);
            this.push(new LineSegment(previous, position.clone(), this.color(distance)));
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