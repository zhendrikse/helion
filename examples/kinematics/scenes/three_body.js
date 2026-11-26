import {
    Integrators, RadialSymmetricBody, G, Simulation, Vec3, Sphere, Trail, GravitationalForce, Colour, Renderable,
    ThreeJsScene
} from '../../../src/index.js';
import { MeshPhongMaterial } from "three";
import mercuryMap from '../../astrophysics/textures/mercurymap.jpg';
import mercuryBumpMap from '../../astrophysics/textures/mercurybump.jpg';

const material = () => new MeshPhongMaterial({
    map: Renderable.loadTexture(mercuryMap),
    bumpMap: Renderable.loadTexture(mercuryBumpMap),
    bumpScale: 1.5,
});

const astronomical_unit = 1.49e11;
const mass = 1e30;
const radiusA = 0.1 * astronomical_unit;
const radiusB = radiusA / 0.8;
const velocityA = Math.sqrt(G * 0.8 * mass * radiusA) / (radiusA + radiusB);
const radius = 1.9e9;

const bodyA = new RadialSymmetricBody({
    position: new Vec3(radiusA, 0, 0),
    velocity: new Vec3(0, velocityA, 0),
    radius,
    mass
});

const bodyB = new RadialSymmetricBody({
    position: new Vec3(-radiusB, 0, 0),
    velocity: new Vec3(0, -velocityA / 0.8, 0),
    radius,
    mass: mass * 0.8
});

const bodyC = new RadialSymmetricBody({
    position: new Vec3(0, 0, radiusA),
    velocity: new Vec3(0, 0, 0),
    radius,
    mass: mass * 0.5
});

const gravitationalForce = new GravitationalForce();

Simulation
    .with({
        htmlDivId: 'threeBodyContainer',
        camera: { position: new Vec3(55, 55, 55), fieldOfView: 30 },
        scene: { scale: 1e-9, background: ThreeJsScene.Background.STARS }
    })
    .bind(bodyA.alwaysWith(new Sphere({ material: material(), color: Colour.White })))
    .bind(bodyA.alwaysWith(new Trail({ maxPoints: 500, color: Colour.Yellow })))
    .bind(bodyB.alwaysWith(new Sphere({ material: material(), color: new Colour(0xffcccc) })))
    .bind(bodyB.alwaysWith(new Trail({ maxPoints: 500, color: Colour.Cyan })))
    .bind(bodyC.alwaysWith(new Sphere({ material: material(), color: new Colour(0xffffcc) })))
    .bind(bodyC.alwaysWith(new Trail({ maxPoints: 500, color: Colour.Magenta })))
    .onStep(_ => {
        bodyA.and(bodyB).apply(gravitationalForce);
        bodyA.and(bodyC).apply(gravitationalForce);
        bodyB.and(bodyC).apply(gravitationalForce);

        bodyA.integrate(10, Integrators.symplecticEulerStep);
        bodyB.integrate(10, Integrators.symplecticEulerStep);
        bodyC.integrate(10, Integrators.symplecticEulerStep);
    })
    .substeps(200)
    .withMouseClickEventListener();
