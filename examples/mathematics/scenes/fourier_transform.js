import {
    FunctionGraph, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range,
    Grid, Interval, Label, Arrow2D, ColorMappers, LinearCombination, Vec2
} from "../../../src/index.js";

const xMin = -2 * Math.PI;
const xMax = 2 * Math.PI;
const samples = 300;
const integrationSamples = 2000;
const interval = new Interval(xMin, xMax);
const halfPeriod = interval.range / 2;

/**
 * Numerical integration using the midpoint rule.
 */
function integrate(func, interval, samples = 1000) {
    const dx = interval.range / samples;

    let sum = 0;

    for (let i = 0; i < samples; i++) {
        const x = interval.from + (i + 0.5) * dx;
        sum += func(x);
    }

    return sum * dx;
}

// Implementation of Fourier coefficients:
const frequency = (n) => n * Math.PI / halfPeriod;

const cosineCoefficient = (func, n) => integrate(
    x => func(x) * Math.cos(frequency(n) * x),
    interval,
    integrationSamples
) / halfPeriod;

const sineCoefficient= (func, n) => integrate(
        x => func(x) * Math.sin(frequency(n) * x),
        interval,
        integrationSamples
    ) / halfPeriod;

const constantCoefficient = (func) => integrate(
        func,
        interval,
        integrationSamples
    ) / (2 * halfPeriod);

// Example function: f(x) = 2 cos(x) + 0.7 sin(x) + 3 cos(2x) - 1.2 sin(3x)
// This function was chosen because its Fourier coordinates are easy to recognize
function functionToExpand(x) {
    return 2 * Math.cos(x / 2) + 0.7 * Math.sin(x / 2) + 3 * Math.cos(x) - 1.2 * Math.sin(3 * x / 2);
}

/**
 * Construct the Fourier basis. The first basis vector is the constant function 1:
 *     1,
 *     cos(x/2),sin(x/2),
 *     cos(x),sin(x),
 *     cos(3x/2),sin(3x/2), etc.
 *
 * The corresponding first coefficient is a_0 / 2.
 */
const maximumFrequency = 3;
const basis = [x => 1];
const coefficients = [constantCoefficient(functionToExpand)];
const terms = ["a_0/2"];

for (let n = 1; n <= maximumFrequency; n++) {
    basis.push(x => Math.cos(frequency(n) * x), x => Math.sin(frequency(n) * x));
    coefficients.push(cosineCoefficient(functionToExpand, n), sineCoefficient(functionToExpand, n));
    terms.push(`a_${n}`, `b_${n}`);
}

const fourierExpansion = new LinearCombination({basis, coefficients});

/**
 * Number of terms in the linear combination for a given frequency.
 *
 * Frequency 0: a_0 / 2
 * Frequency 1: a_0 / 2 + a_1 cos(x) + b_1 sin(x)
 * Frequency 2: a_0 / 2 + ... + a_2 cos(2x) + b_2 sin(2x)
 * etc.
 */
function numberOfTermsForFrequency(frequency) {
    return 1 + 2 * frequency;
}

function fourierLatex(frequency) {
    if (frequency === 0)
        return "f(x) \\approx \\dfrac{a_0}{2}";

    return `f(x) \\approx \\dfrac{a_0}{2}`
        + ` + \\sum_{n=1}^{${frequency}}`
        + `\\left(a_n\\cos(nx)+b_n\\sin(nx)\\right)`;
}

const simulation = Simulation
    .with({
        htmlDivId: "fourierTransformContainer",
        camera: {
            position: new Vec3(0, 0, 17.5),
            controls: false
        },
        headUpDisplay: {
            enabled: false
        },
        parameterMenuCollapsed: false
    });

const size = .5 * interval.range;
const grid = new Grid({size, stepSize: Math.PI / 3});
const xAxis = new LineSegment(new Vec2(-2.05 * size, 0), new Vec2(0.25, 0));
const yAxis = new LineSegment(new Vec2(0, -2.05 * size), new Vec2(0, 0.25));

const exactGraph = new FunctionGraph({
    func: functionToExpand,
    interval,
    samples
});

const approximationGraph = new FunctionGraph({
    func: x => fourierExpansion.evaluate(x, numberOfTermsForFrequency(0)),
    interval,
    samples
});

simulation
    .setLatexTitle(fourierLatex(0))
    .bind(grid.onceWith(new LineSegmentsView({
        lineWidth: 1,
        dashed: true,
        dashSize: .05,
        gapSize: .1,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0xffaa55 })
    })))
    .bind(xAxis.onceWith(new Arrow2D({
        size: .25,
        color: 0xbbbbbb,
        headStyle: Arrow2D.HeadStyle.Filled
    })))
    .bind(yAxis.onceWith(new Arrow2D({
        size: .25,
        color: 0xbbbbbb,
        headStyle: Arrow2D.HeadStyle.Filled
    })))
    .bind(xAxis.onceWith(new Label({
        text: () => "X",
        fontSize: "20px",
        color: "#ffffff",
        offset: () => new Vec2(2.2 * size, 0)
    })))
    .bind(yAxis.onceWith(new Label({
        text: () => "Y",
        fontSize: "20px",
        color: "#ffffff",
        offset: () => new Vec2(0, 2.2 * size)
    })))
    .bind(exactGraph.onceWith(new LineSegmentsView({
        lineWidth: 3,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0x00ff00 })
    })))
    .bind(approximationGraph.onceWith(new LineSegmentsView({
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, { color: 0xff0000 })
    })))
    .append(new Slider("Maximum frequency")
        .withRange(new Range(0, maximumFrequency, 1))
        .withValue(0)
        .onInput(event => {
            const frequency = Number(event.target.value);
            const terms = numberOfTermsForFrequency(frequency);
            approximationGraph.setFunction(x => fourierExpansion.evaluate(x, terms));
            simulation.setLatexTitle(fourierLatex(frequency));
        })
    );