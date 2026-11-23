import { BufferGeometry, LineBasicMaterial, Line } from 'three';
import {
    Floor, Sphere, Trail, Vec3, Simulation, RadialSymmetricBody, Checkbox, Slider, Range, CelestialBody, Colour, Vec2,
    SurfaceVisualization, ContoursLayer, ColorMappers, SurfaceResolution, ParametricSurface, SunView, ThreeJsScene,
} from '../../../src/index.js';

let initialCometDistance = 33;
let currentIsRingOrbitValue = false;
const subSteps = (isRingOrbit) => isRingOrbit ? 1000 : 10;

const sun = new CelestialBody({
    mass: 5,
    radius: 10
});

class SchwarzschildSurface extends ParametricSurface {
    static yOffset = -10;
    static zAsFunctionOf = (r, M) => Math.sqrt(Math.max(0, 8 * M * r - 16 * M * M));
    static surfacePointAt = (r, phi, M) => new Vec3(
        r * Math.cos(phi),
        SchwarzschildSurface.zAsFunctionOf(r, M),
        r * Math.sin(phi)
    );
    static gridPointAt = (r, phi) => new Vec3(
        r * Math.cos(phi),
        SchwarzschildSurface.yOffset,
        r * Math.sin(phi)
    );

    constructor(mass) {
        const epsilon = 0.01;
        const rMin = 2 * mass;
        const rMax = 13 * mass;
        const r = u  => (rMin + epsilon) + (u + .5) * (rMax - (rMin + epsilon));
        const phi = v => 2 * Math.PI * v;
        super({
            x: (u, v) => r(u) * Math.cos(phi(v)),
            y: (u, v) => SchwarzschildSurface.zAsFunctionOf(r(u), mass),
            z: (u, v) => r(u) * Math.sin(phi(v))
        });
        this._mass = mass;
        this._rMin = rMin;
        this._rMax = rMax;
    }

    get rMin() { return this._rMin }
    get rMax() { return this._rMax; }
    get mass() { return this._mass; }
}

class StateVector {
    constructor(t, r, phi, tDot, rDot, phiDot) {
        this.t = t;
        this.r = r;
        this.phi = phi;
        this.tDot = tDot;
        this.rDot = rDot;
        this.phiDot = phiDot;
    }

    static initial(mass, distance, isOrbit = false) {
        const r = distance;
        const t = 0;
        const phi = 0;
        const f = 1 - (2 * mass / r);

        if (f <= 0)
            throw new RangeError('Initial position must be outside the Schwarzschild radius.');

        let rDot;
        let phiDot;
        let tDot;

        if (isOrbit) {
            if (r <= 3 * mass)
                throw new RangeError('A circular timelike orbit requires r > 3M.');

            rDot = 0;
            tDot = 1 / Math.sqrt(1 - 3 * mass / r);
            phiDot = Math.sqrt(mass / (r * r * r)) * tDot;
        } else {
            // Preserve the original infalling trajectory, but normalize its
            // four-velocity so that g(mu, nu) u(mu) u(nu) = -1.
            rDot = -25.2;
            phiDot = 0.489374;
            tDot = Math.sqrt((1 + (rDot * rDot) / f + r * r * phiDot * phiDot) / f);
        }

        return new StateVector(t, r, phi, tDot, rDot, phiDot);
    }

    clone() {
        return new StateVector(
            this.t, this.r, this.phi,
            this.tDot, this.rDot, this.phiDot
        );
    }

    addScaled(other, scale) {
        this.t += scale * other.t;
        this.r += scale * other.r;
        this.phi += scale * other.phi;
        this.tDot += scale * other.tDot;
        this.rDot += scale * other.rDot;
        this.phiDot += scale * other.phiDot;
        return this;
    }
}

class Comet extends RadialSymmetricBody {
    static initialPosition = (distance) =>
        new Vec3(distance, SchwarzschildSurface.zAsFunctionOf(distance, sun.mass), 0);

