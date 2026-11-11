import { MeshStandardMaterial } from 'three';
import {
    Colour, TimeDependentImplicitSurface, ImplicitSurfaceView, Simulation, Vec3
} from '../../../src/index.js';

const cos = Math.cos;
const sqrt = Math.sqrt;
const PI = Math.PI;

const majorRadius = 1.2;
const minorRadius = 0.65;

const surface = new TimeDependentImplicitSurface({
    func: (x, y, z, t) => {
        // The major radius shrinks to zero at t = PI, turning the
        // torus equation continuously into the equation of a sphere.
        const R = majorRadius * (1 + cos(t)) * 0.5;
        const radialDistance = sqrt(x * x + y * y);
        return (radialDistance - R) ** 2 + z * z - minorRadius ** 2;
    },
    min: new Vec3(-2.2, -2.2, -1.4),
    max: new Vec3(2.2, 2.2, 1.4)
});

const surfaceView = new ImplicitSurfaceView({
    resolution: 48,
    maxPolyCount: 50000,
    color: new Colour(0x4f9bd8),
    opacity: 0.95,
    material: new MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.1
    })
});

Simulation
    .with({
        htmlDivId: 'timeDependentTorusSphereContainer',
        headUpDisplay: { enabled: false },
        camera: { fieldOfView: 35 },
        infoPanel: {
            text: '<strong>Torus → sphere → torus</strong><br/>' +
                'The major radius smoothly shrinks to zero and grows again.'
        }
    })
    .setLatexTitle(
        '\\left(\\sqrt{x^2+y^2}-R(t)\\right)^2+z^2-r^2=0'
    )
    .onStep((_clock, dt) => surface.advance(dt))
    .bind(surface.alwaysWith(surfaceView))
    .provideAxesAround(surfaceView)
    .frameSceneOn(surfaceView, { padding: 0.9 })
    .start();
