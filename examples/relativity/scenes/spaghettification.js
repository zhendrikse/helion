import {
    Simulation, RadialSymmetricBody, Vec3, Sphere, Renderable3D, MathPhysicsModelBehavior, ThreeJsScene
} from "../../../src/index.js";
import {AmbientLight, Color, PointLight} from "three";

const vel0 = new Vec3(0, 0.65, 0);
const radius = 0.2;
const spacing = 0.1;
const base_angle = 0.2;
const blackHolePos = new Vec3(-1, 0, 0);

class Ball extends RadialSymmetricBody {
    constructor({ position, radius, velocity }) {
        super({ position, radius, velocity });
        this._rVector = new Vec3();
    }

    update(dt, blackHolePos) {
        this.state.position.addScaledVector(this.velocity, dt);
        this._rVector.subVectors(this.position, blackHolePos);
        const r2 = this._rVector.lengthSq();
        this._rVector.normalize().multiplyScalar(-15.0 / r2);
        this.state.velocity.addScaledVector(this._rVector, dt);
    }
}

class Person extends MathPhysicsModelBehavior {
    constructor() {
        super();
        this._balls = [];
        this._head();
        this._body();
        this._leftArm();
        this._rightArm();
        this._leftLeg();
        this._rightLeg();
    }

    _head() {
        this._balls.push(new Ball({
            position: new Vec3(10, 1, 0),
            velocity: vel0.clone(),
            radius: 2 * radius,
        }));
    }

    _body(pos = new Vec3(10, 1.0, 0)) {
        const theta = 0.0;
        for (let i = 0; i < 21; i++) {
            this._balls.push(new Ball({
                position: pos.clone().add(this._offset(theta, i)),
                radius: radius,
                velocity: vel0.clone()
            }));
        }
    }

    _offset = (theta, i) => new Vec3(spacing * i * Math.sin(theta + base_angle), -spacing * i * Math.cos(theta + base_angle), 0);

    _leftArm = () => this._limb(-0.7, new Vec3(10, 0.7, 0));

    _rightArm = () => this._limb(0.7, new Vec3(10, 0.7, 0));

    _rightLeg = () => this._limb(0.4, new Vec3(10, 1.0, 0)
        .add((new Vec3(Math.sin(base_angle), -Math.cos(base_angle), 0)).multiplyScalar(2)));

    _leftLeg = () => this._limb(-0.4, new Vec3(10, 1.0, 0)
        .add((new Vec3(Math.sin(base_angle), -Math.cos(base_angle), 0)).multiplyScalar(2)));

    _limb(theta, position) {
        for (let i = 0; i < 11; i++) {
            this._balls.push(new Ball({
                position: position.clone().add(this._offset(theta, i)),
                radius: radius,
                velocity: vel0.clone(),
            }));
        }
    }

    update(dt, blackHolePos) {
        this._balls.forEach(ball => ball.update(dt, blackHolePos));
    }

    reset() {
        this._balls.forEach(ball => ball.reset());
    }

    get body() { return this._balls.slice(1, 22); }
    get arms() { return this._balls.slice(22, 44); }
    get legs() { return this._balls.slice(44, 66); }
    get all() { return this._balls }
}

class PersonView extends Renderable3D {
    constructor() {
        super();
        this._spheres = [];
        this._spheres.push(new Sphere({ color: new Color(0.7, 0.6, 0.5) }));
    }

    canBindTo(model) {
        return model instanceof Person;
    }

    initialize(person) {
        for (let i = 0; i < person.body.length; i++)
            this._spheres.push(new Sphere({ color: new Color(0.2, 0.4, 0.7) }));
        for (let i = 0; i < person.arms.length; i++)
            this._spheres.push(new Sphere({ color: new Color(0.2, 0.8, 0.9) }));
        for (let i = 0; i < person.legs.length; i++)
            this._spheres.push(new Sphere({ color: new Color(0.2, 0.2, 0.7) }));

        this._spheres.forEach(sphere => this.add(sphere));
    }

    synchronizeWith(person) {
        for (let i = 0; i < this._spheres.length; i++)
            this._spheres[i].synchronizeWith(person.all[i]);
    }
}

const person = new Person();
const blackHole = new RadialSymmetricBody({ position: blackHolePos })

Simulation
    .with({
        htmlDivId: "spaghettificationContainer",
        viewport: {
            aspectRatio: "19/12"
        },
        camera: {
            position: new Vec3(0, 0, 20),
            fieldOfView: 40
        },
        scene: {
            background: ThreeJsScene.Background.STARS,
        },
        lighting: {
            enabled: false
        }
    })
    .addObject3D(new PointLight(0xffffff, 2.0, 0, .1)) // intense, no max distance
    .addObject3D(new AmbientLight(0xffffff, 1))
    .withMouseClickEventListener()
    .bind(person.alwaysWith(new PersonView()))
    .bind(blackHole.onceWith(new Sphere({ color: new Color(0.3, 0.3, 0.3) })))
    .runsEvery(6e-3)
    .onStep(() => person.update(0.02, blackHolePos));