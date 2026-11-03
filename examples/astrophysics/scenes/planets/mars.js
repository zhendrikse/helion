import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";

import marsMap from '../../textures/marsmap.jpg';
import marsBumpMap from '../../textures/marsbump.jpg';

const mars = new CelestialBody({
    name: 'mars',
    a: 227939100.,
    e: 0.093315,
    inclination: 1.85 * Math.PI / 180.,
    rightAscension: 0.8676591934,
    meanAnomaly: 0.3378329113,
    radius: 3393.5 * 1e3,
    mass: 6.4185e+23,
    tilt: 25 * Math.PI / 180.,
    spin: 2 * Math.PI / 24.66
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
Simulation
    .with({
        htmlDivId: "marsContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>♂️ Mars</strong><br/>` +
                `• Mass: ${mars.mass} kg<br/> • Radius: ${mars.radius} m<br/>` +
                `• Tilt: ${radToDeg(mars.tilt)}°<br/> • Spin: ${radToDeg(mars.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(mars.inclination)}°<br/> • Semi-major axis: ${mars.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${mars.eccentricity}<br/> • Right ascension: ${radToDeg(mars.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffeeee, 0.1))
    .addObject3D(sun)
    .bind(mars.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(marsMap),
            bumpMap: Planet.loader.load(marsBumpMap),
            bumpScale: 2.5,
            shininess: 0
        })
    })))
    .onFrame(timeStamp => mars.time = timeStamp)
    .start();
