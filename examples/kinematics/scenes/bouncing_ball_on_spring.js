import {
    RadialSymmetricBody, Simulation, Vec3, Checkbox, Vec2, Sphere, Floor, Helix,
    Slider, Range, UniformGravitationalForce, SpringForce, DragForce, Body, BodyPair, VectorView, Colour} from '../../../src/index.js';
import { DoubleSide, MeshStandardMaterial } from 'three';
import pavingColorUrl from './textures/paving_color.jpg';
import pavingRoughnessUrl from './textures/paving_roughness.jpg';
import pavingNormalUrl from './textures/paving_normal.jpg';
import pavingBumpUrl from './textures/paving_ambient_occlusion.jpg';

const floor = new Floor({
    position: new Vec3(0, -1, 0),
    type: Floor.Type.CUSTOM,
    planeMaterial: new MeshStandardMaterial({
        normalScale: new Vec2(2, 2),
        roughness: 1,
        map: Floor.loadTexture(pavingColorUrl, 1),
        roughnessMap: Floor.loadTexture(pavingRoughnessUrl, 1),
        normalMap: Floor.loadTexture(pavingNormalUrl, 1),
        bumpMap: Floor.loadTexture(pavingBumpUrl, 1),
        bumpScale: 0.05,
        side: DoubleSide
    })
});

const springRestLength = 0.75;
const gravity = new UniformGravitationalForce();
const dragForce = new DragForce(-.1);

const ball = new RadialSymmetricBody({
    position: new Vec3(0, 1.5, 0),
    radius: 0.15,
    mass: 1.5
});

class Spring extends BodyPair {
    constructor({
        position = new Vec3(),
        axis = new Vec3(0, 1, 0)
    } = {}) {
        super(
            new Body({ position: position.clone() }),
            new Body({ position: position.clone().add(axis) })
        );
        this._bondForce = new SpringForce({
            restLength: axis.length(),
            k: 225
        });
    }

    get force() { return this._bondForce; }
}

const hitsSpring = (ball) => ball.position.y < floor.position.y + springRestLength;
const spring = new Spring({
    position: floor.position,
    axis: new Vec3(0, springRestLength, 0),
});

const helix = new Helix({
    coils: 15,
    thickness: 0.075,
    color: Colour.Yellow,
    radiusFunction: () => 0.1
});
const sphere = new Sphere({ color: Colour.Orange });

const velocityView = new VectorView({
    vectorProperty: body => body.velocity,
    color: Colour.Cyan,
    size: 0.1,
    magnitudeMap: mag => mag * 0.15
});

const forceArrow = new VectorView({
    vectorProperty: body => body.acceleration,
    color: Colour.Red,
    size: 0.1,
    magnitudeMap: mag => mag * .025
});

Simulation
    .with({
        htmlDivId: 'bouncingBallOnSpringContainer',
        camera: {
            position: new Vec3(1, 0.4, 2).multiplyScalar(1.7)
        }
    })
    .withMouseClickEventListener()
    .bind(ball.alwaysWith(sphere))
    .bind(ball.alwaysWith(velocityView))
    .bind(ball.alwaysWith(forceArrow))
    .bind(spring.alwaysWith(helix))
    .runsEvery(2e-3)
    .substeps(2)
    .advancesBy(1e-3)
    .onStep((_, dt) => {
        if (hitsSpring(ball)) {
            spring.body2.state.position.y = ball.position.y;
            ball.and(spring.body1).apply(spring.force);
        }
        ball.apply(gravity);
        ball.apply(dragForce);
        ball.integrate(dt);
    })
    .addObject3D(floor)
    .append(new Checkbox('🚀 Velocity: ')
        .on(velocityView)
        .withProperty('visible')
        .togetherWith(new Checkbox('💪🏻 Force: ')
            .on(forceArrow)
            .withProperty('visible')))
    .append(new Slider('🍃 Air resistance: ')
        .withRange(new Range(-1, 0, 0.01))
        .withValue(dragForce.dragCoefficient)
        .on(dragForce)
        .withProperty('dragCoefficient'));



