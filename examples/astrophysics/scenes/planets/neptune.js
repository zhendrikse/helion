import {Simulation, Vec3, Neptune, ThreeJsScene, radToDeg, Planet, CelestialBody} from '../../../../src/index.js';
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from 'three';
import neptuneMap from '../../textures/neptunemap.jpg';

const neptune = new CelestialBody(Neptune);
const planetView = new Planet({
    material: new MeshPhongMaterial({
        map: Planet.loader.load(neptuneMap),
        bumpMap: Planet.loader.load(neptuneMap),
        bumpScale: 5,
        shininess: 0
    })
});

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(10, 2, 1.5);
let lastTime = performance.now() * 1e-3;
Simulation
    .with({
        htmlDivId: 'neptuneContainer',
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(2.5)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🔱 Neptune</strong><br/>` +
                '• One minute &#8792; 24 hours.<br/>' +
                '• Fourth-largest planet.<br/>\n' +
                '• Most distant planet.<br/>\n' +
                '• Deep blue color, partly due to methane in atmosphere &amp; other atmospheric factors.<br/>\n' +
                '• Approx. -200°C in its upper atmosphere.<br/>\n' +
                '• Some of the fastest planetary winds, reaching approx. 2,000 km/h.<br/>\n' +
                '• Takes approx. 165 Earth years to orbit the Sun.<br/>\n' +
                '• Its largest moon, Triton, orbits backwards relative to Neptune\'s rotation.<br/>\n' +
                '👉 Discovered through mathematical predictions before it was directly observed!<br/>'
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(neptune.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one minute simulation view
        neptune.time += dtHours;
        planetView.translation = neptune.coordinates;
    })
    .start();
