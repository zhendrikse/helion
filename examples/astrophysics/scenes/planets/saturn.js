import {
    Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, RingsPlanet, Planet
} from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import saturnRingsColorUrl from '../../textures/saturnringcolor.jpg';
import saturnRingsPatternUrl from '../../textures/saturnringpattern.gif';
import saturnMap from '../../textures/saturnmap.jpg';

const saturn = new CelestialBody({
    name: 'saturn',
    a: 1433449370.,
    e: 0.055723219,
    inclination: 2.49 * Math.PI / 180.,
    rightAscension: 1.98,
    meanAnomaly: 5.5911055356,
    radius: 60000. * 1e3,
    mass: 5.68319e+26,
    tilt: 27 * Math.PI / 180.,
    spin: 2 * Math.PI / 10.66
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
Simulation
    .with({
        htmlDivId: "saturnContainer",
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(.8) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🪐 Saturn</strong><br/>` +
                `• Mass: ${saturn.mass} kg<br/> • Radius: ${saturn.radius} m<br/>` +
                `• Tilt: ${radToDeg(saturn.tilt)}°<br/> • Spin: ${radToDeg(saturn.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(saturn.inclination)}°<br/> • Semi-major axis: ${saturn.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${saturn.eccentricity}<br/> • Right ascension: ${radToDeg(saturn.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 0.25))
    .addObject3D(sun)
    .bind(saturn.alwaysWith(new RingsPlanet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(saturnMap),
            bumpMap: Planet.loader.load(saturnMap),
            bumpScale: 0.05,
            shininess: 0
        }),
        innerRadius: 1.11,
        outerRadius: 2.1,
        divisor: 4,
        ringsColorUrl: saturnRingsColorUrl,
        ringsPatternUrl: saturnRingsPatternUrl
    })))
    .onFrame(timeStamp => saturn.time = timeStamp)
    .start();
