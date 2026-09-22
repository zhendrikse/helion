import test from 'node:test';
import assert from 'node:assert/strict';

/** !! D O   N O T   S H O R T E N   T H E S E   I M P O R T S  !! */
import { Body } from '../src/model/phys/bodies.js';
import { Vec3, degToRad } from '../src/model/math/math.js';


// H E L P E R  F U N C T I O N S  F O R  R O T A T I O N  T E S T S
function quaternionFromEulerXYZ(x, y, z) {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);

    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    return {
        x: s1 * c2 * c3 + c1 * s2 * s3,
        y: c1 * s2 * c3 - s1 * c2 * s3,
        z: c1 * c2 * s3 + s1 * s2 * c3,
        w: c1 * c2 * c3 - s1 * s2 * s3
    };
}

function multiplyQuaternion(a, b) {
    return {
        x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
        y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
        z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
}
/////////////////////////////////////////////////////////////////////


for (const axis of ['x', 'y', 'z']) {
    test(`Body rotates around world ${axis}`, () => {
        const body = new Body();

        body.rotateWorld(axis, Math.PI / 2);
        body.rotateWorld(axis, Math.PI / 2);
        body.rotateWorld(axis, Math.PI / 2);
        body.rotateWorld(axis, Math.PI / 2);

        assert.ok(Math.abs(body.orientation.x) < 1e-10);
        assert.ok(Math.abs(body.orientation.y) < 1e-10);
        assert.ok(Math.abs(body.orientation.z) < 1e-10);
    });
}
test('rotateWorld does not change position', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3)
    });

    const originalPosition = body.position.clone();
    body.rotateWorld('y', Math.PI / 2);
    assert.deepEqual(body.position, originalPosition);
});

test('rotate changes position', () => {
    const body = new Body({
        position: new Vec3(1, 0, 0)
    });

    body.rotate('y', Math.PI / 2);
    assert.ok(body.position.distanceTo(new Vec3(0, 0, -1)) < 1e-10);
});

test('Body world rotation preserves physical orientation', () => {
    const body = new Body({
        orientation: new Vec3(0, 1, 0)
    });

    body.rotateWorld('y', Math.PI / 2);

    const actual = quaternionFromEulerXYZ(body.orientation.x, body.orientation.y, body.orientation.z);
    const initial = quaternionFromEulerXYZ(0, 1, 0);
    const worldRotation = { x: 0, y: Math.sin(Math.PI / 4), z: 0, w: Math.cos(Math.PI / 4) };
    const expected = multiplyQuaternion(worldRotation, initial);
    const dot = actual.x * expected.x + actual.y * expected.y + actual.z * expected.z + actual.w * expected.w;

    // q and -q represent the same rotation.
    assert.ok(Math.abs(Math.abs(dot) - 1) < 1e-10);
});

test('Body has correct default state', () => {
    const body = new Body();

    assert.deepEqual(body.position, new Vec3(0, 0, 0));
    assert.deepEqual(body.velocity, new Vec3(0, 0, 0));
    assert.deepEqual(body.acceleration, new Vec3(0, 0, 0));

    assert.equal(body.mass, 1);
    assert.equal(body.charge, 0);
    assert.equal(body.fixed, false);
    assert.deepEqual(body.orientation, new Vec3(0, 0, 0));
    assert.deepEqual(body.force, new Vec3(0, 0, 0));
});

test('Body accepts initial state', () => {
    const position = new Vec3(1, 2, 3);
    const velocity = new Vec3(4, 5, 6);
    const orientation = new Vec3(0.1, 0.2, 0.3);

    const body = new Body({
        position,
        velocity,
        mass: 5,
        charge: -2,
        fixed: true,
        orientation
    });

    assert.deepEqual(body.position, position);
    assert.deepEqual(body.velocity, velocity);
    assert.equal(body.mass, 5);
    assert.equal(body.charge, -2);
    assert.equal(body.fixed, true);
    assert.deepEqual(body.orientation, orientation);
});

test('Body reset restores initial state', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3),
        velocity: new Vec3(4, 5, 6),
        orientation: new Vec3(0.1, 0.2, 0.3)
    });

    body.position.set(10, 20, 30);
    body.velocity.set(40, 50, 60);
    body.orientation.set(1, 2, 3);

    body.reset();

    assert.deepEqual(body.position, new Vec3(1, 2, 3));
    assert.deepEqual(body.velocity, new Vec3(4, 5, 6));
    assert.deepEqual(body.orientation, new Vec3(0.1, 0.2, 0.3));
});

test('Body reset restores complete physics state', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3),
        velocity: new Vec3(4, 5, 6),
        mass: 7,
        charge: -3
    });

    body.state.position.set(10, 20, 30);
    body.state.velocity.set(40, 50, 60);
    body.state.acceleration.set(70, 80, 90);

    body.reset();

    assert.deepEqual(body.position, new Vec3(1, 2, 3));
    assert.deepEqual(body.velocity, new Vec3(4, 5, 6));
    assert.equal(body.mass, 7);
    assert.equal(body.charge, -3);

    // Acceleration was zero initially.
    assert.deepEqual(body.acceleration, new Vec3(0, 0, 0));
});

test('Body speed is velocity magnitude', () => {
    const body = new Body({
        velocity: new Vec3(3, 4, 0)
    });

    assert.equal(body.speed, 5);
});

test('Body momentum is mass times velocity', () => {
    const body = new Body({
        velocity: new Vec3(2, -3, 4),
        mass: 5
    });

    assert.deepEqual(body.momentum, new Vec3(10, -15, 20));
});