    constructor({
        position,
        radius = 1.25,
        stateVector = null
    } = {}) {
        super({ position, radius });
        this._stateVector = stateVector ? stateVector.clone() : null;
        this._startStateVector = stateVector ? stateVector.clone() : null;
    }

    /**
     * @param {StateVector} state 
     * @param {number} M 
     */
    _derivativeSurface(state, M) {
        const bracket = state.r - 2 * M;

        if (bracket <= 0.01)
            return new StateVector(0, 0, 0, 0, 0, 0);

        // Geodesic equations for the metric induced on the Flamm surface.
        return new StateVector(
            0,
            state.rDot,
            state.phiDot,
            // radial acceleration on surface
            0,
            (M / (state.r * bracket)) * state.rDot * state.rDot +
            (bracket / state.r) * state.phiDot * state.phiDot,
            (-2 / state.r) * state.rDot * state.phiDot
        );
    }

    /**
     * @param {StateVector} state 
     * @param {number} M 
     */
    _derivativeGeodesic(state, M) {
        const bracket = state.r - 2 * M;

        if (bracket <= 0.01)
            return new StateVector(0, 0, 0, 0, 0, 0);

        return new StateVector(
            state.tDot,
            state.rDot,
            state.phiDot,
            (-2 * M / (state.r * bracket)) * state.tDot * state.rDot,
            (-M * bracket / (state.r * state.r * state.r)) * state.tDot * state.tDot +
            (M / (state.r * bracket)) * state.rDot * state.rDot +
            bracket * state.phiDot * state.phiDot,
            (-2 / state.r) * state.rDot * state.phiDot
        );
    }

    _rk4Step(state, derivativeFn, M, dt) {
        const derivativeOf = (s) => derivativeFn(s, M);
        const k1 = derivativeOf(state);

        const s2 = state.clone().addScaled(k1, 0.5 * dt);
        const k2 = derivativeOf(s2, M);

        const s3 = state.clone().addScaled(k2, 0.5 * dt);
        const k3 = derivativeOf(s3, M);

        const s4 = state.clone().addScaled(k3, dt);
        const k4 = derivativeOf(s4, M);

        // combine IN PLACE
        state.t += (dt / 6) * (k1.t + 2 * k2.t + 2 * k3.t + k4.t);
        state.r += (dt / 6) * (k1.r + 2 * k2.r + 2 * k3.r + k4.r);
        state.phi += (dt / 6) * (k1.phi + 2 * k2.phi + 2 * k3.phi + k4.phi);
        state.tDot += (dt / 6) * (k1.tDot + 2 * k2.tDot + 2 * k3.tDot + k4.tDot);
        state.rDot += (dt / 6) * (k1.rDot + 2 * k2.rDot + 2 * k3.rDot + k4.rDot);
        state.phiDot += (dt / 6) * (k1.phiDot + 2 * k2.phiDot + 2 * k3.phiDot + k4.phiDot);

        return state;
    }

    /**
     * @param {number} M
     * @param {number} dt
     */
    updateRealMotion(M, dt) {
        if (!this._stateVector || !this.visible)
            return;

        if (this._stateVector.r <= 2 * M + 0.01) {
            this.stop();
            this.visible = false;
            return;
        }

        this._stateVector = this._rk4Step(this._stateVector, this._derivativeGeodesic, M, dt);
    }

    /**
     * Integrate a spatial geodesic of the Flamm embedding metric.
     * @param {number} M
     * @param {number} dt
     */
    update(M, dt) {
        if (!this._stateVector || !this.visible)
            return;

        if (this._stateVector.r <= 2 * M + 0.01) {
            this.stop();
            this.visible = false;
            return;
        }

        this._stateVector = this._rk4Step(this._stateVector, this._derivativeSurface, M, dt);
    }

    get r() { return this._stateVector.r; }
    get phi() { return this._stateVector.phi; }
    get distance() { return Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z); }

    reset(stateVector = this._startStateVector) {
        super.reset();
        this.visible = true;
        this._startStateVector = stateVector ? stateVector.clone() : null;
        this._stateVector = stateVector ? stateVector.clone() : null;
    }
}

