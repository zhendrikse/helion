import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Mercury } from "../../../../src/index.js";
import { AmbientLight } from "three";

const mercury = Planets.mercury;
Simulation
    .with({
        htmlDivId: "mercuryContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>🌕 Mercury</strong><br/>` +
                `• Mass: ${mercury.mass} kg<br/> • Radius: ${mercury.radius} m<br/>` +
                `• Tilt: ${radToDeg(mercury.tilt)}°<br/> • Spin: ${radToDeg(mercury.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(mercury.inclination)}°<br/> • Semi-major axis: ${mercury.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${mercury.eccentricity}<br/> • Right ascension: ${radToDeg(mercury.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(mercury.alwaysWith(new Mercury()))
    .onFrame(timeStamp => mercury.timeStamp = timeStamp)
    .start();
