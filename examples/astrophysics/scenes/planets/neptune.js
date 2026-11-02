import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Neptune } from "../../../../src/index.js";
import { AmbientLight } from "three";

const neptune = Planets.neptune;
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
                `• Mass: ${neptune.mass} kg<br/> • Radius: ${neptune.radius} m<br/>` +
                `• Tilt: ${radToDeg(neptune.tilt)}°<br/> • Spin: ${radToDeg(neptune.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(neptune.inclination)}°<br/> • Semi-major axis: ${neptune.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${neptune.eccentricity}<br/> • Right ascension: ${radToDeg(neptune.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(neptune.alwaysWith(new Neptune()))
    .onFrame(timeStamp => neptune.timeStamp = timeStamp)
    .start();
