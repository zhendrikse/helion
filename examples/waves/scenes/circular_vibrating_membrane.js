import {
    Domain, Simulation, Button, SurfaceVisualization, BESSEL_ZEROS, besselJ,
    ContoursLayer, RadioGroup, Checkbox, MultivariateFunction, ScalarFieldSurface
} from '../../../src/index.js';

const R = 1.6; // membrane radius — fits within Domain [-R,R]
const WAVE_SPEED = 1.2; // scale such that omega ~ 2-5 (comparable to square omega=2π/3)

class CircularMembraneFunction extends MultivariateFunction {
    constructor({
        domain = new Domain([-R, R], [-R, R]),
        amplitude = 0.5,
        angularMode = 0, // m
        radialMode = 1,  // n (1-geïndexed)
        angularPhase = 0 // 0: cos(mθ), 1: sin(mθ) for m > 0 degeneracy
    } = {}) {
        super({ domain });
        this._amplitude = amplitude;
        this._angularMode = angularMode;
        this._radialMode = radialMode;
        this._angularPhase = angularPhase;
        this._norm = this._computeNorm();
        this._func = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ t) => {
            const r = Math.sqrt(x * x + y * y);
            if (r > R) return 0; // klem buiten cirkel → ingeklemde rand
            const theta = Math.atan2(y, x);
            const alpha = BESSEL_ZEROS[this._angularMode][this._radialMode - 1];
            const radial = besselJ(this._angularMode, alpha * r / R) / this._norm;
            const angular = this._angularMode === 0 ? 1 :
                (this._angularPhase === 0 ? Math.cos(this._angularMode * theta) : Math.sin(this._angularMode * theta));
            return this._amplitude * Math.cos(this.omega() * t) * radial * angular;
        };
    }

    omega = () => BESSEL_ZEROS[this._angularMode][this._radialMode - 1] * WAVE_SPEED / R;

    _computeNorm() {
        // Equal visual amplitude: scale according to peak of J_m(α·r/R) → all modi ≈ amplitude * 0.5
        let peak = 0;
        for (let i = 0; i <= 200; i++) {
            const r = (i / 200) * R;
            const alpha = BESSEL_ZEROS[this._angularMode][this._radialMode - 1];
            const v = Math.abs(besselJ(this._angularMode, alpha * r / R));
            if (v > peak) peak = v;
        }
        return peak || 1;
    }

    /** @param {number} m */
    set angularMode(m) {
        this._angularMode = Number(m);
        this._norm = this._computeNorm();
    }
    
    /** @param {number} n */
    set radialMode(n) {
        this._radialMode = Number(n);
        this._norm = this._computeNorm();
    }

    /** @param {number} phase */
    set angularPhase(phase) { this._angularPhase = Number(phase); }
}

const membraneFunction = new CircularMembraneFunction();
const membrane = new ScalarFieldSurface(membraneFunction);

const contours = new ContoursLayer();
const surfaceView = new SurfaceVisualization({glyphScale: 0.025}).addOverlayLayer(contours);

Simulation
    .with({
        htmlDivId: 'circularMembraneContainer',
        viewport: { aspectRatio: '19 / 12' },
        headUpDisplay: { enabled: false }
    })
    .bind(membrane.alwaysWith(surfaceView))
    .runsEvery(0.016)
    .onStep((clock) => membraneFunction.time = clock.simulatedTime)
    .frameSceneOn(surfaceView, { padding: 0.7, translationY: -1.0 })
    .append(new Button('m (angle): ').on(membraneFunction).withProperty('angularMode').withText(' 0 ')
        .togetherWith(new Button().on(membraneFunction).withProperty('angularMode').withText(' 1 ')
            .togetherWith(new Button().on(membraneFunction).withProperty('angularMode').withText(' 2 ')
                .togetherWith(new Button().on(membraneFunction).withProperty('angularMode').withText(' 3 ')
                    .togetherWith(new Button().on(membraneFunction).withProperty('angularMode').withText(' 4 ')))))
    )
    .append(new Button('n (radial): ').on(membraneFunction).withProperty('radialMode').withText(' 1 ')
        .togetherWith(new Button().on(membraneFunction).withProperty('radialMode').withText(' 2 ')
            .togetherWith(new Button().on(membraneFunction).withProperty('radialMode').withText(' 3 ')
                .togetherWith(new Button().on(membraneFunction).withProperty('radialMode').withText(' 4 '))))
    )
    .append(new Checkbox('sin(mθ) ').on(membraneFunction).withProperty('angularPhase').checked(false))
    .append(surfaceView.ui())
    .append(new Checkbox('Contours ').on(contours).withProperty('visible').checked(true).togetherWith(surfaceView.surfaceLayer.ui()))
    .append(new RadioGroup()
        .add('Smooth', () => surfaceView.display(SurfaceVisualization.Display.Surface))
        .add('Glyphs', () => surfaceView.display(SurfaceVisualization.Display.Glyphs))
        .add('None', () => surfaceView.display(SurfaceVisualization.Display.None))
        .checked(0))
    .append(surfaceView.glyphLayer.ui())
    .appendStartStopResetUI()
    .start();
