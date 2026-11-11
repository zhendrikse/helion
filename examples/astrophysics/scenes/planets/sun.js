import {
    Simulation, Vec3, SunView, ThreeJsScene, CelestialBody
} from '../../../../src/index.js';

const sun = new CelestialBody();
Simulation
    .with({
        htmlDivId: 'sunContainer',
        headUpDisplay: { enabled: false },
        camera: {
            position: new Vec3(5, 7.5, 15).multiplyScalar(.3),
            fieldOfView: 45
        },
        infoPanel: {
            text: '<strong>🔆 Sun</strong><br/>• Based on code in <a href=\'https://sangillee.com/2024-02-16-how-to-create-the-solar-system/\">How to Create the Solar System</a>) by Sangil Lee<br/>'
        },
        scene: { background: ThreeJsScene.Background.STARS }
    })
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(clockTime => sun.time = clockTime)
    .start();
