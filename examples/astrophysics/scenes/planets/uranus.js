import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, RingsPlanet, Planet } from "../../../../src/index.js";
import { AmbientLight, MeshPhongMaterial } from "three";
import uranusMap from '../../textures/uranusmap.jpg';
import uranusRingsColorUrl from '../../textures/uranusringcolour.jpg';
import uranusRingsPatternUrl from '../../textures/uranusringtrans.gif';

const uranus = new CelestialBody({
    name: 'uranus',
    a: 2876679082.,
    e: 0.044405586,
    inclination: 0.77 * Math.PI / 180.,
    rightAscension: 1.2908891856,
    meanAnomaly: 2.4950479462,
    radius: 25600. * 1E3,
    mass: 8.68103E25,
    tilt: 98 * Math.PI / 180.,
    spin: -2 * Math.PI / 17.24
});

Simulation
    .with({
        htmlDivId: "uranusContainer",
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(4) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>❄️ Uranus</strong><br/>` +
                `• Mass: ${uranus.mass} kg<br/> • Radius: ${uranus.radius} m<br/>` +
                `• Tilt: ${radToDeg(uranus.tilt)}°<br/> • Spin: ${radToDeg(uranus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(uranus.inclination)}°<br/> • Semi-major axis: ${uranus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${uranus.eccentricity}<br/> • Right ascension: ${radToDeg(uranus.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(uranus.alwaysWith(new RingsPlanet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(uranusMap),
            bumpMap: Planet.loader.load(uranusMap),
            bumpScale: 0.05,
            shininess: 0
        }),
        innerRadius: 1.55,
        outerRadius: 2.05,
        divisor: 2,
        ringsColorUrl: uranusRingsColorUrl,
        ringsPatternUrl: uranusRingsPatternUrl
    })))
    .onFrame(timeStamp => uranus.time = timeStamp)
    .start();
