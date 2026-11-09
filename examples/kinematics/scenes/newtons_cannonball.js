import {
    Simulation, Sphere, Trail, Vec3, Colour, Planet, Slider, Range, RadialSymmetricBody
} from '../../../src/index.js';
import {DirectionalLight, MeshPhongMaterial, SRGBColorSpace} from 'three';
import earthMap from '../../astrophysics/textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthBumpMap from '../../astrophysics/textures/earthbump1k.jpg';

const EARTH_RADIUS = 6_371_000;
const BALL_RADIUS = 0.02 * EARTH_RADIUS;
const INITIAL_DISTANCE = 1.05 * EARTH_RADIUS;

const earthTexture = Planet.loader.load(earthMap);
earthTexture.colorSpace = SRGBColorSpace;

function update(ball, dt) {
    ball.velocity.addScaledVector(ball.force, dt);
    ball.position
        .addScaledVector(ball.velocity, dt)
        .addScaledVector(ball.force, 0.5 * dt * dt);
}
let speed = 7800;
const initialPosition = new Vec3(0, INITIAL_DISTANCE, 0);
const initialVelocity = () => new Vec3(-initialPosition.y, initialPosition.x, -initialPosition.z)
    .multiplyScalar(speed / initialPosition.length());

const earth = new RadialSymmetricBody({ radius: EARTH_RADIUS });
const cannonball = new RadialSymmetricBody({
    radius: BALL_RADIUS,
    position: initialPosition.clone(),
    velocity: initialVelocity()
})

const uniformEarthBall = new RadialSymmetricBody({
    radius: BALL_RADIUS,
    position: new Vec3(0, INITIAL_DISTANCE, 0)
});
const pointMassEarthBall = new RadialSymmetricBody({
    radius: BALL_RADIUS,
    position: new Vec3(0, INITIAL_DISTANCE, 0)
});

const earthView = new Sphere({
    color: Colour.White,
    segments: 64,
    material: new MeshPhongMaterial({
        map: earthTexture,
        bumpMap: Planet.loader.load(earthBumpMap),
        bumpScale: 20,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    })
});

const cannonBallHitEarth = () => cannonball.position.length() < earth.radius;

const sunLight1 = new DirectionalLight(0xffffff, 2);
const sunLight2 = new DirectionalLight(0xffffff, 2);
sunLight1.position.set(0, 0, 20);
sunLight2.position.set(0, 0, -20);
let elapsedTime = 0;
const simulation = Simulation
    .with({
        htmlDivId: 'newtonsCannonballContainer',
        viewport: { parameterMenuCollapsed: false },
        scene: { scale: 1e-6 },
        camera: {position: new Vec3(-5, 0, 25), fieldOfView: 35 },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>💣 Newton’s cannonball</strong><br/>' +
                '<span style=\"color: cyan;\">Cyan cannonball</span>: launched horizontally<br/>' +
                '<span style=\"color: red;\">Red ball</span>: dropped through a uniform-density Earth<br/>' +
                '<span style=\"color: green;\">Green ball</span>: dropped toward an Earth-equivalent point mass<br/>' +
                'At about 8,000 m/s the cannonball enters orbit.'
        }
    })
    .addObject3D(sunLight1)
    .addObject3D(sunLight2)
    .bind(cannonball.alwaysWith(new Sphere({ color: Colour.Cyan })))
    .bind(cannonball.alwaysWith(new Trail({ color: Colour.Cyan, maxPoints: 2000 })))
    .bind(uniformEarthBall.alwaysWith(new Sphere({ color: Colour.Red })))
    .bind(uniformEarthBall.alwaysWith(new Trail({ color: Colour.Red, maxPoints: 2000 })))
    .bind(pointMassEarthBall.alwaysWith(new Sphere({ color: Colour.Green })))
    .bind(pointMassEarthBall.alwaysWith(new Trail({ color: Colour.Green, maxPoints: 2000 })))
    .bind(earth.alwaysWith(earthView))
    .runsEvery(0.01)
    .advancesBy(5)
    .onStep((_clock, dt) => {
        if (cannonBallHitEarth()) {
            simulation.showHud(`Cannonball reached Earth — elapsed time: ${(elapsedTime / 60).toFixed(3)} minutes.`);
            return;
        }

        cannonball.force.copy(cannonball.position.clone().normalize().multiplyScalar(-9.8));
        update(cannonball, dt);

        const distance = uniformEarthBall.position.length();
        const magnitude = 9.8 * (Math.min(distance, EARTH_RADIUS) / EARTH_RADIUS) ** 3;
        uniformEarthBall.force.copy(uniformEarthBall.position.clone().normalize().multiplyScalar(-magnitude));
        update(uniformEarthBall, dt);

        pointMassEarthBall.force.copy(pointMassEarthBall.position.clone().normalize().multiplyScalar(-9.8));
        update(pointMassEarthBall, dt);

        elapsedTime += dt;
    })
    .onFrame(() => simulation.setBottomText(`Elapsed time: ${(elapsedTime / 60).toFixed(2)} minutes`))
    .withMouseClickEventListener()
    .onReset(() => {
        elapsedTime = 0;
        cannonball.velocity.copy(initialVelocity());
    })
    .showHud('Click to launch Newton’s cannonball')
    .append(new Slider('Cannonball speed')
        .withRange(new Range(1, 10, 0.1))
        .withValue(7.8)
        .withUnits(' × 1000 m/s')
        .onInput(value => speed = 1000 * value));