import { PerspectiveCamera, Vector3 } from 'three';
import {
    Arrow, AxialSymmetricBody, Block, Box, Colour, Cylinder, Helix, Range,
    Simulation, Slider, ThreeJsScene, Vec3
} from '../../../src/index.js';

const g = 9.8;
const cartLength = 0.10;
const cartWidth = 0.05;
const cartHeight = 0.02;
const cartMass = 1.5;

const springCount = 20;
const springMass = 0.1;
const springConstant = 2500;
const springDrag = 0.5;
const springWidth = 0.01;
const springRadius = springWidth / 2;

const wall = new Block({
    position: new Vec3(-0.245, 0, 0),
    size: new Vec3(0.01, 0.04, 0.08),
    fixed: true
});

const track = new Block({
    position: new Vec3(0, -0.025, 0),
    size: new Vec3(0.5, 0.01, 0.08),
    fixed: true
});

const cart = new Block({
    position: new Vec3(0, 0, 0),
    velocity: new Vec3(1.5, 0, 0),
    size: new Vec3(cartLength, cartHeight, cartWidth),
    mass: cartMass
});

const wheelOffsets = [
    new Vec3(0.4 * cartLength, -0.5 * cartHeight, 0.4 * cartWidth),
    new Vec3(0.4 * cartLength, -0.5 * cartHeight, -0.525 * cartWidth),
    new Vec3(-0.4 * cartLength, -0.5 * cartHeight, 0.4 * cartWidth),
    new Vec3(-0.4 * cartLength, -0.5 * cartHeight, -0.525 * cartWidth)
];
const wheels = wheelOffsets.map(offset => new AxialSymmetricBody({
    position: cart.position.clone().add(offset),
    axis: new Vec3(0, 0, 0.15 * cartWidth),
    radius: 0.5 * cartHeight,
    fixed: true
}));

class SpringElement {
    constructor(position, axis, mass, restLength) {
        this.body = new AxialSymmetricBody({ position, axis, mass });
        this.velocity = new Vec3();
        this.force = new Vec3();
        this.mass = mass;
        this.restLength = restLength;
    }

    updateGravitationalForce(drag) {
        this.force.set(0, -this.mass * g, 0)
            .addScaledVector(this.velocity, -drag);
    }

    updateLeftElement(neighbor, k, top) {
        this.force.add(
            neighbor.body.axis.clone()
                .sub(neighbor.body.axis.clone().normalize().multiplyScalar(this.restLength))
                .multiplyScalar(k)
        );
        this.body.position.copy(top);
        this.body.axis.copy(neighbor.body.position).sub(this.body.position);
    }

    updateRightElement(neighbor, k, bottom) {
        this.force.add(
            neighbor.body.axis.clone()
                .sub(neighbor.body.axis.clone().normalize().multiplyScalar(this.restLength))
                .multiplyScalar(-k)
        );
        this.body.position.copy(bottom);
        this.body.axis.set(0, 0, 0);
    }

    updateWith(left, right, k, dt) {
        this.force.addScaledVector(
            left.body.axis.clone()
                .sub(left.body.axis.clone().normalize().multiplyScalar(this.restLength)),
            -k
        );
        this.force.addScaledVector(
            this.body.axis.clone()
                .sub(this.body.axis.clone().normalize().multiplyScalar(this.restLength)),
            k
        );

        const extension = this.body.axis.clone()
            .sub(this.body.axis.clone().normalize().multiplyScalar(this.restLength));
        const tension = k * extension.length();

        this.velocity.addScaledVector(this.force, dt / this.mass);
        this.body.position.addScaledVector(this.velocity, dt);
        this.body.axis.copy(right.body.position).sub(this.body.position);
        this.force.set(0, 0, 0);

        return tension;
    }
}

class Spring {
    constructor(count, mass, k, drag, top, bottom) {
        this.elements = [];
        this.k = k;
        this.drag = drag;
        this.top = top.clone();
        this.bottom = bottom.clone();

        const line = bottom.clone().sub(top);
        this.restLength = line.length() / count;
        const segmentAxis = line.clone().normalize().multiplyScalar(this.restLength);

        for (let i = 0; i < count; i++) {
            this.elements.push(new SpringElement(
                top.clone().addScaledVector(line, i / count),
                segmentAxis.clone(),
                mass / count,
                this.restLength
            ));
        }
    }

    updateWith(cartPosition) {
        this.bottom.copy(cartPosition);
    }

    updateBy(dt) {
        for (const element of this.elements)
            element.updateGravitationalForce(this.drag);

        this.elements[0].updateLeftElement(this.elements[1], this.k, this.top);

        let tension = 0;
        for (let i = 1; i < this.elements.length - 1; i++)
            tension += this.elements[i].updateWith(this.elements[i - 1], this.elements[i + 1], this.k, dt);

        this.elements[this.elements.length - 1].updateRightElement(
            this.elements[this.elements.length - 2], this.k, this.bottom
        );

        return tension / this.elements.length;
    }

