import {Simulation, Vec3, Jupiter, ThreeJsScene, radToDeg, Planet, CelestialBody} from '../../../../src/index.js';
import { AmbientLight, DirectionalLight, MeshPhongMaterial} from 'three';
import jupiterMap from '../../textures/jupitermap.jpg';

const jupiter = new CelestialBody(Jupiter);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(jupiterMap),
        bumpMap: Planet.loader.load(jupiterMap),
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
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(.7)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌪️ Jupiter</strong><br/>` +
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Jupiter.mass} kg<br/> • Radius: ${Jupiter.radius} m<br/>` +
                `• Tilt: ${radToDeg(Jupiter.tilt)}°<br/> • Spin: ${radToDeg(Jupiter.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Jupiter.inclination)}°<br/> • Semi-major axis: ${Jupiter.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Jupiter.eccentricity}<br/> • Right ascension: ${radToDeg(Jupiter.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 7.5e-2))
    .addObject3D(sun)
    .bind(jupiter.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one second simulation view
        jupiter.time += dtHours;
        planetView.translation = jupiter.coordinates;
    })
    .start();
