import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Saturn } from "../../../../src/index.js";
import { AmbientLight } from "three";

const saturn = Planets.saturn;
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
    .addObject3D(new AmbientLight(0xffffff, 1.5))
    .bind(saturn.alwaysWith(new Saturn()))
    .onFrame(timeStamp => saturn.timeStamp = timeStamp)
    .start();
