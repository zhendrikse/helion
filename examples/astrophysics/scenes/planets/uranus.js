import { Simulation, Vec3, Planets, ThreeJsScene, radToDeg, Uranus } from "../../../../src/index.js";
import { AmbientLight } from "three";

const uranus = Planets.uranus;
Simulation
    .with({
        htmlDivId: "uranusContainer",
        camera: { fieldOfView: 45, position: new Vec3(1, 1.5, 4).multiplyScalar(4) },
        scene: { background: ThreeJsScene.Background.STARS, scale: 1e-7 },
        lighting: { enabled: false },
        headUpDisplay: { enabled: false },
        infoPanel: {
            text: `<strong>❄️ Uranus</strong><br/>` +
                `• Mass: ${uranus.mass} kg<br/> • Radius: ${uranus.radius} m<br/>` +
                `• Tilt: ${radToDeg(uranus.tilt)}°<br/> • Spin: ${radToDeg(uranus.spin)}°/h<br/>` +
                `• Inclination: ${radToDeg(uranus.inclination)}°<br/> • Semi-major axis: ${uranus.semiMajorAxis} kms<br/>` +
                `• Eccentricity: ${uranus.eccentricity}<br/> • Right ascension: ${radToDeg(uranus.rightAscension)}°`
        }
    })
    .addObject3D(new AmbientLight(0xffffff, 1))
    .bind(uranus.alwaysWith(new Uranus()))
    .onFrame(timeStamp => uranus.timeStamp = timeStamp)
    .start();
