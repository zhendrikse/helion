import {
    Segments, LineSegmentsView, RadioGroup, Simulation, LineSegment, HueColorMapper, Vec3, Checkbox
} from '../../../../src/index.js';

const LEVEL = 5;

function colour(vertex) {
    let hue = 0.25 * (1 + vertex.y);
    hue = ((hue % 1) + 1) % 1;
    return hue;
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
    fractal.add(new LineSegment(vertices[0], vertices[1], color));
    fractal.add(new LineSegment(vertices[0], vertices[2], color));
    fractal.add(new LineSegment(vertices[0], vertices[3], color));
    fractal.add(new LineSegment(vertices[1], vertices[2], color));
    fractal.add(new LineSegment(vertices[2], vertices[3], color));
    fractal.add(new LineSegment(vertices[3], vertices[1], color));
}

function pyramid(vertices) {
    const color = colour(vertices[0]);

    // Top
    fractal.add(new LineSegment(vertices[0], vertices[4], color));
    fractal.add(new LineSegment(vertices[1], vertices[4], color));
    fractal.add(new LineSegment(vertices[2], vertices[4], color));
    fractal.add(new LineSegment(vertices[3], vertices[4], color));

    // Base
    fractal.add(new LineSegment(vertices[0], vertices[1], color));
    fractal.add(new LineSegment(vertices[1], vertices[2], color));
    fractal.add(new LineSegment(vertices[2], vertices[3], color));
    fractal.add(new LineSegment(vertices[3], vertices[0], color));
}

const initialTetrahedron = [
    new Vec3(0, 1, 0),
    new Vec3(-1, -1, -1),
    new Vec3(1, -1, -1),
    new Vec3(0, -1, 1)
];

const initialPyramid = [
    new Vec3(-1, -1, -1),
    new Vec3(1, -1, -1),
    new Vec3(1, -1, 1),
    new Vec3(-1, -1, 1),
    new Vec3(0, 1, 0)
];

/** @type {Segments<LineSegment>} */
const fractal = new Segments();
buildPyramid();

function buildPyramid() {
    fractal.clear();
    sierpinskiPyramid(initialPyramid, LEVEL);
}

function buildTetrahedron() {
    fractal.clear();
    sierpinskiTetrahedron(initialTetrahedron, LEVEL);
}

const fractalView = new LineSegmentsView({
    lineWidth: 1,
    colorMapper: new HueColorMapper()
});

let autoRotate = true;
Simulation
    .with({
        htmlDivId: 'sierpinskiContainer',
        headUpDisplay: { enabled: false },
        camera: { fieldOfView: 20 },
        infoPanel: {
            text: '<strong>🐫 Sierpiński pyramid</strong><br/>' +
                '• Every face is a <a href=\"https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle\">Sierpiński triangle</a><br/>' +
                '• Volume: $$V_n=V_0\\left(\\frac{1}{2}\\right)^n \\to 0,\\ n\\to\\infty$$<br/>' +
                '• Area: $$A_n=4^n\\cdot\\frac{A_0}{4^n}=A_0$$<br/>' +
                '• Dimension <a href=\"https://en.wikipedia.org/wiki/Embedding\">embedded space</a> is 3<br/>' +
                '• <a href=\"https://en.wikipedia.org/wiki/Hausdorff_dimension\">Hausdorff dimension</a> is $$\\frac{\\ln(4)}{\\ln(2)}=2\\ \\text{exactly!}$$<br/>' +
                '• <a href=\"https://en.wikipedia.org/wiki/Lebesgue_covering_dimension\">Topological dimension</a> is 1<br/>' +
                '• Its projection can be a completely filled square, try it yourself!'
        }
    })
    .bind(fractal.alwaysWith(fractalView))
    .frameSceneOn(fractalView, {viewDirection: new Vec3(1, 1, .8), padding: .9, translationY: -5})
    .append(new RadioGroup()
        .add('Pyramid', buildPyramid)
        .add('Tetrahedron', buildTetrahedron)
        .checked(0)
    )
    .onStep(() => { if (autoRotate) fractalView.rotation.y += 5e-4; })
    .append(new Checkbox('Auto rotate').checked(true).onChange(checked => autoRotate = checked))
    .start();
