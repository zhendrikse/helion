import { MeshStandardMaterial } from 'three';
import {Colour, ImplicitSurface, ImplicitSurfaceView, Simulation, Vec3} from '../../../src/index.js';

const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;

const sphere = new ImplicitSurface({
    func: (x, y, z) => sin(x) * cos(y) + sin(y) * cos (z) + sin(z) * cos(x),
    min: new Vec3(-2 * PI, -2 * PI, -2 * PI),
    max: new Vec3(2 * PI, 2 * PI, 2 * PI)
});

const surfaceView = new ImplicitSurfaceView({
    resolution: 36,
    maxPolyCount: 30000,
    color: new Colour(0x4f9bd8),
    opacity: 0.9,
    material: new MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.1
    })
});

const simulation = Simulation
    .with({
        htmlDivId: 'implicitSurfacesContainer',
        headUpDisplay: { enabled: false },
        camera: { fieldOfView: 35 },
        infoPanel: {
            text: '<strong>🪩 Implicit surfaces</strong><br/>' +
                '• Based on the <a href=\"https://en.wikipedia.org/wiki/Marching_cubes\">marching cubes</a> algorithm ' +
                ' provided by the <a href=\"https://threejs.org\">Three.js</a> library.'
        }
    })
    .setLatexTitle('\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x)')
    .bind(sphere.onceWith(surfaceView))
    .provideAxesAround(surfaceView)
    .frameSceneOn(surfaceView, { padding: 0.9 })
    .start();