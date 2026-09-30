import {
    Simulation, Vec3, DiscreteScalarField, ColorMapper, Interval, FixedIntervalNormalizer,
    DiscreteFieldSurfaceView, Slider, Range
} from '../../../src/index.js';
import { SRGBColorSpace, Color } from 'three';

class InterferenceColorMapper extends ColorMapper {
    /** 
     * @param {number} normalized 
     * @param {Color} target 
     */
    map(normalized, target) {
        const waveTotal = normalized * 2 - 1; // 0..1 → -1..1 (0.5 = 0)
        let r = 0, g = 0, b = 0;
        if (waveTotal > 0)
            g = waveTotal;
        else {
            r = -waveTotal * 0.5; b = -waveTotal;
        }
        target.setRGB(r, g, b, SRGBColorSpace);
    }
}

const NX = 300;
const NY = 200;
const field = new DiscreteScalarField({ nx: NX, ny: NY });

let k = 2 * Math.PI / (NX / 8);
let omega = Math.PI;
let separation = 0.25; // fraction of width → sourceOffset = separation * NX/2

const view = new DiscreteFieldSurfaceView({
    normalizer: new FixedIntervalNormalizer(new Interval(0, 1)),
    colorMapper: new InterferenceColorMapper(),
    opacityFunction: () => 1,
});

Simulation
    .with({
        htmlDivId: 'interference2dContainer',
        viewport: { aspectRatio: `${NX} / ${NY}`, parameterMenuCollapsed: false },
        camera: { position: new Vec3(0, 0, NX * .7), orthographic: true, controls: false },
        headUpDisplay: { enabled: false }
    })
    .bind(field.alwaysWith(view))
    .runsEvery(0.015)
    .onStep((clock) => {
        const tPhase = omega * clock.simulatedTime;
        const sourceOffset = separation * NX / 2;
        const xMid = NX / 2;
        const yMid = NY / 2;
        for (let y = 0; y < NY; y++) 
            for (let x = 0; x < NX; x++) {
                const dy = y - yMid;
                let dx = x - (xMid - sourceOffset);
                let r = Math.sqrt(dx * dx + dy * dy);
                const wave1 = Math.sin(k * r - tPhase);
                dx = x - (xMid + sourceOffset);
                r = Math.sqrt(dx * dx + dy * dy);
                const wave2 = Math.sin(k * r - tPhase);
                const waveTotal = 0.5 * (wave1 + wave2);
                field.setValueAt(x, y, (waveTotal + 1) * 0.5);
            }
    })
    .append(new Slider('Separation')
        .withRange(new Range(0, 0.5, 0.01))
        .withValue(separation)
        .onInput(e => separation = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(new Slider('k')
        .withRange(new Range(0.05, 1, 0.01))
        .withValue(k)
        .onInput(e => k = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .append(new Slider('ω')
        .withRange(new Range(0.1, 6.28, 0.01))
        .withValue(omega).onInput(e => omega = Number(/** @type {HTMLInputElement} */(e.target).value)))
    .appendStartStopResetUI()
    .start();
