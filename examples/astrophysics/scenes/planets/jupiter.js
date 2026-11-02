import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Jupiter } from "../../../../src/index.js";
import { AmbientLight } from "three";

const jupiter = Planets.jupiter;
Simulation
    .with({
        htmlDivId: "jupiterContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(.7)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-8 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌪️ Jupiter</strong><br/>` +
                `• Mass: ${jupiter.mass} kg<br/> • Radius: ${jupiter.radius} m<br/>` +
                `• Tilt: ${radToDeg(jupiter.tilt)}°<br/> • Spin: ${radToDeg(jupiter.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(jupiter.inclination)}°<br/> • Semi-major axis: ${jupiter.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${jupiter.eccentricity}<br/> • Right ascension: ${radToDeg(jupiter.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(jupiter.alwaysWith(new Jupiter()))
    .onFrame(timeStamp => jupiter.timeStamp = timeStamp)
    .start();
