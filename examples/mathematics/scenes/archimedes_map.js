import {
    Simulation, ParametricSurface, Domain, SurfaceVisualization, SurfaceResolution, Vec3, Planet
} from '../../../src/index.js';
import {AmbientLight, DirectionalLight, MeshPhongMaterial, SRGBColorSpace} from 'three';
import earthMap from '../../astrophysics/textures/Solarsystemscope_texture_2k_earth_daymap.jpg';
import earthBumpMap from '../../astrophysics/textures/earthbump1k.jpg';
import earthSpecMap from "../../astrophysics/textures/earthspec1k.jpg";

const PI = Math.PI;
const R = 1.5;
let t = 0;

const earthTexture = Planet.loader.load(earthMap);
earthTexture.colorSpace = SRGBColorSpace;

const radius = v =>  R * ((1 - t) * Math.cos(v) + t);
const surface = new ParametricSurface({
    domain: new Domain([0, 2 * PI], [-PI / 2, PI / 2]),
    x: (u, v) => radius(v) * Math.cos(u),
    y: (u, v) => -radius(v) * Math.sin(u),
    z: (_u, v) => -R * Math.sin(v)
});

const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(192, 96),
    material: new MeshPhongMaterial({
        map: earthTexture,
        bumpMap: Planet.loader.load(earthBumpMap),
        specularMap: Planet.loader.load(earthSpecMap),
        bumpScale: 5
    }),
    vertexColors: false
});

const directionalLight = new DirectionalLight(0xffffff, 2);
directionalLight.position.set(0, 5, 5);

Simulation
    .with({
        htmlDivId: 'archimedesMapContainer',
        headUpDisplay: { enabled: false },
        camera: { fieldOfView: 35, position: new Vec3(0, 2.75, 6.5) },
        lighting: { enabled: false },
        infoPanel: {
            text: '<Strong>Archimedes equiareal map</strong><br/>' +
                '📌 A mathematical projection or mapping derived from Archimedes\' work ' +
                '<a href=\"https://en.wikipedia.org/wiki/On_the_Sphere_and_Cylinder\">On the Sphere and the Cylinder</a>, ' +
                ' in which regions on a sphere are mapped onto a cylindrical surface while preserving equal areas.'
        }
    })
    .addObject3D(directionalLight)
    .addObject3D(new AmbientLight(0xffffff, 0.2))
    .bind(surface.alwaysWith(surfaceView))
    .onStep(clock => {
        t = (Math.sin(clock.simulatedTime * 0.5) + 1) / 2;
        surfaceView.rotation.y = clock.simulatedTime * 0.1;
    })
    .start();