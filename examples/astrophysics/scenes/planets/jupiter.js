import {
    Simulation,
    Vec3,
    Jupiter,
    ThreeJsScene,
    radToDeg,
    Planet,
    CelestialBody,
    Renderable
} from '../../../../src/index.js';
import { AmbientLight, DirectionalLight, MeshPhongMaterial} from 'three';
import jupiterMap from '../../textures/jupitermap.jpg';

const jupiter = new CelestialBody(Jupiter);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Renderable.loadTexture(jupiterMap),
        bumpMap: Renderable.loadTexture(jupiterMap),
        bumpScale: 2,
        shininess: 0
    })
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 0.5);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: 'jupiterContainer',
        camera: { fieldOfView: 45, position: new Vec3(.7, 1.19, 2.8) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌪️ Jupiter</strong><br/>` +
                '• One minute &#8792; 24 hours.<br/>' +
                '• It is the largest planet.<br/>' +
                '• More mass than 2 x the combined mass of all other planets.<br/>' +
                '• Consists primarily hydrogen and helium.<br/>' +
                '• The Great Red Spot is a gigantic storm that has lasted for centuries.<br/>' +
                '• Has a large family of moons, including Europa, Ganymede and Io.<br/>' +
                '• Has an extremely powerful magnetic field.<br/>' +
                '👉 Moon Ganymede is larger than Mercury!'
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 7.5e-2))
    .addObject3D(sun)
    .bind(jupiter.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        jupiter.time += dtHours;
        planetView.translation = jupiter.coordinates;
    })
    .start();
