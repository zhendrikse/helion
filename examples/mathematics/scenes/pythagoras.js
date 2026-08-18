import { Color } from "three";
import {
    Segments, LineSegment, Simulation, LineSegmentsView, Vec3, Slider, Range, LineSegmentView, LabelView
} from "../../../src/index.js";

const triangleColor = new Color(0xffffff);
const aColor = new Color(0x44aaff);
const bColor = new Color(0x44dd88);
const cColor = new Color(0xffaa44);

class Pythagoras extends Segments {
    constructor(a = 4.0, b = 3.0) {
        super();

        this._a = a;
        this._b = b;

        this._A = new Vec3();
        this._B = new Vec3();
        this._C = new Vec3();

        this._ab = new LineSegment(this._A, this._B, triangleColor);
        this._ac = new LineSegment(this._A, this._C, triangleColor);
        this._bc = new LineSegment(this._B, this._C, triangleColor);

        this.generate();
    }

    generate() {
        this.clear();

        this._A.set(0, 0, 0);
        this._B.set(this._a, 0, 0);
        this._C.set(0, this._b, 0);

        this.push(this._ab);
        this.push(this._ac);
        this.push(this._bc);

        this.addSquare(this._A, this._B, aColor, -1);
        this.addSquare(this._A, this._C, bColor, 1);
        this.addSquare(this._C, this._B, cColor, 1);
    }

    addSquare(p1, p2, color, direction = 1) {
        const side = p2.clone().sub(p1);

        const normal = new Vec3(-side.y, side.x, 0)
            .normalize()
            .multiplyScalar(side.length() * direction);

        const p3 = p2.clone().add(normal);
        const p4 = p1.clone().add(normal);

        this.push(new LineSegment(p1, p2, color));
        this.push(new LineSegment(p2, p3, color));
        this.push(new LineSegment(p3, p4, color));
        this.push(new LineSegment(p4, p1, color));
    }

    set a(a) {
        this._a = a;
        this.generate();
    }

    set b(b) {
        this._b = b;
        this.generate();
    }

    get a() { return this._a; }
    get b() { return this._b; }
    get c() { return Math.sqrt(this._a ** 2 + this._b ** 2); }
    get ab() { return this._ab; }
    get bc() { return this._bc; }
    get ac() { return this._ac; }
}

const pythagoras = new Pythagoras(4, 3);

const view = new LineSegmentsView({
    lineWidth: 3
});

Simulation
    .with({
        htmlDivId: "pythagorasContainer",
        parameterMenuCollapsed: false
    })
    .bind(pythagoras.onceWith(view))
    .bind(pythagoras.ab.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.ac.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.bc.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.ab.onceWith(new LabelView({
        text: model => "a=" + pythagoras.a,
        offset: new Vec3(0, -.5, 0),
        color: "#44aaff",
        fontSize: "30px"
    })))
    .bind(pythagoras.ac.onceWith(new LabelView({
        text: model => "b=" + pythagoras.b,
        offset: new Vec3(-1.1, 0, 0),
        color: "#44dd88",
        fontSize: "30px"
    })))
    .bind(pythagoras.bc.onceWith(new LabelView({
        text: model => "c=" + pythagoras.c.toFixed(2),
        offset: new Vec3(.75, .75, 0),
        color: "#ffaa44",
        fontSize: "30px"
    })))
    .frameSceneOn(view, {
        padding: 0.75,
        viewDirection: new Vec3(0, 0, 1)
    })
    .append(new Slider("a")
        .on(pythagoras)
        .withProperty("a")
        .withRange(new Range(1, 8, 0.01))
        .withValue(4)
    )
    .append(new Slider("b")
        .on(pythagoras)
        .withProperty("b")
        .withRange(new Range(1, 8, 0.01))
        .withValue(3)
    );
