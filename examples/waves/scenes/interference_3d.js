import {
    Simulation, ParametricSurface, Domain, SurfaceVisualization, SurfaceResolution, Slider, Range,
    FixedIntervalNormalizer, Interval, Vec3
} from '../../../src/index.js';

const waveParams = {
    distance: 20,
    waveLength: 4,
    intensity: 2,
    phase: 0
};

const domain = 50;
/**
 * @param {number} u 
 * @param {number} v 
 */
const d1 = (u, v) => Math.sqrt((u - waveParams.distance / 2) ** 2 + v * v);
/**
 * @param {number} u 
 * @param {number} v 
 */
const d2 = (u, v) => Math.sqrt((u + waveParams.distance / 2) ** 2 + v * v);
/**
 * @param {number} u 
 * @param {number} v 
 */
const factor = (u, v) => {
    const eps = 0.5; // guard d=0 (source itself) → clamp to eps to prevent 1/sqrt → inf
    const r1 = Math.max(d1(u, v), eps);
    const r2 = Math.max(d2(u, v), eps);
    return Math.cos(2 * Math.PI * r1 / waveParams.waveLength - Math.PI * waveParams.phase / 180) / Math.sqrt(r1) +
           Math.cos(2 * Math.PI * r2 / waveParams.waveLength - Math.PI * waveParams.phase / 180) / Math.sqrt(r2);
};

const interferenceSurface = new ParametricSurface({
    domain: new Domain([-domain, domain], [-domain, domain]),
    x: (u, _v) => u,
    y: (_u, v) => v,
    z: (u, v) => waveParams.intensity * factor(u, v) * factor(u, v)
});

const surfaceView = new SurfaceVisualization({
    resolution: new SurfaceResolution(125, 125),
    opacity: 0.95,
    normalizer: new FixedIntervalNormalizer(new Interval(-0.5, .5))
});

Simulation
    .with({
        htmlDivId: 'interference3dContainer',
        headUpDisplay: { enabled: false },
        camera: { position: new Vec3(0, 75, 100).multiplyScalar(1.25), fieldOfView: 30},
        viewport: { 
            parameterMenuCollapsed: false, 
            aspectRatio: '19/12'
        }
    })
    .bind(interferenceSurface.onceWith(surfaceView))
    .append(new Slider('Intensity')
        .withRange(new Range(0, 2.5, 0.01))
        .withValue(waveParams.intensity)
        .onInput(e => waveParams.intensity = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(new Slider('Wavelength')
        .withRange(new Range(1, 10, 0.1))
        .withValue(waveParams.waveLength)
        .onInput(e => waveParams.waveLength = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(new Slider('Distance')
        .withRange(new Range(1, 40, 0.1))
        .withValue(waveParams.distance)
        .onInput(e => waveParams.distance = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(new Slider('Phase')
        .withRange(new Range(0, 360, 1))
        .withValue(waveParams.phase)
        .onInput(e => waveParams.phase = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(surfaceView.ui());

