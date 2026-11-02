import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Earth } from "../../../../src/index.js";
import { AmbientLight } from "three";

const earth = Planets.earth;
Simulation
    .with({
        htmlDivId: "earthContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌎 Earth</strong><br/>` +
                `• Mass: ${earth.mass} kg<br/> • Radius: ${earth.radius} m<br/>` +
                `• Tilt: ${radToDeg(earth.tilt)}°<br/> • Spin: ${radToDeg(earth.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(earth.inclination)}°<br/> • Semi-major axis: ${earth.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${earth.eccentricity}<br/> • Right ascension: ${radToDeg(earth.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(earth.alwaysWith(new Earth()))
    .onFrame(timeStamp => earth.timeStamp = timeStamp)
    .start();
