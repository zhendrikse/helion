import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Mars } from "../../../../src/index.js";
import { AmbientLight } from "three";

const mars = Planets.mars;
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
                `• Mass: ${mars.mass} kg<br/> • Radius: ${mars.radius} m<br/>` +
                `• Tilt: ${radToDeg(mars.tilt)}°<br/> • Spin: ${radToDeg(mars.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(mars.inclination)}°<br/> • Semi-major axis: ${mars.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${mars.eccentricity}<br/> • Right ascension: ${radToDeg(mars.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(mars.alwaysWith(new Mars()))
    .onFrame(timeStamp => mars.timeStamp = timeStamp)
    .start();
