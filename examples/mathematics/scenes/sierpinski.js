import {Color, Vector3} from "three";
import {
    LineSegments, LineSegmentsView, RadioGroup, Simulation, Vec3
} from "../../../src/index.js";

const LEVEL = 5;

function colour(vertex) {
    let hue = 0.25 * (1 + vertex.y);
    hue = ((hue % 1) + 1) % 1;

    const color = new Color();
    color.setHSL(hue, 1.0, 0.5);
    return color;
}

function sierpinskiPyramid(vertices, level) {
    if (level === 0) {
        pyramid(vertices);
        return;
    }

    const midpoints = [
        vertices[0].clone().add(vertices[4]).multiplyScalar(0.5),
        vertices[1].clone().add(vertices[4]).multiplyScalar(0.5),
        vertices[2].clone().add(vertices[4]).multiplyScalar(0.5),
        vertices[3].clone().add(vertices[4]).multiplyScalar(0.5),
        vertices[0].clone().add(vertices[1]).multiplyScalar(0.5),
        vertices[1].clone().add(vertices[2]).multiplyScalar(0.5),
        vertices[2].clone().add(vertices[3]).multiplyScalar(0.5),
        vertices[3].clone().add(vertices[0]).multiplyScalar(0.5),
        vertices[2].clone().add(vertices[0]).multiplyScalar(0.5)
    ];

    sierpinskiPyramid([vertices[0], midpoints[4], midpoints[8], midpoints[7], midpoints[0]], level - 1); // Corner one
    sierpinskiPyramid([midpoints[4], vertices[1], midpoints[5], midpoints[8], midpoints[1]], level - 1); // Corner two
    sierpinskiPyramid([midpoints[8], midpoints[5], vertices[2], midpoints[6], midpoints[2]], level - 1); // Corner three
    sierpinskiPyramid([midpoints[7], midpoints[8], midpoints[6], vertices[3], midpoints[3]], level - 1); // Corner four
    sierpinskiPyramid([midpoints[0], midpoints[1], midpoints[2], midpoints[3], vertices[4]], level - 1); // Central pyramid
}

function sierpinskiTetrahedron(vertices, level) {
    if (level === 0) {
        tetrahedron(vertices);
        return;
    }

    const midpoints = [
        vertices[0].clone().add(vertices[1]).multiplyScalar(0.5),
        vertices[1].clone().add(vertices[2]).multiplyScalar(0.5),
        vertices[2].clone().add(vertices[0]).multiplyScalar(0.5),
        vertices[0].clone().add(vertices[3]).multiplyScalar(0.5),
        vertices[1].clone().add(vertices[3]).multiplyScalar(0.5),
        vertices[2].clone().add(vertices[3]).multiplyScalar(0.5)
    ];

    sierpinskiTetrahedron([vertices[0], midpoints[0], midpoints[2], midpoints[3]], level - 1);
    sierpinskiTetrahedron([midpoints[0], vertices[1], midpoints[1], midpoints[4]], level - 1);
    sierpinskiTetrahedron([midpoints[2], midpoints[1], vertices[2], midpoints[5]], level - 1);
    sierpinskiTetrahedron([midpoints[3], midpoints[4], midpoints[5], vertices[3]], level - 1);
}

function tetrahedron(vertices) {
    const color = colour(vertices[0]);
    fractal.add(vertices[0], vertices[1], color);
    fractal.add(vertices[0], vertices[2], color);
    fractal.add(vertices[0], vertices[3], color);
    fractal.add(vertices[1], vertices[2], color);
    fractal.add(vertices[2], vertices[3], color);
    fractal.add(vertices[3], vertices[1], color);
}

function pyramid(vertices) {
    const color = colour(vertices[0]);

    // Top
    fractal.add(vertices[0], vertices[4], color);
    fractal.add(vertices[1], vertices[4], color);
    fractal.add(vertices[2], vertices[4], color);
    fractal.add(vertices[3], vertices[4], color);

    // Base
    fractal.add(vertices[0], vertices[1], color);
    fractal.add(vertices[1], vertices[2], color);
    fractal.add(vertices[2], vertices[3], color);
    fractal.add(vertices[3], vertices[0], color);
}

const initialTetrahedron = [
    new Vector3(0, 1, 0),
    new Vector3(-1, -1, -1),
    new Vector3(1, -1, -1),
    new Vector3(0, -1, 1)
];

const initialPyramid = [
    new Vector3(-1, -1, -1),
    new Vector3(1, -1, -1),
    new Vector3(1, -1, 1),
    new Vector3(-1, -1, 1),
    new Vector3(0, 1, 0)
];

const fractal = new LineSegments();
buildPyramid();

function buildPyramid() {
    fractal.clear();
    sierpinskiPyramid(initialPyramid, LEVEL);
}

function buildTetrahedron() {
    fractal.clear();
    sierpinskiTetrahedron(initialTetrahedron, LEVEL);
}

const fractalView = new LineSegmentsView({ lineWidth: 2 });

Simulation
    .with({
        htmlDivId: "sierpinskiContainer",
        parameterMenuCollapsed: false,
        fieldOfView: 30
    })
    .bind(fractal.alwaysWith(fractalView))
    .frameSceneOn(fractalView, {padding: 1, translationY: -1})
    .append(new RadioGroup()
        .add("Pyramid", buildPyramid)
        .add("Tetrahedron", buildTetrahedron)
        .checked(0)
    );
