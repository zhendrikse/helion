import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Venus } from "../../../../src/index.js";
import { AmbientLight } from "three";

const venus = Planets.venus;
Simulation
    .with({
        htmlDivId: "venusContainer",
        camera: {
            fieldOfView: 45,
            position: new Vec3(1, 1.5, 4).multiplyScalar(6)
        },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-6 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>♀️ Venus</strong><br/>` +
                `• Mass: ${venus.mass} kg<br/> • Radius: ${venus.radius} m<br/>` +
                `• Tilt: ${radToDeg(venus.tilt)}°<br/> • Spin: ${radToDeg(venus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(venus.inclination)}°<br/> • Semi-major axis: ${venus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${venus.eccentricity}<br/> • Right ascension: ${radToDeg(venus.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(venus.alwaysWith(new Venus()))
    .onFrame(timeStamp => venus.timeStamp = timeStamp)
    .start();
