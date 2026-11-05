import { Simulation, Vec3, Neptune, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import {AmbientLight, DirectionalLight, MeshPhongMaterial} from "three";
import neptuneMap from '../../textures/neptunemap.jpg';

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
                '• One minute simulation time &#8792; 24 hours<br/>' +
                `• Mass: ${Neptune.mass} kg<br/> • Radius: ${Neptune.radius} m<br/>` +
                `• Tilt: ${radToDeg(Neptune.tilt)}°<br/> • Spin: ${radToDeg(Neptune.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(Neptune.inclination)}°<br/> • Semi-major axis: ${Neptune.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${Neptune.eccentricity}<br/> • Right ascension: ${radToDeg(Neptune.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, .1))
    .addObject3D(sun)
    .bind(Neptune.alwaysWith(planetView))
    .onFrame(timeStamp => {
        const deltaSeconds = (timeStamp - lastTime) * .001;
        lastTime = timeStamp;
        const dtHours = deltaSeconds * 24 / 60; // 24 hours equal to one second simulation view
        Neptune.time += dtHours;
        planetView.translation = Neptune.coordinates;
    })
    .start();
