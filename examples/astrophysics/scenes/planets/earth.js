import { Simulation, Vec3, CelestialBody, ThreeJsScene, radToDeg, Planet } from "../../../../src/index.js";
import { AmbientLight, MeshPhongMaterial, Color } from "three";
import earthMap from '../../textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthBumpMap from '../../textures/earthbump1k.jpg';

const earth = new CelestialBody({
    name: 'earth',
    a: 149598261.,
    e: 0.01671123,
    inclination: 0.,
    rightAscension: 0.,
    meanAnomaly: 6.2398515744,
    radius: 6371010, // meters
    mass: 5.97219e+24,
    spin: 2 * Math.PI / 24.,
    tilt: 23 * Math.PI / 180
});

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
    .bind(earth.alwaysWith(new Planet({
        material: new MeshPhongMaterial({
            map: Planet.loader.load(earthMap),
            bumpMap: Planet.loader.load(earthBumpMap),
            bumpScale: 0.05,
            specular: new Color('grey'),
            shininess: 0
        })
    })))
    .onFrame(timeStamp => earth.time = timeStamp)
    .start();
