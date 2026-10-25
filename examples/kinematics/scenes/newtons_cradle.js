import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Cylinder,
    RadialSymmetricBody, ThreeJsScene, Colour, ViewsCollection, ModelObjectsCollection
} from '../../../src/index.js';
import { MeshStandardMaterial } from 'three';

const g = 9.8;
const BALL_COUNT = 7;
const BALL_RADIUS = 0.1;
const BALL_SPACING = BALL_RADIUS * 2.04;
const PENDULUM_LENGTH = 1.45;
const PIVOT_Y = 0.5;
const INITIAL_ANGLE = -Math.PI / 5;
const RESTITUTION = 0.985;

class Pendulum {
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
    get mass() { return this._mass; }
    get tangent () { return new Vec3(Math.cos(this._theta), Math.sin(this._theta), 0); }
    get velocity() { return this.tangent.multiplyScalar(this._length * this._omega); }
    get position() {
        return new Vec3(this._anchorX + this._length * Math.sin(this._theta),
        PIVOT_Y - this._length * Math.cos(this._theta),
        0);
    }

    positionVectorTo = otherPendulum => otherPendulum.position.clone().sub(this.position)

    _updatePosition() {
        const position = this.position;
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

    applyVelocity = velocity => this._omega = velocity.dot(this.tangent) / this._length;

    reset(index) {
        this._theta = index === 0 ? INITIAL_ANGLE : 0;
        this._omega = 0;
        this._updatePosition();
    }
}

class NewtonsCradle {
    constructor() {
        const radius = 0.04;
        /** @type {Pendulum[]} */
        this._pendulums = Array.from({ length: BALL_COUNT }, (_, i) => new Pendulum(i));
        this._frame = new ModelObjectsCollection()
            .add(new AxialSymmetricBody({ // Top crossbar
                position: new Vec3(-0.85, PIVOT_Y - .025, 0),
                axis: new Vec3(1.7, 0, 0), radius
            }))
            .add(new AxialSymmetricBody({ // Side support
                axis: new Vec3(0, -2.1 , 1.25),
                position: new Vec3(-0.82, PIVOT_Y, 0), radius
            }))
            .add(new AxialSymmetricBody({ // Side support
                axis: new Vec3(0, -2.1 , -1.25),
                position: new Vec3(-0.82, PIVOT_Y, 0), radius
            }))
            .add(new AxialSymmetricBody({ // Side support
                axis: new Vec3(0, -2.1 , 1.25),
                position: new Vec3(0.82, PIVOT_Y, 0), radius
            }))
            .add(new AxialSymmetricBody({ // Side support
                axis: new Vec3(0, -2.1 , -1.25),
                position: new Vec3(0.82, PIVOT_Y, 0), radius
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(-0.82, -3.225 * PIVOT_Y, -1.45),
                axis: new Vec3(0, 0, 0.4), radius
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(0.82, -3.225 * PIVOT_Y, -1.45),
                axis: new Vec3(0, 0, 0.4), radius
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(-0.82, -3.225 * PIVOT_Y, 1.05),
                axis: new Vec3(0, 0, 0.4), radius
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(0.82, -3.225 * PIVOT_Y, 1.05),
                axis: new Vec3(0, 0, 0.4), radius
            }));
    }

    get balls() { return this._pendulums.map(ball => ball.ball); }
    get rods() { return this._pendulums.map(ball => ball.rod); }
    get frame() { return this._frame; }

    reset = () => this._pendulums.forEach((ball, i) => ball.reset(i));

    update(dt) {
        this._pendulums.forEach(pendulum => pendulum.update(dt));

        // Resolve nearly instantaneous, elastic collisions between adjacent balls.
        for (let i = 0; i < this._pendulums.length - 1; i++) {
            const left = this._pendulums[i];
            const right = this._pendulums[i + 1];

            const delta= left.positionVectorTo(right);
            const distance = delta.length();
            const minDistance = BALL_RADIUS * 2;
            if (distance >= minDistance || distance < 1e-9)
                continue;

            const normal = delta.normalize();
            const vLeft = left.velocity;
            const vRight = right.velocity;
            const relativeSpeed = vRight.clone().sub(vLeft).dot(normal);

            if (relativeSpeed >= 0)
                continue;

            const impulse = -(1 + RESTITUTION) * relativeSpeed / (1 / left.mass + 1 / right.mass);
            vLeft.sub( normal.clone().multiplyScalar(impulse / left.mass ));
            vRight.add(normal.clone().multiplyScalar(impulse / right.mass));
            left.applyVelocity( vLeft );
            right.applyVelocity(vRight);
        }

        this._pendulums.forEach(ball => ball._updatePosition());
    }
}

const cradle = new NewtonsCradle();
const balls = new ModelObjectsCollection(cradle.balls);
const rods = new ModelObjectsCollection(cradle.rods);

Simulation
    .with({
        htmlDivId: 'newtonsCradleContainer',
        camera: {
            target: new Vec3(0, -.75, 0),
            fieldOfView: 30,
            position: new Vec3(1, 0.25, -.5).multiplyScalar(5.25)
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
        type: Floor.Type.GRASS
    }))
    .bind(cradle.frame.onceWith(ViewsCollection.of(Cylinder).with({
        color: new Colour(0x855E42),
        material: new MeshStandardMaterial({ roughness: 0.75, metalness: 0.15 }),
        castShadow: true
    })))
    .bind(balls.alwaysWith(ViewsCollection.of(Sphere).with({ color: new Colour(0xc0c0c0), castShadow: true })))
    .bind(rods.alwaysWith(ViewsCollection.of(Cylinder).with({
        color: Colour.Yellow,
        material: new MeshStandardMaterial({ roughness: 0.25, metalness: 0.85 }),
        castShadow: true
    })))
    .onReset(() => cradle.reset())
    .onStep((_, dt) => cradle.update(dt));
