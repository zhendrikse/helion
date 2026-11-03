import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import { AmbientLight, DirectionalLight, MeshPhongMaterial } from "three";
import venusMap from '../../textures/venusmap.jpg';
import venusBumpMap from '../../textures/venusbump.jpg';

const venus = new CelestialBody({
    name: 'venus',
    a: 108208000.,
    e: 0.0067,
    inclination: 3.39 * Math.PI / 180.,
    rightAscension: 1.3381895772,
    meanAnomaly: 0.8746717546,
    radius: 6051.8 * 1e3,
    mass: 4.8685e+23,
    tilt: 177 * Math.PI / 180.,
    spin:  -2 * Math.PI / 2802.
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 2.5);
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
                `• Mass: ${venus.mass} kg<br/> • Radius: ${venus.radius} m<br/>` +
                `• Tilt: ${radToDeg(venus.tilt)}°<br/> • Spin: ${radToDeg(venus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(venus.inclination)}°<br/> • Semi-major axis: ${venus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${venus.eccentricity}<br/> • Right ascension: ${radToDeg(venus.rightAscension)}°`
        }
    })
    .addObject3D(sun)
    .addObject3D(new AmbientLight(0xffffff, 7.5e-2))
    .bind(venus.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(venusMap),
            bumpMap: Planet.loader.load(venusBumpMap),
            bumpScale: 1,
            shininess: 0
        })
    })))
    .onFrame(timeStamp => venus.time = timeStamp)
    .start();
