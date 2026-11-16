import {
    Block, Box, Button, Colour, RadialSymmetricBody, Range, Simulation, Slider,
    Sphere, UPlotGraph, Vec3
} from '../../../src/index.js';

const m = 1;
const M = 10;
const g = 98;
const dt = 0.01;

const pivot = new Vec3(-110, 0, 0);
const initialBlockPosition = new Vec3(-100, 50.5, 0);
const blockSize = new Vec3(20, 100, 50);
const blockInertia = M * (20 ** 2 + 100 ** 2) / 12 + M * (10 ** 2 + 50 ** 2);

let restitution = 1;
let launchAngle = 45;
let launchSpeed = 100;
let time = 0;
let angularVelocity = 0;
let blockAngle = 0;
let graphStep = 0;
let blockHasBeenHit = false;
let blockAtRest = false;

/** @type {{ body: RadialSymmetricBody, view: Sphere, active: boolean }[]} */
const balls = [];

const floor = new Block({
    position: new Vec3(0, 0, 0),
    size: new Vec3(1000, 1, 1000),
    fixed: true
});
const building1 = new Block({
    position: new Vec3(100, 50, 0),
    size: new Vec3(10, 100, 10),
    fixed: true
});
const building2 = new Block({
    position: initialBlockPosition.clone(),
    size: blockSize.clone(),
    mass: M
});

const angularVelocityGraph = new UPlotGraph({
    dataDefinition: [
        { label: 'Time' },
        { label: 'Angular velocity', color: new Colour(0xffff00) }
    ],
    title: 'Angular velocity of the block',
    xLabel: 'Time (s)',
    yLabel: 'Angular velocity (rad/s)',
    labelColor: Colour.White
});

function launchBall() {
    const radians = launchAngle * Math.PI / 180;
    const ball = new RadialSymmetricBody({
        position: new Vec3(100, 105, 0),
        velocity: new Vec3(-launchSpeed * Math.cos(radians), launchSpeed * Math.sin(radians), 0),
        acceleration: new Vec3(0, -g, 0),
        mass: m,
        radius: 5
    });
    ball.acceleration.set(0, -g, 0);
    const view = new Sphere({
        color: new Colour(Math.floor(Math.random() * 0xffffff)),
        segments: 24
    });

    balls.push({ body: ball, view, active: true });
    simulation.bind(ball.alwaysWith(view));
}

function collide(v1, v2) {
    const v1f = (m * v1 + M * v2 + restitution * M * (v2 - v1)) / (m + M);
    const v2f = (m * v1 + M * v2 + restitution * m * (v1 - v2)) / (m + M);
    return [v1f, v2f];
}

// Rotate the block's centre around its fixed lower-left pivot. Box reads
// building2.orientation, so the model and its view remain in sync.
function rotateBlock(deltaAngle) {
    const offsetX = building2.position.x - pivot.x;
    const offsetY = building2.position.y - pivot.y;
    const c = Math.cos(deltaAngle);
    const s = Math.sin(deltaAngle);

    building2.position.set(
        pivot.x + offsetX * c - offsetY * s,
        pivot.y + offsetX * s + offsetY * c,
        building2.position.z
    );
    blockAngle += deltaAngle;
    building2.orientation.z = blockAngle;
}

function updateBall(ball) {
    const body = ball.body;
    const p = body.position;
    const v = body.velocity;
    const a = body.acceleration;

    // Ground impact (the ball is still to the right of the block).
    if (p.y <= 5.5 && p.x >= -85) {
        v.y *= -restitution;
        v.add(a.clone().multiplyScalar(dt));
        p.add(v.clone().multiplyScalar(dt));

        if (v.y <= 0.1) {
            p.y = 5.5;
            v.y = 0;
        }
        return;
    }

    // The ball hits the upright block on its right-hand face.
    if (p.x <= -85 && v.x <= 0 && p.y <= 100 && p.x >= -115 && Math.abs(blockAngle) < 1e-8) {
        const [ballVelocity, blockVelocity] = collide(v.x, 0);
        v.x = ballVelocity;
        v.add(a.clone().multiplyScalar(dt));
        p.add(v.clone().multiplyScalar(dt));

        const leverArm = Math.max(p.y - 0.5, 1);
        angularVelocity = blockVelocity / leverArm;
        blockHasBeenHit = true;
        rotateBlock(-angularVelocity * dt);
        return;
    }

    // Free flight, with gravity-driven rotation of the block.
    v.add(a.clone().multiplyScalar(dt));
    p.add(v.clone().multiplyScalar(dt));

    if (blockHasBeenHit && !blockAtRest) {
        const centreDistance = Math.abs(building2.position.x - pivot.x);
        const angularAcceleration = (building2.position.x >= pivot.x ? 1 : -1) *
            M * g * centreDistance / blockInertia;
        angularVelocity += angularAcceleration * dt;

        rotateBlock(-angularVelocity * dt);

        // Stop when the block reaches the floor, as in the VPython example.
        if (building2.position.y <= 10.5) {
            angularVelocity = 0;
            blockAtRest = true;
        }
    }
}

function update() {
    time += dt;
    let hasMovingBall = false;

    for (const ball of balls) {
        if (!ball.active)
            continue;

        updateBall(ball);
        if (ball.body.position.x < -250 || ball.body.position.y < -250)
            ball.active = false;
        else
            hasMovingBall = true;
    }

    if (hasMovingBall && ++graphStep % 4 === 0) {
        angularVelocityGraph.graphData[0].push(time);
        angularVelocityGraph.graphData[1].push(angularVelocity);
        angularVelocityGraph.update();
    }
}

function restart() {
    for (const ball of balls) {
        ball.active = false;
        ball.view.visible = false;
    }

    balls.length = 0;
    building2.reset();
    building2.position.copy(initialBlockPosition);
    building2.orientation.set(0, 0, 0);
    blockAngle = 0;
    angularVelocity = 0;
    time = 0;
    graphStep = 0;
    blockHasBeenHit = false;
    blockAtRest = false;
    angularVelocityGraph.reset();
    launchBall();
}

const simulation = Simulation
    .with({
        htmlDivId: 'projectileBlockCollisionContainer',
        viewport: { aspectRatio: '16 / 9' },
        camera: {
            position: new Vec3(0, 60, 200),
            fieldOfView: 45,
            controls: false
        },
        infoPanel: {
            text: '<strong>Projectile and a tipping block</strong><br/>' +
                'A projectile strikes a block that can rotate about its lower corner. ' +
                'Explore how launch speed, angle and restitution affect the motion.'
        }
    })
    .bind(floor.onceWith(new Box({ color: new Colour(0x2255cc) })))
    .bind(building1.onceWith(new Box({ color: new Colour(0x22cccc) })))
    .bind(building2.alwaysWith(new Box({ color: new Colour(0xffa500) })))
    .runsEvery(dt)
    .onStep(update)
    .append(new Slider('Restitution')
        .withRange(new Range(0, 1, 0.01))
        .withValue(restitution)
        .onInput(value => restitution = value))
    .append(new Slider('Launch angle')
        .withUnits('°')
        .withRange(new Range(5, 85, 1))
        .withValue(launchAngle)
        .onInput(value => launchAngle = value))
    .append(new Slider('Initial speed')
        .withUnits(' m/s')
        .withRange(new Range(20, 150, 1))
        .withValue(launchSpeed)
        .onInput(value => launchSpeed = value))
    .append(new Button('Shoot').withText('Shoot').onClick(launchBall))
    .append(new Button('Restart').withText('Restart').onClick(restart))
    .addGraph(angularVelocityGraph)
    .start();

launchBall();