test('Body momentum does not expose velocity', () => {
    const body = new Body({
        velocity: new Vec3(1, 2, 3),
        mass: 2
    });

    const momentum = body.momentum;
    momentum.set(100, 100, 100);

    assert.deepEqual(body.velocity, new Vec3(1, 2, 3));
});
test('Body kinetic energy', () => {
    const body = new Body({
        velocity: new Vec3(3, 4, 0),
        mass: 2
    });

    assert.equal(body.kineticEnergy, 25);
});
test('Electric field points away from positive charge', () => {
    const body = new Body({
        position: new Vec3(0, 0, 0),
        charge: 2
    });

    const field = body.fieldAt(new Vec3(2, 0, 0));

    assert.ok(field.distanceTo(new Vec3(0.5, 0, 0)) < 1e-10);
});
test('Electric field points toward negative charge', () => {
    const body = new Body({
        position: new Vec3(0, 0, 0),
        charge: -2
    });

    const field = body.fieldAt(new Vec3(2, 0, 0));

    assert.ok(field.distanceTo(new Vec3(-0.5, 0, 0)) < 1e-10);
});

test('Electric field is zero at source position', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3),
        charge: 100
    });

    const field = body.fieldAt(new Vec3(1, 2, 3));

    assert.deepEqual(field, new Vec3(0, 0, 0));
});

test('Uncharged body produces no electric field', () => {
    const body = new Body({
        charge: 0
    });

    const field = body.fieldAt(new Vec3(10, 20, 30));

    assert.deepEqual(field, new Vec3(0, 0, 0));
});

test('Body positionVectorTo points from this body to other body', () => {
    const a = new Body({
        position: new Vec3(1, 2, 3)
    });

    const b = new Body({
        position: new Vec3(5, 7, 11)
    });

    assert.deepEqual(
        a.positionVectorTo(b),
        new Vec3(4, 5, 8)
    );
});

test('Body distance calculations', () => {
    const a = new Body({
        position: new Vec3(1, 2, 3)
    });

    const b = new Body({
        position: new Vec3(4, 6, 3)
    });

    assert.equal(a.distanceToSquared(b), 25);
    assert.equal(a.distanceTo(b), 5);
});

test('positionVectorTo does not mutate either body', () => {
    const a = new Body({
        position: new Vec3(1, 2, 3)
    });

    const b = new Body({
        position: new Vec3(4, 5, 6)
    });

    a.positionVectorTo(b);

    assert.deepEqual(a.position, new Vec3(1, 2, 3));
    assert.deepEqual(b.position, new Vec3(4, 5, 6));
});

test('Body integration calculates acceleration from force', () => {
    const body = new Body({
        mass: 2
    });

    body.force.set(10, 20, 30);

    body.integrate(0);

    assert.deepEqual(body.acceleration, new Vec3(5, 10, 15));
});

test('Body integration clears force', () => {
    const body = new Body();

    body.force.set(10, 20, 30);
    body.integrate(0);

    assert.deepEqual(body.force, new Vec3(0, 0, 0));
});

test('Fixed body does not integrate', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3),
        velocity: new Vec3(4, 5, 6),
        fixed: true
    });

    body.force.set(100, 200, 300);

    body.integrate(1);

    assert.deepEqual(body.position, new Vec3(1, 2, 3));
    assert.deepEqual(body.velocity, new Vec3(4, 5, 6));
});

test('Body can have children', () => {
    const parent = new Body();
    const child = new Body();

    parent.add(child);

    assert.deepEqual([...parent], [child]);
});

test('Body forEach visits all children', () => {
    const parent = new Body();
    const a = new Body();
    const b = new Body();

    parent.add(a);
    parent.add(b);
    const visited = [];

    parent.forEach(child => visited.push(child));

    assert.deepEqual(visited, [a, b]);
});

test('Rotating parent rotates child around parent', () => {
    const parent = new Body({
        position: new Vec3(0, 0, 0)
    });

    const child = new Body({
        position: new Vec3(1, 0, 0)
    });

    child.localPosition.set(1, 0, 0);
    parent.add(child);

    parent.rotate('y', Math.PI / 2);

    assert.ok(child.position.distanceTo(new Vec3(0, 0, -1)) < 1e-10);
    assert.ok(child.localPosition.distanceTo(new Vec3(0, 0, -1)) < 1e-10);
});

test('Body reorient restores position and orientation', () => {
    const body = new Body({
        position: new Vec3(1, 2, 3),
        orientation: new Vec3(0.1, 0.2, 0.3)
    });

    const configuration = body.getConfiguration();

    body.position.set(10, 20, 30);
    body.orientation.set(1, 2, 3);

    body.reorient(configuration);

    assert.deepEqual(body.position, new Vec3(1, 2, 3));
    assert.deepEqual(body.orientation, new Vec3(0.1, 0.2, 0.3));
});

test('Body reorient restores child configuration', () => {
    const parent = new Body({
        position: new Vec3(1, 2, 3)
    });

    const child = new Body({
        position: new Vec3(2, 2, 3),
        orientation: new Vec3(0.1, 0.2, 0.3)
    });

    child.localPosition.set(1, 0, 0);
    parent.add(child);

    const configuration = parent.getConfiguration();

    parent.position.set(10, 20, 30);
    child.position.set(20, 30, 40);
    child.orientation.set(1, 2, 3);

    parent.reorient(configuration);

    assert.deepEqual(parent.position, new Vec3(1, 2, 3));
    assert.deepEqual(child.position, new Vec3(2, 2, 3));
    assert.deepEqual(child.orientation, new Vec3(0.1, 0.2, 0.3));
    assert.deepEqual(child.localPosition, new Vec3(1, 0, 0));
});
