import { DoubleSide, MeshBasicMaterial, MeshPhongMaterial, PointLight} from 'three';
import {
    AxialSymmetricBody, Colour, Cone, Cylinder, Range, RadialSymmetricBody,
    Simulation, Slider, Sphere, ThreeJsScene, Vec3, SunView, CelestialBody
} from '../../../src/index.js';

const whiteDwarfDistance = 0.15;
const diskRadius = 0.08;
const diskNormal = new Vec3(0, 1, 0);
const jetLength = 1.25;
const spotAngle = 0.15;
const streamRadius = 0.002;

let angle = 0;
let dTheta = -0.003;
const cos = Math.cos, sin = Math.sin;

const whiteDwarf = new RadialSymmetricBody({ radius: 2e-3 });
const accretionDisk = new AxialSymmetricBody({
    axis: diskNormal.clone().multiplyScalar(0.001),
    radius: diskRadius
});
const lowerJet = new AxialSymmetricBody({
    axis: diskNormal.clone().multiplyScalar(jetLength),
    radius: 0.025
});
const upperJet = new AxialSymmetricBody({
    axis: diskNormal.clone().multiplyScalar(-jetLength),
    radius: 0.025
});
const mainStar = new CelestialBody({ position: new Vec3(-0.2, 0, 0), radius: 0.185 });
const rocheBulge1 = new RadialSymmetricBody({ radius: 0.088 });
const rocheBulge2 = new RadialSymmetricBody({ radius: 0.049 });

const initialDStart = 0.05 - rocheBulge2.radius + 0.01;
const initialStreamStart = new Vec3(-initialDStart, 0, 0);
const initialStreamEnd = new Vec3(whiteDwarfDistance - diskRadius * cos(spotAngle), 0, diskRadius * sin(spotAngle));
const stream = new AxialSymmetricBody({
    position: initialStreamStart,
    axis: initialStreamEnd.sub(initialStreamStart),
    radius: streamRadius
});

const whiteDwarfLight1 = new PointLight(0xcc66ff, 1.25, 0.45);
const whiteDwarfLight2 = new PointLight(0xcc66ff, 1.25, 0.45);

const jetOffset = new Vec3(0, jetLength, 0);
function updateSystem() {
    angle += dTheta;

    const whiteDwarfPosition = new Vec3(cos(angle), 0, sin(angle)).multiplyScalar(whiteDwarfDistance);
    whiteDwarf.position.copy(whiteDwarfPosition);
    accretionDisk.position.copy(whiteDwarfPosition);
    lowerJet.position.copy(whiteDwarfPosition).sub(jetOffset);
    upperJet.position.copy(whiteDwarfPosition).add(jetOffset);

    const orbitingPosition = distance => new Vec3(cos(angle), 0, sin(angle)).multiplyScalar(distance);
    mainStar.position.copy(orbitingPosition(-0.2));
    rocheBulge1.position.copy(orbitingPosition(-0.09));
    rocheBulge2.position.copy(orbitingPosition(-0.05));

    const dStart = 0.05 - rocheBulge2.radius + 0.01;
    const streamStart = new Vec3(cos(angle), 0, sin(angle)).multiplyScalar(-dStart);
    const streamEnd = whiteDwarfPosition.clone()
        .sub(new Vec3(cos(angle - spotAngle), 0, sin(angle - spotAngle)).multiplyScalar(diskRadius));

    stream.position.copy(streamStart);
    stream.axis.copy(streamEnd.sub(streamStart));

    whiteDwarfLight1.position.set(whiteDwarfPosition.x, whiteDwarfPosition.y + .01, whiteDwarfPosition.z);
    whiteDwarfLight2.position.set(whiteDwarfPosition.x, whiteDwarfPosition.y - .01, whiteDwarfPosition.z);
}

const material = () => new MeshPhongMaterial({ transparent: false, roughness: 0.6, metalness: 0.2 });
Simulation
    .with({
        htmlDivId: 'xrayBinaryContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: { position: new Vec3(0.3, 0.6, -1.5), fieldOfView: 40 },
        infoPanel: {
            text: '<strong>🔮 X-ray binary</strong><br/>Matter from the red giant is spilling through the ' +
                '<a href=\"https://en.wikipedia.org/wiki/Roche_lobe\">Roche lobe</a> ' +
                'onto the collapsed star, via a hot spot and an accretion disk.'
        },
        scene: { background: ThreeJsScene.Background.STARS }
    })
    .bind(whiteDwarf.alwaysWith(new Sphere({
        color: new Colour(0xcc66ff),
        material: new MeshBasicMaterial({ color: 0xcc66ff }),
        glowIntensity: 0.5,
        glowColor: new Colour(0xd3b6aa),
        glowRadius: 50
    })))
    .bind(accretionDisk.alwaysWith(new Cylinder({ color: new Colour(0xd3b644), opacity: 0.55 })))
    .bind(lowerJet.alwaysWith(new Cone({ color: new Colour(0xeeee44), opacity: 0.1 })))
    .bind(upperJet.alwaysWith(new Cone({ color: new Colour(0xeeee44), opacity: 0.1 })))
    .bind(mainStar.alwaysWith(new Sphere({
        material: material(),
        color: new Colour(0xff7700),
        segments: 128
    })))
    .bind(rocheBulge1.alwaysWith(new Sphere({ material: material(), color: new Colour(0xff7700), opacity: 0.85, segments: 64 })))
    .bind(rocheBulge2.alwaysWith(new Sphere({ material: material(), color: new Colour(0xff7700), opacity: 0.9, segments: 64 })))
    .bind(stream.alwaysWith(new Cylinder({
        color: new Colour(0xb3e666),
        opacity: 0.8,
        radiusFunction: body => body.radius,
        material: new MeshBasicMaterial({
            transparent: true,
            opacity: 0.8,
            side: DoubleSide,
            depthWrite: false
        })
    })))
    .addObject3D(whiteDwarfLight1)
    .addObject3D(whiteDwarfLight2)
    .append(new Slider('Orbital speed')
        .withUnits(' rad/frame')
        .withRange(new Range(0, 10, .1))
        .withValue(-dTheta * 1e3)
        .onInput(value => dTheta = -value * 1e-3))
    .runsEvery(1 / 60)
    .onStep(updateSystem)
    .start();