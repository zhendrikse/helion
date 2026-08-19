import { MeshBasicMaterial } from "three";
import {
    Segments, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Grid, LineSegmentView, Interval, Label,
    Arrow
} from "../../../src/index.js";


const xMin = -4;
const xMax = 4;
const samples = 200;

/**
 * Create a graph from a function.
 */
class FunctionGraph extends Segments {
    constructor({
        func: fn,
        interval,
        samples = 200,
        color = 0xffffff
    }) {
        super();

        this._function = fn;
        this._interval = interval;
        this._samples = samples;
        this._color = color;

        this.update();
    }

    setFunction(fn) {
        this._function = fn;
        this.update();
    }

    update() {
        this.clear();

        const dx = this._interval.range / this._samples;

        let x1 = this._interval.from;
        let y1 = this._function(x1);

        for (let i = 1; i <= this._samples; i++) {
            const x2 = this._interval.from + i * dx;
            const y2 = this._function(x2);

            this.push(new LineSegment(
                new Vec3(x1, y1 - 0.5 * (xMax - xMin), 0),
                new Vec3(x2, y2- 0.5 * (xMax - xMin), 0),
                this._color
            ));

            x1 = x2;
            y1 = y2;
        }
    }
}


/**
 * e^x
 */
function exp(x) {
    return Math.exp(x);
}


/**
 * Taylor polynomial for e^x:
 *
 * e^x = 1 + x + x²/2! + x³/3! + ...
 */
function taylorExp(x, terms) {
    let sum = 0;
    let term = 1;

    for (let n = 0; n < terms; n++) {
        if (n > 0)
            term *= x / n;

        sum += term;
    }

    return sum;
}

const size = .5 * (xMax - xMin);
const grid = new Grid({ size, stepSize: .5 });
const xAxis = new LineSegment(new Vec3(-2 * size, -size, 0), new Vec3(0.25, -size, 0), 0xffffff);
const yAxis = new LineSegment(new Vec3(0, -2 * size, 0), new Vec3(0, 0.25, 0), 0xffffff);

const exactGraph = new FunctionGraph({
    func: exp,
    interval: new Interval(xMin, xMax),
    samples,
    color: 0x00ff00
});

const approximationGraph = new FunctionGraph({
    func: x => taylorExp(x, 1),
    interval: new Interval(xMin, xMax),
    samples,
    color: 0xff0000
});

Simulation
    .with({
        htmlDivId: "taylorSeriesContainer",
        cameraPosition: new Vec3(0, 0, 10),
        parameterMenuCollapsed: false
    })
    .bind(grid.onceWith(new LineSegmentsView({ lineWidth: 2, dashed: true, dashSize: .05, gapSize: .1 })))
    .bind(xAxis.onceWith(new Arrow({
        size: .075,
        material: new MeshBasicMaterial(),
        color: 0xbbbbbb,
        round: true
    } )))
    .bind(yAxis.onceWith(new Arrow({
        size: .075,
        material: new MeshBasicMaterial(),
        color: 0xbbbbbb,
        round: true
    } )))
    .bind(xAxis.onceWith(new Label({
        text: () => "X",
        fontSize: "20px",
        color: "#ffffff",
        offset: () => new Vec3(2.1 * size, 0, 0)
    })))
    .bind(yAxis.onceWith(new Label({
        text: () => "Y",
        fontSize: "20px",
        offset: () => new Vec3(0, 2.1 * size, 0)
    })))
    .bind(exactGraph.onceWith(new LineSegmentsView({ lineWidth: 3 })))
    .bind(approximationGraph.onceWith(new LineSegmentsView({ lineWidth: 2 })))
    .append(new Slider("Terms")
        .withRange(new Range(1, 10, 1))
        .withValue(1)
        .onInput(event => approximationGraph.setFunction(x => taylorExp(x, Number(event.target.value))))
    );