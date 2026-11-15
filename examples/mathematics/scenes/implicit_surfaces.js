import {
    Checkbox, ColorMappers, DropdownMenu, ImplicitSurface, ImplicitSurfaceView, Registry, Simulation, Vec3
} from '../../../src/index.js';

const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;

const majorRadius = 1.35;
const minorRadius = 0.5;

const surfaces = {
    'Catenoid': {
        'surface': new ImplicitSurface({
            func: (x, y, z, t) => {
                const c = t => 1.5 + .25 * Math.sin(t);
                return Math.sqrt(x * x + z * z) - c(t) * Math.cosh(y / c(t))
            },
            min: new Vec3(-3, -3, -3),
            max: new Vec3(3, 3, 3)
        }),
        'latex': '\\large{\\sqrt{x^2 + y^2} = c(t)\\cosh\\left(\\frac{z}{c(t)}\\right)}'
    },
    'Genus 2 surface': {
        'surface': new ImplicitSurface({
            func: (x, y, z, t) =>
                2 * z * (z * z - 3 * x * x) * (1 - y * y) + (x * x + z * z) * (x * x + z * z) - (9 * y * y -1) * (1 - y * y),
            min: new Vec3(-2, -1.25, -2),
            max: new Vec3(2, 1.25, 2),
            isovalue: .25
        }),
        'latex': '2z(z^2 - 3x^2)(1 - z^2) + (x^2 + z^2)^2 - (9y^2 -1)(1 - y^2)'
    },
    'Genus 8 surface': {
        'surface': new ImplicitSurface({
            func: (x, y, z, t) =>
                ((x - 1) * x * x * (x + 1) + y * y) **2 + ((y - 1) * y * y * (y + 1) + z * z) **2 + .1 * y * y + 0.05 * (y - 1) * y * y * (y + 1),
            min: new Vec3(-1.2, -.65, -.6),
            max: new Vec3(1.2, .65, .6),
            isovalue: 2.25e-2
        }),
        'latex': '((x - 1) x^2 (x + 1) + y^2)^2 + ((y - 1) y^2 (y + 1) + z^2)^2 + .1y^2 + 0.05(y - 1) y^2 (y + 1)'
    },
    'Gyroid lattice': {
        'surface': new ImplicitSurface({
            func: (x, y, z, t) =>
                sin(x) * cos(y) + sin(y) * cos(z) + sin(z) * cos(x) - 0.5 * sin(t),
            min: new Vec3(-3 * PI, -3 * PI, -3 * PI),
            max: new Vec3(3 * PI, 3 * PI, 3 * PI)
        }),
        'latex': '\\large{\\sin x\\cos y + \\sin y \\cos z + \\sin z \\cos x = c(t)}'
    },
    'Torus': {
        'surface': new ImplicitSurface({
            func: (x, y, z, t) => {
                // The major radius shrinks to zero at t = PI, turning the
                // torus equation continuously into the equation of a sphere.
                const radialDistance = (x, y) => Math.hypot(x, y);
                const R = majorRadius * (1 + cos(t)) * 0.5;
                return (radialDistance(x, y) - R) ** 2 + z * z - minorRadius ** 2;
            },
            min: new Vec3(-2.25, -2.25, -1.4),
            max: new Vec3(2.25, 2.25, 1.4)
        }),
        'latex': '\\large{(\\sqrt{x^2 + y^2} - R)^2 + Z^2 = r^2}'
    }
};

const surfacesRegistry = new Registry({
    label: '🌫️ Surface ',
    entries: surfaces
});

const surfaceView = new ImplicitSurfaceView({
    resolution: 45,
    maxPolyCount: 60_000,
    colorMapper: ColorMappers.get(ColorMappers.Scientific),
    opacity: 0.9
});

let animate = false;
let currentSurface;
const simulation = Simulation
    .with({
        htmlDivId: 'implicitSurfacesContainer',
        headUpDisplay: { enabled: false },
        viewport: { parameterMenuCollapsed: false },
        camera: { fieldOfView: 35 },
        infoPanel: {
            text: '<strong>🪩 Implicit surfaces</strong><br/>' +
                '• Rendered with <a href=\"https://en.wikipedia.org/wiki/Marching_cubes\">marching cubes</a> algorithm ' +
                ' provided by the <a href=\"https://threejs.org\">Three.js</a> library.<br/>' +
                '• Isosurfaces may even be time-dependent!'
        }
    })
    .append(new Checkbox('Animate').onChange(checked => animate = checked ))
    .onStep((_clock, dt) => currentSurface.time += animate ? dt : 0)
    .append(new DropdownMenu()
        .for(surfacesRegistry)
        .withValue('Gyroid lattice')
        .onChange(value => changeSurface(value))
    )
    .start();

/** @param {string} surfaceId */
function changeSurface(surfaceId) {
    const surfaceData = surfacesRegistry.get(surfaceId);
    currentSurface = surfaceData.surface;
    simulation
        .bind(currentSurface.alwaysWith(surfaceView))
        .setLatexTitle(surfaceData.latex)
        .provideAxesAround(surfaceView)
        .frameSceneOn(surfaceView, {padding: 0.9, translationY: -5});
}

changeSurface('Gyroid lattice');