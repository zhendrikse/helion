import {
    Simulation, Vec3, Saturn, ThreeJsScene, radToDeg, RingsPlanet, Planet, CelestialBody
} from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import saturnRingsColorUrl from '../../textures/saturnringcolor.jpg';
import saturnRingsPatternUrl from '../../textures/saturnringpattern.gif';
import saturnMap from '../../textures/saturnmap.jpg';

const saturn = new CelestialBody(Saturn);
const planetView = new RingsPlanet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(saturnMap),
        bumpMap: Planet.loader.load(saturnMap),
        bumpScale: 7.5,
        shininess: 0
    }),
    innerRadius: 1.11,
    outerRadius: 2.1,
    divisor: 4,
    ringsColorUrl: saturnRingsColorUrl,
    ringsPatternUrl: saturnRingsPatternUrl
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);

let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: "saturnContainer",
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(.8) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🪐 Saturn</strong><br/>` +
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Saturn.mass} kg<br/> • Radius: ${Saturn.radius} m<br/>` +
                `• Tilt: ${radToDeg(Saturn.tilt)}°<br/> • Spin: ${radToDeg(Saturn.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Saturn.inclination)}°<br/> • Semi-major axis: ${Saturn.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Saturn.eccentricity}<br/> • Right ascension: ${radToDeg(Saturn.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 0.25))
    .addObject3D(sun)
    .bind(saturn.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        saturn.time += dtHours;
        planetView.translation = saturn.coordinates;
    })
    .start();
