import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Cylinder, SphereSphereCollision,
    RadialSymmetricBody, ThreeJsScene, Colour, ViewsCollection, ModelObjectsCollection,
} from '../../../src/index.js';
import {MeshStandardMaterial, TextureLoader} from 'three';
import wood from '../../../src/textures/treeBark.jpg';

const g = 9.8;
const BALL_RADIUS = 0.1;
const PIVOT_Y = 0.5;

class Pendulum {
    constructor(anchorX, initialAngle, length = 1.45) {
        this._anchorX = anchorX;
        this._length = length;
        this._theta = initialAngle;
        this._initialAngle = initialAngle;
        this._omega = 0;

        this._ball = new RadialSymmetricBody({ radius: BALL_RADIUS });
        this._rod = new AxialSymmetricBody({ radius: 0.012 });
        this._updatePosition();
    }

    get ball() { return this._ball; }
    get rod() { return this._rod; }
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
        this._ball.velocity.copy(this.velocity);
    }

    applyVelocity = velocity => this._omega = velocity.dot(this.tangent) / this._length;

    reset() {
        this._theta = this._initialAngle;
        this._omega = 0;
        this._updatePosition();
    }
}

class NewtonsCradle {
    constructor(ballCount = 7, ballSpacing = BALL_RADIUS * 2.04, swingAngle = -Math.PI / 5) {
        const radius = 0.04;
        const anchorX = index => (index - (ballCount - 1) / 2) * ballSpacing;
        this._collisionHandler = new SphereSphereCollision(0.985);
        /** @type {Pendulum[]} */
        this._pendulums = Array.from({ length: ballCount }, (_, index) =>
            new Pendulum(anchorX(index), index === 0 ? swingAngle : 0));
        /** @type {ModelObjectsCollection<AxialSymmetricBody>} */
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

    reset = () => this._pendulums.forEach(ball => ball.reset());

    _resolveCollisionsBetweenAdjacentSphericalBobs(left, right) {
        left.ball.and(right.ball).apply(this._collisionHandler);

        // The rods constrain each bob to its pendulum tangent. Project the
        // collision-adjusted velocities back onto that allowed direction.
        left.applyVelocity(left.ball.velocity);
        right.applyVelocity(right.ball.velocity);
        left.ball.velocity.copy(left.velocity);
        right.ball.velocity.copy(right.velocity);
    }

    update(dt) {
        this._pendulums.forEach(pendulum => pendulum.update(dt));

        for (let i = 0; i < this._pendulums.length - 1; i++)
            this._resolveCollisionsBetweenAdjacentSphericalBobs(this._pendulums[i], this._pendulums[i + 1]);

        this._pendulums.forEach(ball => ball._updatePosition());
    }
}

const cradle = new NewtonsCradle();
/** @type {ModelObjectsCollection<RadialSymmetricBody>} */
const balls = new ModelObjectsCollection(cradle.balls);
/** @type {ModelObjectsCollection<RadialSymmetricBody>} */
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
        material: new MeshStandardMaterial({map: new TextureLoader().load(wood)}),
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