//
// Physics model
//
const comet = new Comet({
    position: Comet.initialPosition(initialCometDistance),
    radius: 1.75,
    stateVector: StateVector.initial(sun.mass, initialCometDistance, currentIsRingOrbitValue)
});

const flatComet = new Comet({
    position: new Vec3(initialCometDistance, SchwarzschildSurface.yOffset, 0),
    radius: 1.75,
    stateVector: null // important: no own dynamics, just follows comet
});

const realComet = new Comet({
    position: new Vec3(initialCometDistance, SchwarzschildSurface.yOffset, 0),
    radius: 1.75,
    stateVector: StateVector.initial(sun.mass, initialCometDistance, currentIsRingOrbitValue)
});

function createCircularMarker(M, r, color, segments = 300) {
    const points = [];

    for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * 2 * Math.PI;
        points.push(SchwarzschildSurface.surfacePointAt(r, phi, M));
    }

    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color });
    return new Line(geometry, material);
}

const photonRing = createCircularMarker(sun.mass, 3 * sun.mass, 0x00aaff);
photonRing.visible = false;
const iscoRing = createCircularMarker(sun.mass, 6 * sun.mass, 0xffcc00);
iscoRing.visible = false;

function timeStep() {
    const dt = 2e-3;

    for (let substep = 0; substep < subSteps(currentIsRingOrbitValue); substep++) {
        // Integration is independent of whether an object is inside the
        // visible parameter range of the embedded surface.
        comet.update(sun.mass, dt);
        realComet.updateRealMotion(sun.mass, dt);
    }

    comet.state.position.copy(
        SchwarzschildSurface.surfacePointAt(comet.r, comet.phi, sun.mass)
    );
    realComet.state.position.copy(
        SchwarzschildSurface.gridPointAt(realComet.r, realComet.phi)
    );
    flatComet.state.position.set(
        comet.position.x,
        SchwarzschildSurface.yOffset,
        comet.position.z
    );
}

//
// Math (surface) model
//
const coneGeometry = new SchwarzschildSurface(sun.mass);

// Grid
const grid = new Floor({
    position: new Vec3(0, SchwarzschildSurface.yOffset, 0),
    type: Floor.Type.GRID,
    planeSizeXy: new Vec2(185, 185),
    opacity: 0.05,
    granularity: 20
});

// Curved space-time: Flamm's paraboloid
const spaceTimeCone = new SurfaceVisualization({
    display: SurfaceVisualization.Display.None
});
spaceTimeCone.addOverlayLayer(new ContoursLayer({
    resolution: new SurfaceResolution(25, 50),
    colorMapper: new ColorMappers().get(ColorMappers.Uniform)()
}));

const realCometTrail = new Trail({ color: new Colour(0xff8800) });
const flatCometTrail = new Trail({ color: new Colour(0xff0000) });
const cometTrail = new Trail({ color: new Colour(0x00ffff) });
const simulation = Simulation
    .with({
        htmlDivId: 'spaceTimeContainer',
        viewport: { parameterMenuCollapsed: false },
        camera: {
            position: new Vec3(5, 7.5, 15).multiplyScalar(13),
            fieldOfView: 45
        },
        scene: { background: ThreeJsScene.Background.STARS },
        infoPanel: {
            text: '<strong>❍ Schwarzschild space-time</strong><br/>' +
                '• <span style="color: orange">orange</span> → Schwarzschild spacetime geodesic $(t, r, \\phi)$<br/>' +
                '• <span style="color: cyan">cyan</span> → geodesic of the Flamm spatial geometry<br/>' +
                '• <span style="color: red">red</span> → Euclidean projection of the embedded-surface trajectory'
        }
    })
    .addObject3D(grid)
    .addObject3D(photonRing)
    .addObject3D(iscoRing)
    .bind(coneGeometry.onceWith(spaceTimeCone))
    .bind(sun.alwaysWith(new SunView()))
    .bind(realComet.alwaysWith(new Sphere({ color: new Colour(0xff8800) })))
    .bind(realComet.alwaysWith(realCometTrail))
    .bind(flatComet.alwaysWith(new Sphere({ color: Colour.Red })))
    .bind(flatComet.alwaysWith(flatCometTrail))
    .bind(comet.alwaysWith(new Sphere({ color: Colour.Cyan })))
    .bind(comet.alwaysWith(cometTrail))
    .withMouseClickEventListener()
    .runsEvery(0.03)
    .onStep((clock, _) => timeStep(clock.clockTime))
    .onFrame(clockTime => {
        sun.time = clockTime;
        photonRing.material.color.offsetHSL(0, 0, Math.sin(clockTime * 0.002) * 0.1)
    })
    .append(new Checkbox('Grid: ')
        .on(grid)
        .withProperty('visible')
        .checked(true)
        .togetherWith(new Checkbox('Paraboloid: ')
            .on(spaceTimeCone)
            .withProperty('visible')
            .checked(true)
        )
    );

