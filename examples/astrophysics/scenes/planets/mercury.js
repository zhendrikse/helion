import {
    Simulation, Vec3, Mercury, ThreeJsScene, Planet, CelestialBody, Renderable,
} from '../../../../src/index.js';
import { AmbientLight, DirectionalLight, MeshPhongMaterial } from 'three';
import mercuryMap from '../../textures/mercurymap.jpg';
import mercuryBumpMap from '../../textures/mercurybump.jpg';

const mercury = new CelestialBody(Mercury);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Renderable.loadTexture(mercuryMap),
        bumpMap: Renderable.loadTexture(mercuryBumpMap),
        bumpScale: 1.5,
        shininess: 0
    })
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: 'mercuryContainer',
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌕 Mercury</strong><br/>` +
                '• One second &#8792; 24 hours.<br/>' +
                '• Smallest planet in the solar system.<br/>' +
                '• Around -180°C at night and 430°C during the day.<br/>' +
                '• Orbits the Sun in just 88 Earth days.<br/>' +
                '• Covered in craters, resembling our Moon.<br/>' +
                '• About 38% of Earth\'s gravity.<br/>' +
                '👉 Despite being closest to the Sun, Venus is hotter because of its greenhouse effect.<br/>'
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .025))
    .addObject3D(sun)
    .bind(mercury.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24; // 24 hours equal to one second simulation view
        mercury.time += dtHours;
        planetView.translation = mercury.coordinates;
    })
    .start();
