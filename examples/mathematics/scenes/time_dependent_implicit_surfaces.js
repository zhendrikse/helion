import { MeshStandardMaterial } from 'three';
import {
    Colour, TimeDependentImplicitSurface, ImplicitSurfaceView, Simulation, Vec3
} from '../../../src/index.js';

const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;

const surface = new TimeDependentImplicitSurface({
    func: (x, y, z, t) =>
        sin(x) * cos(y) +
        sin(y) * cos(z) +
        sin(z) * cos(x) -
        0.45 * sin(t),
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

Simulation
    .with({
        htmlDivId: 'timeDependentImplicitSurfacesContainer',
        headUpDisplay: { enabled: false },
        camera: { fieldOfView: 35 },
        infoPanel: {
            text: '<strong>🪩 Time-dependent implicit surface</strong><br/>' +
                'The isosurface changes as the simulation time advances.'
        }
    })
    .setLatexTitle(
        '\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x) - 0.45\\sin(t) = 0'
    )
    .onStep((_clock, dt) => surface.advance(dt))
    .bind(surface.alwaysWith(surfaceView))
    .provideAxesAround(surfaceView)
    .frameSceneOn(surfaceView, { padding: 0.9 })
    .start();
