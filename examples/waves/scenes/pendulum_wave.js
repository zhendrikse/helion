import {
    Vec3, Simulation, Sphere, Floor, Vec2, AxialSymmetricBody, Cylinder, RadialSymmetricBody, ThreeJsScene, Colour,
    ViewsCollection, ModelObjectsCollection
} from '../../../src/index.js';
import {MeshStandardMaterial, TextureLoader} from 'three';
import wood from '../../../src/textures/treeBark.jpg';

const g = 9.8;

class Pendulum {
    /** @param {{T?: number, position?: number, theta0?: number, mass?: number, pivotY?: number}} options */
    constructor({
        T = 1,
        position = 0,
        theta0 = Math.PI / 6,
        mass = 1,
        pivotY = -2
    } = {}) {
        const length = (T * T * 9.8) / (4 * Math.PI * Math.PI);
        this._xPosition = position;
        this._length = length;

        this._ball = new RadialSymmetricBody({
            position: this.position,
            radius: 0.1
        });
        this._rod = new AxialSymmetricBody({
            position: new Vec3(position, pivotY - length * Math.cos(theta0), length * Math.sin(theta0)),
            axis: new Vec3(),
            radius: 0.0125,
            mass
        });

        this._omega = 0;
        this._theta = theta0;
        this._pivotY = pivotY;

        this._updatePosition();
    }

    get rod() { return this._rod; }
    get ball() { return this._ball; }

    /** @param {number} dt */
    update(dt) {
        const alpha = (-g / this._length) * Math.sin(this._theta);
        this._omega += alpha * dt;
        this._theta += this._omega * dt;
        this._updatePosition();
    }

    _updatePosition() {
        const newPos = new Vec3(
            this._xPosition,
            this._pivotY - this._length * Math.cos(this._theta),
            this._length * Math.sin(this._theta)
        );

        const pivot = new Vec3(this._xPosition, this._pivotY, 0);
        this._rod.axis.copy(newPos.clone().sub(pivot).negate());
        this._rod.position.copy(newPos);
        this._ball.position.copy(newPos);
    }

    reset() {
        this._omega = 0;
        this._theta = Math.PI / 6;
        this._ball.reset();
        this._rod.reset();
        this._updatePosition();
    }
}

class Cradle {
    constructor({
        Tpw = 50,
        N = 15,
        total = 20,
        Tmax = Tpw / N,
        Lmax = (Tmax ** 2 * 9.8) / (4 * Math.PI ** 2),
        width = Lmax
    } = {}) {
        /** @type {Pendulum[]} */
        this._pendulums = [];
        for (let i = 0; i < total; i++) {
            const T = Tpw / (N + i);
            const x = width * (-0.5 + i / (total - 1));
            this._pendulums.push(new Pendulum({ T, position: x, pivotY: -2 }));
        }

        /** @type {ModelObjectsCollection<AxialSymmetricBody>} */
        this._frame = new ModelObjectsCollection()
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(-1.5, -4.95, -2.1),
                axis: new Vec3(0, 0, 0.4),
                radius: 0.07
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(1.5, -4.95, 1.7),
                axis: new Vec3(0, 0, 0.4),
                radius: 0.07
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(1.5, -4.95, -2.1),
                axis: new Vec3(0, 0, 0.4),
                radius: 0.07
            }))
            .add(new AxialSymmetricBody({ // Foot
                position: new Vec3(-1.5, -4.95, 1.7),
                axis: new Vec3(0, 0, 0.4),
                radius: 0.07
            }))
            .add(new AxialSymmetricBody({
                axis: new Vec3(0, -3 - 0.04 , 2),
                position: new Vec3(-1.5, -2, 0),
                radius: 0.05
            }))
            .add(new AxialSymmetricBody({
                axis: new Vec3(0, -3 - 0.04 , -2),
                position: new Vec3(-1.5, -2, 0),
                radius: 0.05
            })).add(new AxialSymmetricBody({
                axis: new Vec3(0, -3 - 0.04 , 2),
                position: new Vec3(1.5, -2, 0),
                radius: 0.05
            })).add(new AxialSymmetricBody({
                axis: new Vec3(0, -3 - 0.04 , -2),
                position: new Vec3(1.5, -2, 0),
                radius: 0.05
            })).add(new AxialSymmetricBody({ // Top
                axis: new Vec3(3, 0 , 0),
                position: new Vec3(-1.5, -2, 0),
                radius: 0.05
            }));
    }

    reset() {
        this._pendulums.forEach(pendulum => pendulum.reset());
    }

    update(dt) {
        this._pendulums.forEach(pendulum => pendulum.update(dt));
    }

    get balls() { return this._pendulums.map(pendulum => pendulum.ball); }
    get rods() { return this._pendulums.map(pendulum => pendulum.rod); }
    get frame() { return this._frame; }
}

const total = 20;
const cradle = new Cradle({ total });
const balls = new ModelObjectsCollection(cradle.balls);
const rods = new ModelObjectsCollection(cradle.rods);
const spheres = ViewsCollection.of(Sphere).with({ castShadow: true });

const woodMaterial = new MeshStandardMaterial({map: new TextureLoader().load(wood)});
Simulation
    .with({
        htmlDivId: 'pendulumWaveContainer',
        camera: {
            target: new Vec3(3, -3.3, -0.4),
            fieldOfView: 50,
            position: new Vec3(-5.5, -3.3, 0.4).multiplyScalar(1.1)
        },
        scene: { background: ThreeJsScene.Background.FOG },
        lighting: { shadows: true }
    })
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .addObject3D(new Floor({
        position: new Vec3(0, -5, 0),
        planeSizeXy: new Vec2(100, 100),
        granularity: 15,
        type: Floor.Type.WOOD_WICKER
    }))
    .bind(cradle.frame.onceWith(ViewsCollection.of(Cylinder).with({material: woodMaterial, color: new Colour(0x855E42) })))
    .bind(balls.alwaysWith(spheres))
    .bind(rods.alwaysWith(ViewsCollection.of(Cylinder).with({
        color: new Colour(0xDEB887),
        material: new MeshStandardMaterial({ roughness: 0.8, metalness: 0.2 }),
        castShadow: true
    })))
    .onReset(() => cradle.reset())
    .onStep((_, dt) => cradle.update(dt));

spheres.forEach((sphere, index) =>
    sphere.color =  new Colour().setHSL(index / (total - 1), 1, 0.5));
