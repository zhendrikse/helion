import {
    AxialSymmetricBody, Block, Box, Button, Colour, Helix, RadialSymmetricBody,
    Range, Simulation, Slider, Sphere, Vec3
} from '../../../src/index.js';

const length = 3;
const supportY = 3;
const spacing = 2;
const mass = 0.75;
const gravity = 9.81;
const springConstant = 1;
const G = gravity / length;
const K = springConstant / mass;
const dt = 0.005;

const support = new Block({
    position: new Vec3(0, supportY, 0),
    size: new Vec3(6.3, 0.3, 1),
    fixed: true
});

const anchors = [
    new Vec3(-spacing, supportY, 0),
    new Vec3(0, supportY, 0),
    new Vec3(spacing, supportY, 0)
];

let initialAngles = [0.3, 0.0, 0.1];
let angles = initialAngles.slice();
let velocities = [0, 0, 0];
let paused = true;
let elapsedTime = 0;

const pendulums = anchors.map((anchor, index) => ({
    bob: new RadialSymmetricBody({
        position: new Vec3(
            anchor.x + length * Math.sin(angles[index]),
            supportY - length * Math.cos(angles[index]),
            0
        ),
        radius: 0.2,
        mass
    }),
    string: new AxialSymmetricBody({
        position: anchor.clone(),
        axis: new Vec3(
            length * Math.sin(angles[index]),
            -length * Math.cos(angles[index]),
            0
        ),
        radius: 0.015
    })
}));

const springs = [
    pendulums[0].bob.and(pendulums[1].bob),
    pendulums[1].bob.and(pendulums[2].bob)
];

const initialAngleSliders = [];

function setInitialAngle(index, value) {
    initialAngles[index] = value;
    initialAngleSliders[index].withValue(value);
}

function increaseAngle(index) {
    setInitialAngle(index, Math.round(initialAngles[index] * 10 + 1) / 10);
}

function decreaseAngle(index) {
    setInitialAngle(index, Math.round(initialAngles[index] * 10 - 1) / 10);
}

function chooseMode(values) {
    values.forEach((value, index) => setInitialAngle(index, value));
    reset();
}

function updateGeometry() {
    pendulums.forEach(({ bob, string }, index) => {
        const anchor = anchors[index];
        const angle = angles[index];

        bob.position.set(
            anchor.x + length * Math.sin(angle),
            supportY - length * Math.cos(angle),
            0
        );

        string.axis.set(
            length * Math.sin(angle),
            -length * Math.cos(angle),
            0
        );
    });
}

function reset() {
    paused = true;
    angles = initialAngles.slice();
    velocities = [0, 0, 0];
    elapsedTime = 0;
    updateGeometry();
    startButton.withText('Start');
}

function startOrPause() {
    paused = !paused;
    startButton.withText(paused ? 'Start' : 'Pause');
}

function update() {
    if (paused)
        return;

    // Coupled small-angle pendulum equations, integrated as in the VPython source.
    const a1 = (-G - K) * angles[0] + K * angles[1];
    const a2 = K * angles[0] - (G + 2 * K) * angles[1] + K * angles[2];
    const a3 = K * angles[1] - (G + K) * angles[2];

    velocities[0] += dt * a1;
    velocities[1] += dt * a2;
    velocities[2] += dt * a3;

    angles[0] += velocities[0] * dt;
    angles[1] += velocities[1] * dt;
    angles[2] += velocities[2] * dt;

    elapsedTime += dt;
    updateGeometry();
}

const simulation = Simulation
    .with({
        htmlDivId: 'threePendulumsTwoSpringsContainer',
        viewport: { aspectRatio: '16 / 9' },
        camera: {
            position: new Vec3(0, 3.5, 10),
            fieldOfView: 40,
            controls: false
        },
        infoPanel: {
            text: '<strong>Three pendulums and two springs</strong><br/>' +
                'Three identical pendulums are coupled by two springs. ' +
                'Choose an initial configuration and observe the coupled motion.'
        }
    })
    .bind(support.onceWith(new Box({ color: new Colour(0x2255cc) })))
    .bind(pendulums[0].string.alwaysWith(new (awaitImportCylinder())({ color: new Colour(0xff8000), radiusFunction: body => 0.015 })))
    .bind(pendulums[1].string.alwaysWith(new (awaitImportCylinder())({ color: new Colour(0xff8000), radiusFunction: body => 0.015 })))
    .bind(pendulums[2].string.alwaysWith(new (awaitImportCylinder())({ color: new Colour(0xff8000), radiusFunction: body => 0.015 })))
    .bind(pendulums[0].bob.alwaysWith(new Sphere({ color: new Colour(0x33bb55) })))
    .bind(pendulums[1].bob.alwaysWith(new Sphere({ color: new Colour(0x33bb55) })))
    .bind(pendulums[2].bob.alwaysWith(new Sphere({ color: new Colour(0x33bb55) })))
    .bind(springs[0].alwaysWith(new Helix({
        color: new Colour(0xff8000),
        coils: 10,
        thickness: 0.15,
        radiusFunction: () => 0.1
    })))
    .bind(springs[1].alwaysWith(new Helix({
        color: new Colour(0xff8000),
        coils: 10,
        thickness: 0.15,
        radiusFunction: () => 0.1
    })))
    .runsEvery(1 / 300)
    .onStep(update)
    .append(new Button('Start').withText('Start').onClick(startOrPause))
    .append(new Button('Reset').withText('Reset').onClick(reset))
    .append(new Button('Mode 1').withText('Mode 1').onClick(() => chooseMode([0.2, 0.2, 0.2])))
    .append(new Button('Mode 2').withText('Mode 2').onClick(() => chooseMode([-0.2, 0, 0.2])))
    .append(new Button('Mode 3').withText('Mode 3').onClick(() => chooseMode([0.1, -0.2, 0.1])))
    .append(new Button('Mixed').withText('Mixed').onClick(() => chooseMode([-0.3, 0, 0])))
    .start();

for (let i = 0; i < 3; i++) {
    const index = i;
    const slider = new Slider(`Mass ${i + 1} initial angle`)
        .withUnits(' rad')
        .withRange(new Range(-0.4, 0.4, 0.01))
        .withValue(initialAngles[i])
        .onInput(value => setInitialAngle(index, value));

    initialAngleSliders.push(slider);
    simulation.append(slider);
}

function awaitImportCylinder() {
    return Cylinder;
}

updateGeometry();
