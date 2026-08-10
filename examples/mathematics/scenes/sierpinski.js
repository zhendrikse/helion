import {Line2} from 'three/addons/lines/Line2.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {Color, Group, Vector2, Vector3} from "three";
import {Simulation, Vec3} from "../../../src/index.js";
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';

const LEVEL = 5;
let lineWidth = 1.0;
let edges = [];
let lineObject = null;

function colour(vertex) {
    let hue = 0.25 * (1 + vertex.y);
    hue = ((hue % 1) + 1) % 1;

    const color = new Color();
    color.setHSL(hue, 1.0, 0.5);
    return color;
}

function addEdge(a, b, color) {
    edges.push({ a: a.clone(), b: b.clone(), color: color.clone() });
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
    addEdge(vertices[0], vertices[1], color);
    addEdge(vertices[0], vertices[2], color);
    addEdge(vertices[0], vertices[3], color);
    addEdge(vertices[1], vertices[2], color);
    addEdge(vertices[2], vertices[3], color);
    addEdge(vertices[3], vertices[1], color);
}

function pyramid(vertices) {
    const color = colour(vertices[0]);

    // Top
    addEdge(vertices[0], vertices[4], color);
    addEdge(vertices[1], vertices[4], color);
    addEdge(vertices[2], vertices[4], color);
    addEdge(vertices[3], vertices[4], color);

    // Base
    addEdge(vertices[0], vertices[1], color);
    addEdge(vertices[1], vertices[2], color);
    addEdge(vertices[2], vertices[3], color);
    addEdge(vertices[3], vertices[0], color);
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

const pyramidLines = new Group();
function createLineObject() {
    const positions = [];
    const colors = [];

    for (const edge of edges) {
        positions.push(edge.a.x, edge.a.y, edge.a.z);
        colors.push(edge.color.r, edge.color.g, edge.color.b);
        positions.push(edge.b.x, edge.b.y, edge.b.z);
        colors.push(edge.color.r, edge.color.g, edge.color.b);
    }

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);
    geometry.setColors(colors);
    const material = new LineMaterial({
        color: 0xffffff,
        linewidth: lineWidth,
        vertexColors: true,
        resolution: new Vector2(window.innerWidth, window.innerHeight)
    });

    lineObject = new LineSegments2(geometry, material);
    pyramidLines.add(lineObject);
}

sierpinskiPyramid(initialPyramid, LEVEL);
createLineObject();

Simulation
    .with({
        htmlDivId: "sierpinskiContainer",
        cameraPosition: new Vec3(3.0, 2.4, 3.2).multiplyScalar(0.8)
    })
    .addObject3D(pyramidLines);