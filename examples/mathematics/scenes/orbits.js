import {
    ParametricCurve, CurveView, LineSegment, LineSegmentsView, Simulation, Vec3, Slider, Range,
    Grid, Interval, Label, Arrow2D, ColorMappers, RotationMatrix2D, VectorModel, Vec2
} from "../../../src/index.js";

const size = 4;
const samples = 200;
const angleInterval = new Interval(0, 2 * Math.PI);

const point = new VectorModel(new Vec2(), new Vec2(2, 1));
const transformedPoint = new VectorModel(new Vec2(), new Vec2());
const rotation = RotationMatrix2D.Identity;
let rotationAngle = 0;

const orbit = new ParametricCurve({
    domain: angleInterval,
    func: angle => new Vec2(
        point.axis.length() * Math.cos(angle),
        point.axis.length() * Math.sin(angle)
    )
});

const simulation = Simulation
    .with({
        htmlDivId: "orbitsContainer",
        camera: {
            position: new Vec3(0, 0, 2.5 * size),
            orthographic: true
        },
        headUpDisplay: {
            enabled: false
        },
        infoPanel: {
            text: "<strong>💫 Group orbits</strong><br/>$G = SO(2),\\ X=\\mathbb{R}^2$<br/>" +
                "<ul><li>Choose point $x\\in X$</li>" +
                "<li>Modify rotation matrix $g_\\theta\\in G$</li>" +
                "<li>Action $g_\\theta\\cdot x$</li>" +
                "<li>Orbit $G\\cdot x$ is a circle: $r = ∥x∥$</li></ul>"
        },
        parameterMenuCollapsed: false
    });

const grid = new Grid({size, stepSize: 1});
const xAxis = new LineSegment(new Vec2(-size *.55, 0), new Vec2(size * .55, 0));
const yAxis = new LineSegment(new Vec2(0, -size * .55), new Vec2(0, size * .55));

function updateRotation(angle) {
    rotationAngle = angle;
    rotation.angle = angle;

    transformedPoint.axis.copy(point.axis);
    rotation.applyTo(transformedPoint.axis);

    simulation.setLatexTitle(
        "g_\\theta = \\begin{pmatrix}" +
        rotation.a.toFixed(2) + " & " + rotation.b.toFixed(2) + " \\\\" +
        rotation.c.toFixed(2) + " & " + rotation.d.toFixed(2) +
        "\\end{pmatrix},\\quad g_\\theta \\cdot x = " +
        "\\begin{pmatrix}" + transformedPoint.axis.x.toFixed(2) + "\\\\" +
        transformedPoint.axis.y.toFixed(2) + "\\end{pmatrix}"
    );
}

const labelPoint = new Label({
    text: () => "x",
    offset: model => model.axis.clone().multiplyScalar(1.15),
    fontSize: "22px",
    color: "#ff991c"
});

const labelTransformedPoint = new Label({
    text: () => "gₜₕₑₜₐ · x",
    offset: model => model.axis.clone().multiplyScalar(1.15),
    fontSize: "20px",
    color: "#44aaff"
});

simulation
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
    })))
    .bind(yAxis.onceWith(new Arrow2D({
        size: .2,
        color: 0xbbbbbb,
        headStyle: Arrow2D.HeadStyle.Filled
    })))
    .bind(xAxis.onceWith(new Label({
        text: () => "X",
        fontSize: "20px",
        color: "#bbbbbb",
        offset: () => new Vec2(1.2 * size, 0)
    })))
    .bind(yAxis.onceWith(new Label({
        text: () => "Y",
        fontSize: "20px",
        color: "#bbbbbb",
        offset: () => new Vec2(0, 1.2 * size)
    })))
    .bind(orbit.alwaysWith(new CurveView({
        resolution: samples,
        lineWidth: 2,
        colorMapper: ColorMappers.get(ColorMappers.Uniform, {color: 0x44dd88})
    })))
    .bind(point.onceWith(new Arrow2D({
        color: 0xff991c,
        size: .35,
        headStyle: Arrow2D.HeadStyle.Filled
    })))
    .bind(transformedPoint.alwaysWith(new Arrow2D({
        color: 0x44aaff,
        size: .3,
        headStyle: Arrow2D.HeadStyle.Filled
    })))
    .bind(point.onceWith(labelPoint))
    .bind(transformedPoint.alwaysWith(labelTransformedPoint))
    .append(new Slider("Rotation")
        .withRange(new Range(0, 2 * Math.PI, 0.01))
        .withValue(0)
        .onInput(event => updateRotation(Number(event.target.value)))
    )
    .append(new Slider("x")
        .withRange(new Range(-size, size, 0.01))
        .withValue(2)
        .onInput(event => {
            point.axis.x = Number(event.target.value);
            updateRotation(rotationAngle);
        })
    )
    .append(new Slider("y")
        .withRange(new Range(-size, size, 0.01))
        .withValue(1)
        .onInput(event => {
            point.axis.y = Number(event.target.value);
            updateRotation(rotationAngle);
        })
    );

updateRotation(rotationAngle);
