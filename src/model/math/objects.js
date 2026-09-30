import { MathPhysicsModelBehavior, Transformation} from '../behavior.js';
import { Matrix2D } from './linearalgebra.js';
import { Interval, degToRad} from './math.js';
import { Integrators} from './numerics/integrators/integrators.js';

export class Vec3 {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    /**
     * Rotates the body around a world-space axis.
     *
     * @param {'x'|'y'|'z'} axis
     * @param {number} angle Angle in radians.
     * @returns {this}
     */
    rotate(axis, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const { x, y, z } = this;

        switch (axis) {
            case 'x':
                this.y = cos * y - sin * z;
                this.z = sin * y + cos * z;
                break;

            case 'y':
                this.x = cos * x + sin * z;
                this.z = -sin * x + cos * z;
                break;

            case 'z':
                this.x = cos * x - sin * y;
                this.y = sin * x + cos * y;
                break;

            default:
                throw new Error(`Unknown rotation axis: ${axis}`);
        }

        return this;
    }

    randomDirection() {
        // https://mathworld.wolfram.com/SpherePointPicking.html
        const theta = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const c = Math.sqrt( 1 - u * u );

        this.x = c * Math.cos( theta );
        this.y = u;
        this.z = c * Math.sin( theta );

        return this;
    }

    setLength( length ) {
        return this.normalize().multiplyScalar( length );
    }

    /**
     * @param {Vec2 | Vec3} v
     * @param {number} alpha
     */
    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;

        return this;
    }

    /** @param {Vec3} v */
    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;

        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @oaram {number} z
     */
    set(x,y, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /** @param {Vec2 | Vec3} v */
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /** @param {Vec2 | Vec3} v */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * @param {Vec2 | Vec3} v
     * @param {number} scalar
     */
    addScaledVector(v, scalar) {
        this.x += v.x * scalar;
        this.y += v.y * scalar;
        this.z += v.z * scalar;
        return this;
    }

    /**
     * @param {Vec2 | Vec3} v
     */
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * @param {Vec2 | Vec3} a
     * @param {Vec3} b
     */
    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
    }

    /** @param {number} scalar */
    divideScalar(scalar) {
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    /** @param {number} scalar */
    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** @param {Vec2 | Vec3} v */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /** @param {Vec2 | Vec3} v */
    projectOnVector(v) {
        const denominator = v.lengthSq();

        if (denominator === 0) {
            return this.set(0, 0, 0);
        }

        const scalar = this.dot(v) / denominator;

        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;

        return this;
    }

    normalize() {
        const inv = 1 / this.length();

        this.x *= inv;
        this.y *= inv;
        this.z *= inv;

        return this;
    }

    random() {
        this.x = Math.random();
        this.y = Math.random();
        this.z = Math.random();
        return this;
    }

    /** @param {Vec2 | Vec3} position */
    distanceSquaredTo(position) {
        return (position.x - this.x) * (position.x - this.x) +
            (position.y - this.y) * (position.y - this.y) +
            (position.z - this.z) * (position.z - this.z);
    }

    /** @param {Vec2 | Vec3} position */
    distanceTo(position) {
        return Math.sqrt(this.distanceSquaredTo(position));
    }
}

export class Vec2 extends Vec3 {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x=0, y=0) {
        super(x, y, 0);
    }
}

export class VecN {
    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @param {Float64Array<ArrayBuffer>[]} basis
     */
    static reorthogonalize(vector, basis) {
        for (const q of basis) {
            const projection = VecN.dot(q, vector);
            for (let i = 0; i < vector.length; i++)
                vector[i] -= projection * q[i];
        }
    }

    /**
     * @param {Float64Array<ArrayBuffer>} a
     * @param {Float64Array<ArrayBuffer>} b
     * @returns {number}
     */
    static dot(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++)
            sum += a[i] * b[i];
        return sum;
    }

    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @returns {number}
     */
    static norm(vector) {
        return Math.sqrt(VecN.dot(vector, vector));
    }

    /** @param {Float64Array<ArrayBuffer>} vector */
    static normalize(vector) {
        const norm = VecN.norm(vector);
        if (norm === 0)
            throw new Error('LanczosEigenstateSolver produced a zero state.');

        VecN.scale(vector, 1 / norm);
    }

    /**
     * @param {Float64Array<ArrayBuffer>} vector
     * @param {number} factor
     */
    static scale(vector, factor) {
        for (let i = 0; i < vector.length; i++)
            vector[i] *= factor;
    }
}

/**
 * Mathematical definition of a parametrically defined curve.
 *
 * A parametric curve maps an interval to points in the plane:
 *
 *     γ : I → R²
 */
export class ParametricCurve extends MathPhysicsModelBehavior {
    /**
     * @param {{
     *   domain?: Interval
     *   func?: (t: number) => Vec2
     * }} options
     */
    constructor({
        domain = new Interval(-1, 1),
        func = t => new Vec2(t, 0)
    } = {}) {
        super();
        this.domain = domain;
        this._func = func;
    }

    /** @param {number} intervalResolution */
    rangeAt(intervalResolution) {
        const interval = new Interval(Infinity, -Infinity);
        for (let i = 0; i < intervalResolution; i++) {
            const point = this._func(this.domain.scaleUnitParameter(i / (intervalResolution - 1)));
            interval.include(point.y);
        }
        return interval;
    }

