import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import neptuneMap from '../../textures/neptunemap.jpg';

const neptune = new CelestialBody({
    name: 'neptune',
    a: 4503443661.,
    e: 0.011214269,
    inclination: 1.77 * Math.PI / 180.,
    rightAscension: 2.3001058656,
    meanAnomaly: 4.6734206826,
    radius: 24300. * 1E3,
    mass: 1.024E26,
    tilt: 30 * Math.PI / 180.,
    spin: 2 * Math.PI / 16.11,
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
Simulation
    .with({
        htmlDivId: "neptuneContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(2.5)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🔱 Neptune<strong><br/>` +
                `• Mass: ${neptune.mass} kg<br/> • Radius: ${neptune.radius} m<br/>` +
                `• Tilt: ${radToDeg(neptune.tilt)}°<br/> • Spin: ${radToDeg(neptune.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(neptune.inclination)}°<br/> • Semi-major axis: ${neptune.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${neptune.eccentricity}<br/> • Right ascension: ${radToDeg(neptune.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(neptune.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(neptuneMap),
            bumpMap: Planet.loader.load(neptuneMap),
            bumpScale: 0.05,
            shininess: 0
        })
    })))
    .onFrame(timeStamp => neptune.time = timeStamp)
    .start();
