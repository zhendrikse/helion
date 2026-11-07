import {Simulation, Vec3, Venus, ThreeJsScene, radToDeg, Planet, CelestialBody } from "../../../../src/index.js";
import { AmbientLight, DirectionalLight, MeshPhongMaterial } from "three";
import venusMap from '../../textures/venusmap.jpg';
import venusBumpMap from '../../textures/venusbump.jpg';

const venus = new CelestialBody(Venus);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(venusMap),
        bumpMap: Planet.loader.load(venusBumpMap),
        bumpScale: 1,
        shininess: 0
    })
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: "venusContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>♀️ Venus</strong><br/>` +
                '• One second simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Venus.mass} kg<br/> • Radius: ${Venus.radius} m<br/>` +
                `• Tilt: ${radToDeg(Venus.tilt)}°<br/> • Spin: ${radToDeg(Venus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Venus.inclination)}°<br/> • Semi-major axis: ${Venus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Venus.eccentricity}<br/> • Right ascension: ${radToDeg(Venus.rightAscension)}°`
        }
    })
    .addObject3D(sun)
    .addObject3D(new AmbientLight(0xffffff, 4e-2))
    .bind(venus.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24; // 24 hours equal to one second simulation view
        venus.time += dtHours;
        planetView.translation = venus.coordinates;
    })
    .start();
