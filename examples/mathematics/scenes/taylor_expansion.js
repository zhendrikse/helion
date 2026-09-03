import { MeshBasicMaterial, Color } from "three";
import {
    LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range, Grid, Interval, Label,
    Arrow2D, ColorMappers, RealFunction, CurveView, LinearCombination, Vec2
} from "../../../src/index.js";

const xMin = -4;
const xMax = 4;
const samples = 200;

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
        headUpDisplay: {
            enabled: false
        },
        camera: {
            position: new Vec3(0, 0, 10),
            parameterMenuCollapsed: false,
            controls: false
        }
    });

const size = .5 * (xMax - xMin);
const grid = new Grid({ size, stepSize: .5 });
const xAxis = new LineSegment(new Vec2(-2 * size, -size), new Vec2(0.25, -size), 0xffffff);
const yAxis = new LineSegment(new Vec2(0, -2 * size), new Vec2(0, 0.25), 0xffffff);

const exactFunction = new RealFunction({
    domain: new Interval(xMin, xMax),
    func: x => Math.exp(x) - size
});

const approximatedFunction = new RealFunction({
    domain: new Interval(xMin, xMax),
    func: x => taylorExpansion.evaluate(x, 1) - size
});

simulation
    .setLatexTitle("e^x = 1 + \\cdots")
    .bind(grid.onceWith(new LineSegmentsView({
        lineWidth: 1,
        dashed: true,
        dashSize: .05,
        gapSize: .1,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0xffaa55})
    })))
    .bind(xAxis.onceWith(new Arrow2D({
        size: .2,
        color: 0xbbbbbb,
        headStyle: Arrow2D.HeadStyle.Filled
    } )))
    .bind(yAxis.onceWith(new Arrow2D({
        size: .2,
        color: 0xbbbbbb,
        headStyle: Arrow2D.HeadStyle.Filled
    } )))
    .bind(xAxis.onceWith(new Label({
        text: () => "X",
        fontSize: "20px",
        color: "#0xbbbbbb",
        offset: () => new Vec2(2.1 * size, 0)
    })))
    .bind(yAxis.onceWith(new Label({
        text: () => "Y",
        fontSize: "20px",
        color: "#0xbbbbbb",
        offset: () => new Vec2(0.1, 2.1 * size)
    })))
    .bind(exactFunction.onceWith(new CurveView({
        resolution: samples,
        lineWidth: 3,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0x00ff00})
    })))
    .bind(approximatedFunction.onceWith(new CurveView({
        resolution: samples,
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0xff0000})
    })))
    .append(new Slider("Terms")
        .withRange(new Range(1, 10, 1))
        .withValue(1)
        .onInput(event => {
            const terms = Number(event.target.value);
            approximatedFunction.setFunction(x => taylorExpansion.evaluate(x, terms) - size);
            simulation.setLatexTitle("e^x = " + taylorLatex(terms));
        })
    );