// TODO Mass slider

const distanceSlider = new Slider('Distance: ')
    .withRange(new Range(25.1, 64, .1))
    .withValue(33)
    .onInput(value => {
        initialCometDistance = value;
        const initialState = StateVector.initial(sun.mass, initialCometDistance, currentIsRingOrbitValue);
        comet.reset(initialState);
        realComet.reset(initialState);
        flatComet.reset();
        flatCometTrail.reset();
        realCometTrail.reset();
        cometTrail.reset();
        comet.state.position.copy(SchwarzschildSurface.surfacePointAt(comet.r, comet.phi, sun.mass));
        realComet.state.position.copy(SchwarzschildSurface.gridPointAt(realComet.r, realComet.phi));
        flatComet.state.position.set(comet.position.x, SchwarzschildSurface.yOffset, comet.position.z);
    });

simulation
    .append(new Checkbox('Photon sphere: ')
        .on(photonRing)
        .withProperty('visible')
        .checked(false)
        .togetherWith(new Checkbox('ISCO: ')
            .on(iscoRing)
            .withProperty('visible')
            .checked(false)
            .togetherWith(new Checkbox('Orbit: ')
                .onChange(checked => {
                    currentIsRingOrbitValue = checked;
                    const initialState = StateVector.initial(
                        sun.mass, initialCometDistance, currentIsRingOrbitValue
                    );
                    comet.reset(initialState);
                    realComet.reset(initialState);
                    flatComet.reset();
                    cometTrail.reset();
                    realCometTrail.reset();
                    flatCometTrail.reset();
                    comet.state.position.copy(
                        SchwarzschildSurface.surfacePointAt(comet.r, comet.phi, sun.mass)
                    );
                    realComet.state.position.copy(
                        SchwarzschildSurface.gridPointAt(realComet.r, realComet.phi)
                    );
                    flatComet.state.position.set(
                        comet.position.x, SchwarzschildSurface.yOffset, comet.position.z
                    );
                })
            )
        )
    )
    .append(distanceSlider);

//
// Event handling
//
// controller.addStartStopMouseClickEventListenerTo(canvas, () => {
//     simulation.toggleRunStatus();
//     if (comet.isMoving) {
//         realComet.stop();
//         comet.stop();
//     } else {
//         realComet.start();
//         comet.start();
//     }
// });

// distanceSlider.addEventListener('input',
//     () => document.getElementById('distanceSliderValue').textContent = distanceSlider.value);
// distanceSlider.addEventListener('input', () => {
//     comet.reset(Number(distanceSlider.value));
//     flatComet.reset(Number(distanceSlider.value));
//     realComet.reset(Number(distanceSlider.value));
// });
//

//
// canvas.addEventListener('click', () => {
//     if (comet.isMoving) {
//         realComet.stop();
//         comet.stop();
//         ThreeJsUtils.showOverlayMessage(overlay, 'Stopped', 500);
//     } else {
//         realComet.start();
//         comet.start();
//         ThreeJsUtils.showOverlayMessage(overlay, 'Started', 500);
//     }
// });
