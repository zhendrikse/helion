import {Simulation, RadialSymmetricBody, Vec3, Sphere, Renderable3D, MathPhysicsModelBehavior } from "../../../src/index.js";
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

    update(dt, blackHolePos) { this._balls.forEach(ball => ball.update(dt, blackHolePos)); }

    reset() {
        this._balls.forEach(ball => ball.reset());
    }

    get head() { return this._balls[0]; }
    get body() { return this._balls.slice(1, 22); }
    get leftArm() { return this._balls.slice(22, 33); }
    get rightArm() { return this._balls.slice(33, 44); }
    get leftLeg() { return this._balls.slice(44, 55); }
    get rightLeg() { return this._balls.slice(55, 66); }
}

class PersonView extends Renderable3D {
    constructor() {
        super();
        this._head = new Sphere({ color: new Color(0.7, 0.6, 0.5) });
        this._body = [];
        this._leftArm = [];
        this._rightArm = [];
        this._leftLeg = [];
        this._rightLeg = [];
    }

    canBindTo(model) {
        return model instanceof Person;
    }

    initialize(person) {
        for (let i = 0; i < person.body.length; i++)
            this._body.push(new Sphere({ color: new Color(0.2, 0.4, 0.7) }));
        for (let i = 0; i < person.leftArm.length; i++)
            this._leftArm.push(new Sphere({ color: new Color(0.2, 0.8, 0.9) }));
        for (let i = 0; i < person.rightArm.length; i++)
            this._rightArm.push(new Sphere({ color: new Color(0.2, 0.8, 0.9) }));
        for (let i = 0; i < person.leftLeg.length; i++)
            this._leftLeg.push(new Sphere({ color: new Color(0.2, 0.2, 0.7) }));
        for (let i = 0; i < person.rightLeg.length; i++)
            this._rightLeg.push(new Sphere({ color: new Color(0.2, 0.2, 0.7) }));

        this.add(this._head);
        this._body.forEach(ball => this.add(ball));
        this._leftArm.forEach(ball => this.add(ball));
        this._rightArm.forEach(ball => this.add(ball));
        this._leftLeg.forEach(ball => this.add(ball));
        this._rightLeg.forEach(ball => this.add(ball));
    }

    synchronizeWith(person) {
        this._head.synchronizeWith(person.head);
        for (let i = 0; i < this._body.length; i++)  
            this._body[i].synchronizeWith(person.body[i]);
        for (let i = 0; i < this._leftArm.length; i++)
            this._leftArm[i].synchronizeWith(person.leftArm[i]);
        for (let i = 0; i < this._rightArm.length; i++)
            this._rightArm[i].synchronizeWith(person.rightArm[i]);
        for (let i = 0; i < this._leftLeg.length; i++)
            this._leftLeg[i].synchronizeWith(person.leftLeg[i]);
        for (let i = 0; i < this._rightLeg.length; i++)
            this._rightLeg[i].synchronizeWith(person.rightLeg[i]);
    }
}

const person = new Person();
const blackHole = new RadialSymmetricBody({ position: blackHolePos })

Simulation
    .with({
        htmlDivId: "spaghettificationContainer",
        cameraPosition: new Vec3(0, 0, 20),
        fieldOfView: 40,
        headUpDisplay: true,
        background: Simulation.Background.STARS,
        light: false
    })
    .addObject3D(new PointLight(0xffffff, 2.0, 0, .1)) // intense, no max distance
    .addObject3D(new AmbientLight(0xffffff, 1))
    .withMouseClickEventListener()
    .bind(person.alwaysWith(new PersonView()))
    .bind(blackHole.onceWith(new Sphere({ color: new Color(0.3, 0.3, 0.3) })))
    .runsEvery(6e-3)
    .onStep(() => person.update(0.02, blackHolePos));