import { DoubleSide, MeshBasicMaterial, PointLight } from 'three';
import {
    AxialSymmetricBody, Colour, Cylinder, Range, RadialSymmetricBody,
    Simulation, Slider, Sphere, ThreeJsScene, Vec3
} from '../../../src/index.js';

const cameraForward = new Vec3(0.2, 0.6, -1).normalize();
const cameraPosition = cameraForward.clone().multiplyScalar(-1.35);

const whiteDwarfDistance = 0.12;
const diskRadius = 0.08;
const spotAngle = 0.15;
const streamRadius = 0.002;

let angle = 0;
let dTheta = -0.003;

const whiteDwarf = new RadialSymmetricBody({
    position: new Vec3(whiteDwarfDistance, 0, 0),
    radius: 0.002
});
const accretionDisk = new AxialSymmetricBody({
    position: whiteDwarf.position.clone(),
    axis: new Vec3(0, 0.002, 0),
    radius: diskRadius
});
const mainStar = new RadialSymmetricBody({
    position: new Vec3(-0.2, 0, 0),
    radius: 0.185
});
const rocheBulge1 = new RadialSymmetricBody({
    position: new Vec3(-0.09, 0, 0),
    radius: 0.085
});
const rocheBulge2 = new RadialSymmetricBody({
    position: new Vec3(-0.05, 0, 0),
    radius: 0.049
});

const initialDStart = 0.05 - rocheBulge2.radius + 0.01;
const initialStreamStart = new Vec3(-initialDStart, 0, 0);
const initialStreamEnd = new Vec3(whiteDwarfDistance - diskRadius * Math.cos(spotAngle), 0, diskRadius * Math.sin(spotAngle));
const stream = new AxialSymmetricBody({
    position: initialStreamStart,
    axis: initialStreamEnd.sub(initialStreamStart),
    radius: streamRadius
});

const whiteDwarfLight1 = new PointLight(0xcc66ff, 1.8, 0.45);
const whiteDwarfLight2 = new PointLight(0xcc66ff, 1.8, 0.45);

function updateSystem() {
    angle += dTheta;

    const whiteDwarfPosition = new Vec3(
        whiteDwarfDistance * Math.cos(angle),
        0,
        whiteDwarfDistance * Math.sin(angle)
    );
    whiteDwarf.position.copy(whiteDwarfPosition);
    accretionDisk.position.copy(whiteDwarfPosition);

    const orbitingPosition = distance => new Vec3(
        distance * Math.cos(angle),
        0,
        distance * Math.sin(angle)
    );
    mainStar.position.copy(orbitingPosition(-0.2));
    rocheBulge1.position.copy(orbitingPosition(-0.09));
    rocheBulge2.position.copy(orbitingPosition(-0.05));

    const dStart = 0.05 - rocheBulge2.radius + 0.01;
    const streamStart = new Vec3(
        -dStart * Math.cos(angle),
        0,
        -dStart * Math.sin(angle)
    );
    const streamEnd = whiteDwarfPosition.clone().sub(new Vec3(
        diskRadius * Math.cos(angle - spotAngle),
        0,
        diskRadius * Math.sin(angle - spotAngle)
    ));
    stream.position.copy(streamStart);
    stream.axis.copy(streamEnd.sub(streamStart));

    whiteDwarfLight1.position.copy(whiteDwarfPosition).add(new Vec3(0, 0.01, 0));
    whiteDwarfLight2.position.copy(whiteDwarfPosition).sub(new Vec3(0, 0.01, 0));
}

const streamMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
    depthWrite: false
});

Simulation.with({
    htmlDivId: 'xrayBinaryContainer',
    viewport: { aspectRatio: '16 / 9' },
    camera: {
        position: cameraPosition,
        target: new Vec3(0, 0, 0),
        fieldOfView: 50,
        controls: true
    },
    infoPanel: {
        text: '<strong>🌌 X-ray binary</strong><br/>Original idea: <a href="https://www.mso.anu.edu.au/pfrancis/simulations/XRB.py">XRB.py</a> by <a href="https://www.mso.anu.edu.au/pfrancis/simulations/">Paul Francis</a><br/>Helion port based on <a href="https://github.com/zhendrikse/science/blob/main/astrophysics/code/xray_binary.py">xray_binary.py</a>'
    },
    scene: { background: ThreeJsScene.Background.STARS },
    lighting: { enabled: true, shadows: false }
})
    .bind(whiteDwarf.alwaysWith(new Sphere({
        color: new Colour(0xcc66ff),
        material: new MeshBasicMaterial({ color: 0xcc66ff })
    })))
    .bind(accretionDisk.alwaysWith(new Cylinder({
        color: new Colour(0xb3e6ff),
        opacity: 0.8
    })))
    .bind(mainStar.alwaysWith(new Sphere({
        color: new Colour(0x73401a)
    })))
    .bind(rocheBulge1.alwaysWith(new Sphere({
        color: new Colour(0x73401a),
        opacity: 0.85
    })))
    .bind(rocheBulge2.alwaysWith(new Sphere({
        color: new Colour(0x73401a),
        opacity: 0.9
    })))
    .bind(stream.alwaysWith(new Cylinder({
        color: new Colour(0xb3e6ff),
        opacity: 0.8,
        radiusFunction: body => body.radius,
        material: streamMaterial
    })))
    .addObject3D(whiteDwarfLight1)
    .addObject3D(whiteDwarfLight2)
    .append(new Slider('Orbital speed')
        .withUnits(' rad/frame')
        .withRange(new Range(-0.01, -0.001, 0.001))
        .withValue(dTheta)
        .onInput(value => dTheta = value))
    .runsEvery(1 / 60)
    .onStep(updateSystem)
    .start();
