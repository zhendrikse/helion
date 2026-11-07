import {Simulation, Vec3, Mars, ThreeJsScene, radToDeg, Planet, CelestialBody} from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import marsMap from '../../textures/marsmap.jpg';
import marsBumpMap from '../../textures/marsbump.jpg';

const mars = new CelestialBody(Mars);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(marsMap),
        bumpMap: Planet.loader.load(marsBumpMap),
        bumpScale: 2.5,
        shininess: 0
    })
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
let lastTime = performance.now() * 1e-3;
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
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Mars.mass} kg<br/> • Radius: ${Mars.radius} m<br/>` +
                `• Tilt: ${radToDeg(Mars.tilt)}°<br/> • Spin: ${radToDeg(Mars.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Mars.inclination)}°<br/> • Semi-major axis: ${Mars.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Mars.eccentricity}<br/> • Right ascension: ${radToDeg(Mars.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffeeee, 0.1))
    .addObject3D(sun)
    .bind(mars.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        mars.time += dtHours;
        planetView.translation = mars.coordinates;
    })
    .start();
