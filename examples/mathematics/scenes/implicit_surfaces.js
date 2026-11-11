import { MeshStandardMaterial } from 'three';
import {
    Checkbox,
    Colour, ImplicitSurface, ImplicitSurfaceView, Simulation, Vec3
} from '../../../src/index.js';

const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;

const majorRadius = 1.35;
const minorRadius = 0.65;

const radialDistance = (x, y) => Math.hypot(x, y);
// const surface = new ImplicitSurface({
//     func: (x, y, z, t) => {
//         // The major radius shrinks to zero at t = PI, turning the
//         // torus equation continuously into the equation of a sphere.
//         const R = majorRadius * (1 + cos(t)) * 0.5;
//         return (radialDistance(x, y) - R) ** 2 + z * z - minorRadius ** 2;
//     },
//     min: new Vec3(-2.25, -2.25, -1.4),
//     max: new Vec3(2.25, 2.25, 1.4)
// });

const surface = new ImplicitSurface({
    func: (x, y, z, t) =>
        sin(x) * cos(y) + sin(y) * cos(z) + sin(z) * cos(x) - 0.5 * sin(t),
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

let animate = false;
Simulation
    .with({
        htmlDivId: 'implicitSurfacesContainer',
        headUpDisplay: { enabled: false },
        viewport: { parameterMenuCollapsed: false },
        camera: { fieldOfView: 35 },
        infoPanel: {
            text: '<strong>🪩 Implicit surfaces</strong><br/>' +
                '• Based on the <a href=\"https://en.wikipedia.org/wiki/Marching_cubes\">marching cubes</a> algorithm ' +
                ' provided by the <a href=\"https://threejs.org\">Three.js</a> library.<br/>' +
                '• Isosurfaces may even be time-dependent!'
        }
    })
    .append(new Checkbox('Animate').onChange(checked => animate = checked ))
    .setLatexTitle('\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x) - \\frac12\\sin(t) = 0')
    .onStep((_clock, dt) => surface.time += animate ? dt : 0)
    .bind(surface.alwaysWith(surfaceView))
    .provideAxesAround(surfaceView)
    .frameSceneOn(surfaceView, { padding: 1, viewDirection: new Vec3(1, 0.8, 1) })
    .start();