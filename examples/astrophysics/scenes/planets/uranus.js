import {
    Simulation, Vec3, Uranus, ThreeJsScene, radToDeg, RingsPlanet, Planet, CelestialBody
} from '../../../../src/index.js';
import { AmbientLight, DirectionalLight, MeshPhongMaterial} from 'three';
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
        htmlDivId: 'uranusContainer',
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(4) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>❄️ Uranus</strong><br/>` +
                '• One minute &#8792; 24 hours.<br/>' +
                '• Third-largest planet.<br/>\n' +
                '• Pale blue-green due to methane in its atmosphere.<br/>\n' +
                '• Rotates almost on its side, (tilt &#8792; 98°).<br/>\n' +
                '• Upper atmosphere approx -224°C: coldest planetary atmosphere in our solar system.<br/>\n' +
                '• Has 13 known rings and 28 moons.<br/>\n' +
                '👉 Because of its extreme tilt, parts of Uranus experience approx. 42 years of continuous sunlight followed by 42 years of darkness.<br/>'
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(uranus.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        uranus.time += dtHours;
        planetView.translation = uranus.coordinates;
    })
    .start();
