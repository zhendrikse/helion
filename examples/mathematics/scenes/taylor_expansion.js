import { MeshBasicMaterial, Color } from "three";
import {
    LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Grid, Interval, Label,
    Arrow, ColorMappers, FunctionGraph
} from "../../../src/index.js";

const xMin = -4;
const xMax = 4;
const samples = 200;

class LinearCombination {
    constructor({
        basis,
        coefficients,
        terms
    }) {
        this._basis = basis;
        this._coefficients = coefficients;
        this._terms = terms;
    }

    evaluate(x, terms) {
        let sum = 0;
        for (let n = 0; n < terms; n++)
            sum += this._coefficients[n] * this._basis[n](x);

        return sum;
    }

    latex(terms) {
        let result = "";
        for (let n = 0; n < terms; n++)
            result += this._terms[n];

        return result + "+\\cdots";
    }
}

const taylorExpansion = new LinearCombination({
    basis: [
        x => 1,
        x => x,
        x => x * x,
        x => x * x * x,
        x => x * x * x * x,
        x => x * x * x * x * x,
        x => x * x * x * x * x * x,
        x => x * x * x * x * x * x * x,
        x => x * x * x * x * x * x * x * x,
        x => x * x * x * x * x * x * x * x * x
    ],

    coefficients: [
        1,
        1,
        1 / 2,
        1 / 6,
        1 / 24,
        1 / 120,
        1 / 720,
        1 / 5040,
        1 / 40320,
        1 / 362_880
    ]
});

const taylorTerms = [
    "1",
    "+x",
    "+\\dfrac{x^2}{2!}",
    "+\\dfrac{x^3}{3!}",
    "+\\dfrac{x^4}{4!}",
    "+\\dfrac{x^5}{5!}",
    "+\\dfrac{x^6}{6!}",
    "+\\dfrac{x^7}{7!}",
    "+\\dfrac{x^8}{8!}",
    "+\\dfrac{x^9}{9!}"
];

function taylorLatex(terms) {
    let result = "e^x = ";

    for (let n = 0; n < terms; n++)
        result += taylorTerms[n];

    return result + "+\\cdots";
}

const simulation = Simulation
    .with({
        htmlDivId: "taylorSeriesContainer",
        cameraPosition: new Vec3(0, 0, 10),
        parameterMenuCollapsed: false,
        controls: false
    });

function exp(x) {
    return Math.exp(x);
}

const size = .5 * (xMax - xMin);
const grid = new Grid({ size, stepSize: .5 });
const xAxis = new LineSegment(new Vec3(-2 * size, -size, 0), new Vec3(0.25, -size, 0), 0xffffff);
const yAxis = new LineSegment(new Vec3(0, -2 * size, 0), new Vec3(0, 0.25, 0), 0xffffff);

const exactGraph = new FunctionGraph({
    func: exp,
    interval: new Interval(xMin, xMax),
    samples,
    yOffset: -size
});

const approximationGraph = new FunctionGraph({
    func: x => taylorExpansion.evaluate(x, 1),
    interval: new Interval(xMin, xMax),
    samples,
    yOffset: -size
});

simulation
    .setLatexTitle("e^x = 1 + \\cdots")
    .bind(grid.onceWith(new LineSegmentsView({
        lineWidth: 2,
        dashed: true,
        dashSize: .05,
        gapSize: .1,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0xffaa55})
    })))
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
    .bind(exactGraph.onceWith(new LineSegmentsView({
        lineWidth: 3,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0x00ff00})
    })))
    .bind(approximationGraph.onceWith(new LineSegmentsView({
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0xff0000})
    })))
    .append(new Slider("Terms")
        .withRange(new Range(1, 10, 1))
        .withValue(1)
        .onInput(event => {
            const terms = Number(event.target.value);
            approximationGraph.setFunction(x => taylorExpansion.evaluate(x, terms));
            simulation.setLatexTitle("e^x = " + taylorLatex(terms));
        })
    );