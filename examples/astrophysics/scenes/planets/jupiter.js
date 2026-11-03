import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import jupiterMap from '../../textures/jupitermap.jpg';

const jupiter = new CelestialBody({
    name: 'jupiter',
    a: 778547200.,
    e: 0.048775,
    inclination: 1.31 * Math.PI / 180.,
    rightAscension: 1.7504400393,
    meanAnomaly: 0.3284360586,
    radius: 71400. * 1e3,
    mass: 1.89813e+27,
    tilt: 3 * Math.PI / 180.,
    spin: 2 * Math.PI / 9.93
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 0.5);
Simulation
    .with({
        htmlDivId: "jupiterContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(.7)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌪️ Jupiter</strong><br/>` +
                `• Mass: ${jupiter.mass} kg<br/> • Radius: ${jupiter.radius} m<br/>` +
                `• Tilt: ${radToDeg(jupiter.tilt)}°<br/> • Spin: ${radToDeg(jupiter.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(jupiter.inclination)}°<br/> • Semi-major axis: ${jupiter.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${jupiter.eccentricity}<br/> • Right ascension: ${radToDeg(jupiter.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 7.5e-2))
    .addObject3D(sun)
    .bind(jupiter.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(jupiterMap),
            bumpMap: Planet.loader.load(jupiterMap),
            bumpScale: 0.02,
            shininess: 0
        })
    })))
    .onFrame(timeStamp => jupiter.time = timeStamp)
    .start();
