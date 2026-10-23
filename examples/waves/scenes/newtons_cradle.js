import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Cylinder,
    RadialSymmetricBody, ThreeJsScene, Colour, ViewsCollection, ModelsCollection
} from '../../../src/index.js';
import { MeshStandardMaterial } from 'three';

const g = 9.8;
const BALL_COUNT = 7;
const BALL_RADIUS = 0.1;
const BALL_SPACING = BALL_RADIUS * 2.04;
const PENDULUM_LENGTH = 1.45;
const PIVOT_Y = 1.5;
const INITIAL_ANGLE = -Math.PI / 5;
const RESTITUTION = 0.985;

class CradleBall {
    constructor(index) {
        this._anchorX = (index - (BALL_COUNT - 1) / 2) * BALL_SPACING;
        this._length = PENDULUM_LENGTH;
        this._theta = index === 0 ? INITIAL_ANGLE : 0;
        this._omega = 0;
        this._mass = 1;

        this._ball = new RadialSymmetricBody({
            position: new Vec3(),
            radius: BALL_RADIUS,
            mass: this._mass
        });
        this._rod = new AxialSymmetricBody({
            position: new Vec3(),
            axis: new Vec3(),
            radius: 0.012,
            mass: 0.1
        });
        this._updatePosition();
    }

    get ball() { return this._ball; }
    get rod() { return this._rod; }

    _position() {
        return new Vec3(
            this._anchorX + this._length * Math.sin(this._theta),
            PIVOT_Y - this._length * Math.cos(this._theta),
            0
        );
    }

    _tangent() {
        return new Vec3(Math.cos(this._theta), Math.sin(this._theta), 0);
    }

    _velocity() {
        return this._tangent().multiplyScalar(this._length * this._omega);
    }

    _updatePosition() {
        const position = this._position();
        const pivot = new Vec3(this._anchorX, PIVOT_Y, 0);
        this._ball.position.copy(position);
        this._rod.position.copy(position);
        this._rod.axis.copy(pivot.sub(position));
    }

    update(dt) {
        const alpha = -(g / this._length) * Math.sin(this._theta);
        this._omega += alpha * dt;
        this._theta += this._omega * dt;
        this._updatePosition();
    }

    applyVelocity(velocity) {
        this._omega = velocity.dot(this._tangent()) / this._length;
    }

    reset(index) {
        this._theta = index === 0 ? INITIAL_ANGLE : 0;
        this._omega = 0;
        this._updatePosition();
    }
}

class NewtonsCradle {
    constructor() {
        /** @type {CradleBall[]} */
        this._balls = Array.from({ length: BALL_COUNT }, (_, i) => new CradleBall(i));
        this._frame = new ModelsCollection()
            // Top crossbar
            .add(new AxialSymmetricBody({
                position: new Vec3(-0.82, PIVOT_Y, 0),
                axis: new Vec3(1.64, 0, 0),
                radius: 0.045
            }))
            // Side supports, extending down to the feet
            .add(new AxialSymmetricBody({
                position: new Vec3(-0.82, -1.55, 0),
                axis: new Vec3(0, PIVOT_Y + 1.55, 0),
                radius: 0.04
            }))
            .add(new AxialSymmetricBody({
                position: new Vec3(0.82, -1.55, 0),
                axis: new Vec3(0, PIVOT_Y + 1.55, 0),
                radius: 0.04
            }))
            // Feet
            .add(new AxialSymmetricBody({
                position: new Vec3(-1.0, -1.55, 0),
                axis: new Vec3(0.36, 0, 0),
                radius: 0.05
            }))
            .add(new AxialSymmetricBody({
                position: new Vec3(0.64, -1.55, 0),
                axis: new Vec3(0.36, 0, 0),
                radius: 0.05
            }));
    }

    get balls() { return this._balls.map(ball => ball.ball); }
    get rods() { return this._balls.map(ball => ball.rod); }
    get frame() { return this._frame; }

    reset() {
        this._balls.forEach((ball, i) => ball.reset(i));
    }

    update(dt) {
        this._balls.forEach(ball => ball.update(dt));

        // Resolve nearly instantaneous, elastic collisions between adjacent balls.
        for (let i = 0; i < this._balls.length - 1; i++) {
            const left = this._balls[i];
            const right = this._balls[i + 1];
            const pLeft = left._position();
            const pRight = right._position();
            const delta = pRight.clone().sub(pLeft);
            const distance = delta.length();
            const minDistance = BALL_RADIUS * 2;

            if (distance >= minDistance || distance < 1e-9) continue;

            const normal = delta.multiplyScalar(1 / distance);
            const vLeft = left._velocity();
            const vRight = right._velocity();
            const relativeSpeed = vRight.clone().sub(vLeft).dot(normal);

            if (relativeSpeed >= 0) continue;

            const impulse = -(1 + RESTITUTION) * relativeSpeed / (1 / left._mass + 1 / right._mass);
            vLeft.sub(normal.clone().multiplyScalar(impulse / left._mass));
            vRight.add(normal.clone().multiplyScalar(impulse / right._mass));
            left.applyVelocity(vLeft);
            right.applyVelocity(vRight);
        }

        this._balls.forEach(ball => ball._updatePosition());
    }
}

const cradle = new NewtonsCradle();
const balls = new ModelsCollection(cradle.balls);
const rods = new ModelsCollection(cradle.rods);
const spheres = ViewsCollection.of(Sphere).with({ castShadow: true });

Simulation
    .with({
        htmlDivId: 'newtonsCradleContainer',
        camera: {
            target: new Vec3(0, 0.1, 0),
            fieldOfView: 42,
            position: new Vec3(-0.8, 0.25, 5.8)
        },
        scene: { background: ThreeJsScene.Background.FOG },
        lighting: { shadows: true }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .addObject3D(new Floor({
        position: new Vec3(0, -1.65, 0),
        planeSizeXy: new Vec2(100, 100),
        granularity: 15,
        type: Floor.Type.WOOD_WICKER
    }))
    .bind(cradle.frame.onceWith(ViewsCollection.of(Cylinder).with({
        color: new Colour(0x855E42),
        material: new MeshStandardMaterial({ roughness: 0.75, metalness: 0.15 }),
        castShadow: true
    })))
    .bind(balls.alwaysWith(spheres))
    .bind(rods.alwaysWith(ViewsCollection.of(Cylinder).with({
        color: new Colour(0xC0C0C0),
        material: new MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.25, metalness: 0.85 }),
        castShadow: true
    })))
    .onReset(() => cradle.reset())
    .onStep((_, dt) => cradle.update(dt));

spheres.forEach(sphere => {
    sphere.color = new Colour(0xD8DDE5);
});
