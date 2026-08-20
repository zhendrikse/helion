import {
    Segments, LineSegment, Simulation, LineSegmentsView, Vec3, Slider, Range, LineSegmentView, Label, ColorMappers
} from "../../../src/index.js";

class Pythagoras extends Segments {
    constructor(a = 4.0, b = 3.0) {
        super();

        this._a = a;
        this._b = b;

        this._A = new Vec3();
        this._B = new Vec3();
        this._C = new Vec3();

        this._ab = new LineSegment(this._A, this._B);
        this._ac = new LineSegment(this._A, this._C);
        this._bc = new LineSegment(this._B, this._C);

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

        this.addSquare(this._A, this._B, 0x44aaff, -1);
        this.addSquare(this._A, this._C, 0x44dd88, 1);
        this.addSquare(this._C, this._B, 0xffaa44, 1);
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
const segmentsView = new LineSegmentsView({
    lineWidth: 3,
    colorMapper: ColorMappers.get(ColorMappers.HexValueColorMapper)
});

Simulation
    .with({
        htmlDivId: "pythagorasContainer",
        controls: false
    })
    .bind(pythagoras.onceWith(segmentsView))
    .bind(pythagoras.ab.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.ac.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.bc.onceWith(new LineSegmentView({lineWidth: 3})))
    .bind(pythagoras.ab.onceWith(new Label({
        text: model => "a=" + pythagoras.a,
        offset: model => new Vec3(0, -.5, 0),
        color: "#44aaff",
        fontSize: "30px"
    })))
    .bind(pythagoras.ac.onceWith(new Label({
        text: model => "b=" + pythagoras.b,
        offset: model => new Vec3(-.90, 0, 0),
        color: "#44dd88",
        fontSize: "30px"
    })))
    .bind(pythagoras.bc.onceWith(new Label({
        text: model => "c=" + pythagoras.c.toFixed(2),
        offset: model => new Vec3(.55, .55, 0),
        color: "#ffaa44",
        fontSize: "30px"
    })))
    .frameSceneOn(segmentsView, {
        padding: 0.55,
        viewDirection: new Vec3(0, 0, 1)
    })
    .append(new Slider("a")
        .on(pythagoras)
        .withProperty("a")
        .withRange(new Range(1, 4, 0.01))
        .withValue(4)
    )
    .append(new Slider("b")
        .on(pythagoras)
        .withProperty("b")
        .withRange(new Range(1, 3, 0.01))
        .withValue(3)
    );
