import {
    Simulation, Vec3, Uranus, ThreeJsScene, radToDeg, RingsPlanet, Planet, CelestialBody
} from "../../../../src/index.js";
import { AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import uranusMap from '../../textures/uranusmap.jpg';
import uranusRingsColorUrl from '../../textures/uranusringcolour.jpg';
import uranusRingsPatternUrl from '../../textures/uranusringtrans.gif';

const uranus = new CelestialBody(Uranus);
const planetView = new RingsPlanet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(uranusMap),
        bumpMap: Planet.loader.load(uranusMap),
        bumpScale: 5,
        shininess: 0
    }),
    innerRadius: 1.55,
    outerRadius: 2.05,
    divisor: 2,
    ringsColorUrl: uranusRingsColorUrl,
    ringsPatternUrl: uranusRingsPatternUrl
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: "uranusContainer",
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(4) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>❄️ Uranus</strong><br/>` +
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Uranus.mass} kg<br/> • Radius: ${Uranus.radius} m<br/>` +
                `• Tilt: ${radToDeg(Uranus.tilt)}°<br/> • Spin: ${radToDeg(Uranus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Uranus.inclination)}°<br/> • Semi-major axis: ${Uranus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Uranus.eccentricity}<br/> • Right ascension: ${radToDeg(Uranus.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(uranus.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one second simulation view
        uranus.time += dtHours;
        planetView.translation = uranus.coordinates;
    })
    .start();