    forceOnLastElement() {
        return this.elements[this.elements.length - 1].force;
    }
}

const spring = new Spring(
    springCount,
    springMass,
    springConstant,
    springDrag,
    wall.position,
    cart.position.clone().add(new Vec3(-cartLength / 2, 0, 0))
);

const forceArrow = new AxialSymmetricBody({
    position: cart.position.clone(),
    axis: new Vec3(),
    radius: 0.004,
    fixed: true
});

let pulling = false;
let lastPointerX = 0;
let pullForce = 0;

const pointerCamera = new PerspectiveCamera(40, 3 / 2, 0.1, 100);
pointerCamera.position.copy(new Vector3(-10, 0.25, 5).multiplyScalar(1.25));
pointerCamera.lookAt(-0.07, -0.025, 0);
pointerCamera.updateMatrixWorld();

function pointerIsOverCart(x, y) {
    const projected = new Vector3(cart.position.x, cart.position.y, cart.position.z)
        .project(pointerCamera);
    return Math.abs(x - projected.x / 2) < 0.06 && Math.abs(y - projected.y / 2) < 0.06;
}

const simulation = Simulation.with({
    htmlDivId: 'cartOnSpringContainer',
    viewport: { aspectRatio: '3 / 2' },
    camera: {
        position: new Vec3(-10, 0.25, 5).multiplyScalar(1.25),
        target: new Vec3(-0.07, -0.025, 0),
        fieldOfView: 40,
        controls: false
    },
    scene: { background: ThreeJsScene.Background.FOG },
    infoPanel: {
        text: '<strong>Cart on a spring</strong><br/>Drag horizontally in the viewport to pull the cart. Release to let it oscillate.'
    }
});

simulation
    .runsEvery(0.001)
    .advancesBy(0.001)
    .onStep((_clock, dt) => {
        const netForce = new Vec3(0.1 + spring.forceOnLastElement().x + pullForce, 0, 0);

        if (cart.position.x < wall.position.x + cartLength / 2) {
            cart.velocity.x *= -0.5;
            cart.position.x = wall.position.x + cartLength / 2;
        }

        cart.velocity.addScaledVector(netForce, dt / cartMass);
        cart.position.addScaledVector(cart.velocity, dt);

        for (let i = 0; i < wheels.length; i++)
            wheels[i].position.copy(cart.position).add(wheelOffsets[i]);

        spring.updateWith(cart.position.clone().add(new Vec3(-cartLength / 2, 0, 0)));
        spring.updateBy(dt);

        forceArrow.position.copy(cart.position);
        forceArrow.axis.set(pulling ? pullForce * 0.002 : 0, 0, 0);
    })
    .bind(wall.alwaysWith(new Box({ color: new Colour(0x855E42) })))
    .bind(track.alwaysWith(new Box({ color: new Colour(0x855E42) })))
    .bind(cart.alwaysWith(new Box({ color: new Colour(0x2878d0), opacity: 0.85 })))
    .bind(forceArrow.alwaysWith(new Arrow({
        color: Colour.Red,
        size: 0.004,
        opacity: 0.6,
        magnitudeMap: magnitude => Math.min(magnitude, 0.08)
    })));

for (const wheel of wheels)
    simulation.bind(wheel.alwaysWith(new Cylinder({
        color: new Colour(0x222222),
        radiusFunction: body => body.radius
    })));

for (let i = 0; i < spring.elements.length - 1; i++)
    simulation.bind(spring.elements[i].body.alwaysWith(new Helix({
        color: new Colour(0xd4c27a),
        coils: 3,
        radiusFunction: () => springRadius,
        thickness: 0.2,
        tubularSegments: 48,
        radialSegments: 6
    })));

simulation
    .onPointer('pointerdown', (x, y, event) => {
        if (event.button !== 0 || !pointerIsOverCart(x, y)) return;
        pulling = true;
        lastPointerX = x;
    })
    .onPointer('pointermove', x => {
        if (!pulling) return;
        const delta = x - lastPointerX;
        pullForce = Math.max(-100, Math.min(100, pullForce + delta * 400));
        lastPointerX = x;
    })
    .onPointer('pointerup', () => {
        pulling = false;
        pullForce = 0;
    })
    .onPointer('pointercancel', () => {
        pulling = false;
        pullForce = 0;
    })
    .append(new Slider('Spring constant')
        .withRange(new Range(500, 4000, 100))
        .withValue(springConstant)
        .onInput(value => spring.k = value))
    .append(new Slider('Spring drag')
        .withRange(new Range(0, 2, 0.1))
        .withValue(springDrag)
        .onInput(value => spring.drag = value))
    .start();
