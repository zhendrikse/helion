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
            text: '<strong>🔆 Sun</strong><br/>' +
                '📌 G2V type star (yellow dwarf).<br/>' +
                '📌 Approx. 4.6 billion years.<br/>' +
                '📌 Diameter approx. 1.39 million kilometres.<br/>' +
                '📌 Approx. 333,000 times Earth\'s mass.<br/>' +
                '📌 Surface temperature approx. 5,500°C.<br/>' +
                '📌 Core temperature approx. 15 million°C.<br/>' +
                '📌 73% hydrogen and 25% helium + some heavier elements.<br/>' +
                '📌 Approx. 28 times Earth\'s gravity.<br/>' +
                '👉 More than 1.3 million Earths could fit inside the Sun by volume!<br/>'
        },
        scene: { background: ThreeJsScene.Background.STARS }
    })
    .bind(sun.alwaysWith(new SunView()))
    .onFrame(clockTime => sun.time = clockTime)
    .start();
