import {
    AmbientLight, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, Vector3
} from 'three';
import {
    Colour, Cone, Range, RadialSymmetricBody, Simulation, Slider, Sphere, ThreeJsScene, Vec3, AxialSymmetricBody
} from '../../../src/index.js';

const cameraForward = new Vec3(0.2, 0.6, -1).normalize();
const cameraPosition = cameraForward.clone().multiplyScalar(-3.5);

let theta = 0;
let dTheta = 0.03;
function updatePulsar() {
    theta += dTheta;
    const beamPosition = new Vec3(beamLength * Math.cos(theta), beamLength * Math.sin(theta), beamOffset);

    beam1.position.copy(beamPosition);
    beam1.axis.copy(beamPosition.clone().multiplyScalar(-1));
    beam2.position.copy(beamPosition.clone().multiplyScalar(-1));
    beam2.axis.copy(beamPosition);

    const direction = beam1.axis.clone().normalize();
    const cosine = Math.max(-1, Math.min(1, direction.dot(cameraForward)));
    const angle = Math.acos(cosine);

    // Keep the original narrow pulse: only when the rotating beam points almost
    // directly toward the observer does the scene flare brightly.
    beam1.opacity = Math.max(0, 0.8 * Math.cos(angle));
    const isFlashing = angle < 0.05;
    flare.visible = isFlashing;
    ambientLight.intensity = isFlashing ? 1.0 : 0.2;
    beamLight1.intensity = isFlashing ? 8 : 1.5;
    beamLight2.intensity = isFlashing ? 4 : 1.5;
    beamLight1.position.copy(beamPosition).multiplyScalar(5e-3);
    beamLight2.position.copy(beamPosition).multiplyScalar(-5e-3);
}

const neutronStar = new RadialSymmetricBody({
    position: new Vec3(0, 0, 0),
    radius: 0.1
});
const beam1 = new AxialSymmetricBody();
const beam2 = new AxialSymmetricBody();

// A camera-facing translucent plane gives the brief flash a visible screen-wide
// component, as in the original VPython box used for the flare.
const flareMaterial = new MeshBasicMaterial({
    color: 0xff33ff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide
});
const flare = new Mesh(new PlaneGeometry(10, 10), flareMaterial);
const flareNormal = new Vector3(-cameraForward.x, -cameraForward.y, -cameraForward.z);
flare.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), flareNormal);
flare.position.set(-cameraForward.x * 0.9, -cameraForward.y * 0.9, -cameraForward.z * 0.9);
flare.visible = false;
flare.renderOrder = 1;

const ambientLight = new AmbientLight(0xffffff, 0.2);
const beamLight1 = new PointLight(0xff33ff, 1.5, 12);
const beamLight2 = new PointLight(0xff33ff, 1.5, 12);
const beamLength = 20;
const beamOffset = 1.575 * beamLength; // Makes the beam pass right through our field of view

Simulation.with({
    htmlDivId: 'pulsarContainer',
    viewport: { aspectRatio: '16 / 9' },
    camera: {
        position: cameraPosition,
        target: new Vec3(0, 0, 0),
        fieldOfView: 50,
        controls: true
    },
    scene: { background: ThreeJsScene.Background.STARS },
    lighting: { enabled: true, shadows: false }
})
    .bind(neutronStar.alwaysWith(new Sphere({
        color: new Colour(0x777777),
        segments: 32
    })))
    .bind(beam1.alwaysWith(new Cone({
        color: new Colour(0x8070ff),
        opacity: 0.3,
        width: 1
    })))
    .bind(beam2.alwaysWith(new Cone({
        color: new Colour(0x8070ff),
        opacity: 0.1,
        width: 1
    })))
    .addObject3D(ambientLight)
    .addObject3D(beamLight1)
    .addObject3D(beamLight2)
    .addObject3D(flare)
    .append(new Slider('Animation speed')
        .withUnits(' rad/frame')
        .withRange(new Range(0.01, 0.1, 0.01))
        .withValue(dTheta)
        .onInput(value => dTheta = value))
    .runsEvery(1/60)
    .onStep(updatePulsar)
    .start();