    /**
     * @param {number} u normalized parameter
     * @param {Vec2} target
     */
    sample(u, target = new Vec2()) {
        const point = this._func(this.domain.scaleUnitParameter(u));
        return target.copy(point);
    }
}

/**
 * A vector model.
 */
export class VectorModel extends MathPhysicsModelBehavior {
    /**
     * @param {Vec2 | Vec3 } position 
     * @param {Vec2 | Vec3} axis 
     */
    constructor(position, axis) {
        super();
        if (position == null || axis == null)
            throw new Error('Vector model requires both position and axis arguments (Vec2 or Vec3)');
        this.position = position.clone();
        this.axis = axis;
    }

    clone() {
        return new VectorModel(this.position.clone(), this.axis.clone());
    }

    /** @param {VectorModel} vectorModel */
    copy(vectorModel) {
        this.axis.copy(vectorModel.axis);
        this.position.copy(vectorModel.position);
    }

    /** @param {Transformation} transformation */
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
     * @param {Vec2 | Vec3} fromVec coordinates of from-point.
     * @param {Vec2 | Vec3} toVec coordinates of to-point.
     * @param {number} value a color can be passed on to this segment by using the hue scalar value for a color.
     */
    constructor(fromVec, toVec, value=0) {
        super();
        if (!fromVec || !toVec)
            throw new Error('Vector model requires both fromVec and toVec arguments (Vec2 or Vec3)');
        this.from = fromVec;
        this.to = toVec;
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

    /** @param {Transformation} transformation */
    apply(transformation) {
        transformation.applyTo(this.from);
        transformation.applyTo(this.to);
        return this;
    }
}

export class Segments extends MathPhysicsModelBehavior {
    constructor() {
        super();
        /** @type {MathPhysicsModelBehavior[]} */
        this._segments = [];
    }

    get count() { return this._segments.length; }

    [Symbol.iterator]() {
        return this._segments[Symbol.iterator]();
    }

    clear() {
        this._segments.length = 0;
    }

    /** @param {MathPhysicsModelBehavior} segment */
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
            throw new Error('Step size must be between 0 and size, but was ' + stepSize);

        let pos = -size;
        for (let i = -size / stepSize; i <= size / stepSize; i++) {
            const verticalLine = new LineSegment(new Vec2(pos, -size), new Vec2(pos, size));
            this._gridLines.push(verticalLine);
            const horizontalLine = new LineSegment(new Vec2(-size, pos), new Vec2(size, pos));
            this._gridLines.push(horizontalLine);
            pos += stepSize;
        }
        this._gridLines.forEach(line => this.push(line));
    }

    /** @param {Matrix2D} matrix */
    apply(matrix) {
        this.clear();
        for (const segment of this._gridLines)
            this.push(segment.clone().apply(matrix));
        return this;
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
                from: new Vec2(radius * Math.cos(t1), radius * Math.sin(t1)),
                to: new Vec2(radius * Math.cos(t2), radius * Math.sin(t2))
            });
        }

        this._points.forEach(segment => this.push(new LineSegment(segment.from.clone(), segment.to.clone(), color)));
    }

    /** @param {Matrix2D} matrix */
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

    /** @param {Vec3} _point */
    derivative(_point) {}

    /**
     * @param {number} _parameter
     * @param {number} _index
     */
    hue(_parameter, _index = 0) {
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
    /** 
     * @param {{
     * basis: ((x: any) => number)[], 
     * coefficients: number[]}} options 
     */
    constructor({ basis, coefficients }) {
        this._basis = basis;
        this._coefficients = coefficients;
    }

    /**
     * @param {number} x 
     * @param {number} numberOfTerms 
     * @returns {number}
     * }}
     */
    evaluate(x, numberOfTerms = this._basis.length) {
        let result = 0;

        for (let n = 0; n < numberOfTerms; n++)
            result += this._coefficients[n] * this._basis[n](x);

        return result;
    }
}

export class Turtle extends Segments {
    static PenState = Object.freeze({
        UP: false,
        DOWN: true
    });

    /**
     * @param {{
     * penState?: boolean
     * color?: number
     * }} param0 
     */
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

    /** @param {number} angle */
    right(angle) {
        this.angle += degToRad(angle);
        return this;
    }

    /** @param {number} angle */
    left(angle) {
        this.angle -= degToRad(angle);
        return this;
    }

    /** @param {number} distance */
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

    /** @param {number} color */
    color(color) {
        this.currentColor = color;
        return this;
    }

    /** @param {number} distance */
    forward(distance) {
        const newX = this.x + distance * Math.cos(this.angle);
        const newY = this.y - distance * Math.sin(this.angle);

        this.goto(newX, newY);
        return this;
    }

    /** 
     * @param {number} x 
     * @param {number} y
     */
    goto(x, y) {
        const from = new Vec2(this.x, this.y);
        const to = new Vec2(x, y);

        if (this.penState === Turtle.PenState.DOWN)
            this.push(new LineSegment(from, to, this.currentColor));

        this.x = x;
        this.y = y;

        return this;
    }
}