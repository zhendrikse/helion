import {MathPhysicsModelBehavior} from "../../core/helion.js";
import {degToRad, Vec3} from "./math.js";
import {Integrators} from "./numerics/integrators/integrators.js";

export class LineSegment {
    constructor(from, to, color) {
        this.from = from;
        this.to = to;
        this.color = color;
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
            Integrators.rk4VectorStep(position, this.dt, this.derivative);
            this.push(new LineSegment(previous, position, this.color(position, i)));
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

        this.angle = 0;
        this.x = 0;
        this.y = 0;
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
        const newY = this.y + distance * Math.sin(this.angle);

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