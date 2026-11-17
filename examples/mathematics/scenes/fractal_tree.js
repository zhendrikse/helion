import {
    AxialSymmetricBody, Button, Colour, Cylinder, HueColorMapper, LineSegment,
    LineSegmentsView, ModelObjectsCollection, RadialSymmetricBody, Segments,
    Simulation, Sphere, Vec3, ViewsCollection
} from '../../../src/index.js';

const radians = degrees => degrees * Math.PI / 180;

const branches = new ModelObjectsCollection();
const buds = new ModelObjectsCollection();
const pythagorasSegments = new Segments();

function addNatureBranch(position, direction, length) {
    if (length <= 5)
        return;

    if (length < 20) {
        buds.add(new RadialSymmetricBody({
            position: position.clone(),
            radius: 1.5 * length
        }));
    } else {
        branches.add(new AxialSymmetricBody({
            position: position.clone(),
            axis: direction.clone().multiplyScalar(length),
            radius: 0.1 * length
        }));
    }

    const end = position.clone().add(direction.clone().multiplyScalar(length));
    const theta = radians(30);
    const left = direction.clone();
    left.rotateEuler(new Vec3(0, 0, 1), theta);
    const right = direction.clone();
    right.rotateEuler(new Vec3(0, 0, 1), -theta);

    addNatureBranch(end, left, length - 14.5);
    addNatureBranch(end, right, length - 14.5);
}

function addPythagorasBranch(x, y, angle, depth) {
    if (depth <= 0)
        return;

    const nextX = x + Math.trunc(Math.cos(radians(angle)) * depth * 8);
    const nextY = y + Math.trunc(Math.sin(radians(angle)) * depth * 8);

    pythagorasSegments.add(new LineSegment(
        new Vec3(x - 256, 410 - y, 0),
        new Vec3(nextX - 256, 410 - nextY, 0),
        depth / 12
    ));

    addPythagorasBranch(nextX, nextY, angle - 17, depth - 1);
    addPythagorasBranch(nextX, nextY, angle + 17, depth - 1);
}

// The trunk and the recursive branches are all ordinary Helion bodies.
branches.add(new AxialSymmetricBody({
    position: new Vec3(0, -300, 0),
    axis: new Vec3(0, 175, 0),
    radius: 12.5
}));
addNatureBranch(new Vec3(0, -125, 0), new Vec3(0, 1, 0), 125);
addPythagorasBranch(256, 360, -90, 12);

const branchViews = ViewsCollection.of(Cylinder).with({
    color: new Colour(0x79502d)
});
const budViews = ViewsCollection.of(Sphere).with({
    color: new Colour(0x08752b)
});
const pythagorasView = new LineSegmentsView({
    colorMapper: new HueColorMapper()
});
pythagorasView.visible = false;

function showTree(mode) {
    const natureVisible = mode === 'nature';
    branchViews.visible = natureVisible;
    budViews.visible = natureVisible;
    pythagorasView.visible = !natureVisible;
}

Simulation
    .with({
        htmlDivId: 'fractalTreeContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: {
            controls: false,
            orthographic: true,
            position: new Vec3(0, 50, 900),
            target: new Vec3(0, 50, 0)
        },
        lighting: { enabled: true },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: '<strong>🌳 Fractal tree</strong><br/>' +
                'Explore two recursive trees: a nature-like branching tree and a Pythagoras-style line tree.'
        }
    })
    .bind(branches.alwaysWith(branchViews))
    .bind(buds.alwaysWith(budViews))
    .bind(pythagorasSegments.alwaysWith(pythagorasView))
    .append(new Button('Nature tree').withText('Nature tree 🌳').onClick(() => showTree('nature')))
    .append(new Button('Pythagoras tree').withText('Pythagoras tree').onClick(() => showTree('pythagoras')));

