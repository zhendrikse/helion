import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import { AmbientLight, DirectionalLight, MeshPhongMaterial } from "three";
import mercuryMap from "../../textures/mercurymap.jpg";
import mercuryBumpMap from "../../textures/mercurybump.jpg";

const mercury = new CelestialBody({
    name: 'mercury',
    a: 57909050.,
    e: 0.205630,
    inclination: 7 * Math.PI / 180.,
    rightAscension: 0.8436854966,
    meanAnomaly: 3.0507657193,
    radius: 2439.7 * 1e3,
    mass: 3.302e+23,
    tilt: 0.1 * Math.PI / 180.,
    spin: 2 * Math.PI / 4222.6
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 2.5);
Simulation
    .with({
        htmlDivId: "mercuryContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌕 Mercury</strong><br/>` +
                `• Mass: ${mercury.mass} kg<br/> • Radius: ${mercury.radius} m<br/>` +
                `• Tilt: ${radToDeg(mercury.tilt)}°<br/> • Spin: ${radToDeg(mercury.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(mercury.inclination)}°<br/> • Semi-major axis: ${mercury.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${mercury.eccentricity}<br/> • Right ascension: ${radToDeg(mercury.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(mercury.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(mercuryMap),
            bumpMap: Planet.loader.load(mercuryBumpMap),
            bumpScale: 0.005,
            shininess: 0
        })
    })))
    .onFrame(timeStamp => mercury.time = timeStamp)
    .start();
