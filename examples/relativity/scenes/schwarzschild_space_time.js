import {Vector3, Vector2, BufferGeometry, LineBasicMaterial, Line} from "three";
import {
    Floor, Sphere, ThreeJsRenderer, ThreeJsRenderOptions, Trail, Canvas,
    EventController, HtmlDiv, Overlay, Simulation, Surface, IsoparametricContoursView,
    RadialSymmetricBody
} from "helion";
import {SurfaceColorMapper} from "../../../src/index.js";

const initialCometDistance = 33;
const currentIsRingOrbitValue = false;
const sunMass = 5;
const subSteps = (isRingOrbit) => isRingOrbit ? 1000 : 20;

class SchwarzschildSurface extends Surface {
    static yOffset = -10;
    static zAsFunctionOf = (r, M) => Math.sqrt(Math.max(0, 8 * M * r - 16 * M * M));
    static surfacePointAt = (r, phi, M) => new Vector3(
        r * Math.cos(phi),
        SchwarzschildSurface.zAsFunctionOf(r, M),
        r * Math.sin(phi)
    );
    static gridPointAt = (r, phi) => new Vector3(
        r * Math.cos(phi),
        SchwarzschildSurface.yOffset,
        r * Math.sin(phi)
    );

    constructor(mass) {
        super();
        this._mass = mass;
    }

    get rMin() { return 2 * this._mass }
    get rMax() { return 13 * this._mass; }
    get mass() { return this._mass; }

    sample(u, v, target) {
        const epsilon = 0.01;
        const r = (this.rMin + epsilon) + u * (this.rMax - (this.rMin + epsilon));
        const phi = v * 2 * Math.PI;
        target.set(r * Math.cos(phi), SchwarzschildSurface.zAsFunctionOf(r, this._mass), r * Math.sin(phi));
    }
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

    static initial(isOrbit=false) {
        const r = initialCometDistance;
        const t = 0;
        const phi = 0;
        const tDot = 1 / Math.sqrt(1 - 3 * sunMass / r);
        const phiDot = isOrbit
            ? Math.sqrt(sunMass) / (r ** 1.5 * Math.sqrt(1 - 3 * sunMass / r))
            : 0.489374;
        const rDot = isOrbit ? 0 : -25.2;

        return new StateVector(t, r, phi, tDot, rDot, phiDot);
    }

    clone() {
        return new StateVector(
            this.t, this.r, this.phi,
            this.tDot, this.rDot, this.phiDot
        );
    }

    addScaled(other, scale) {
        this.t     += scale * other.t;
        this.r     += scale * other.r;
        this.phi   += scale * other.phi;
        this.tDot  += scale * other.tDot;
        this.rDot  += scale * other.rDot;
        this.phiDot+= scale * other.phiDot;
        return this;
    }
}

class Comet extends RadialSymmetricBody {
    static initialPosition = (distance) =>
        new Vector3(distance, SchwarzschildSurface.zAsFunctionOf(distance, sunMass), 0);

    constructor({
        position,
        radius = 1.25,
        stateVector = null
    } = {}) {
        super({ position, radius });
        this._stateVector = stateVector  ? stateVector.clone() : null;
        this._startStateVector = stateVector ? stateVector.clone() : null;
        this._isMoving = false;
    }

    _derivativeSurface(state, M) {
        const bracket = state.r - 2 * M;

        if (bracket <= 0.01)
            return new StateVector(0,0,0,0,0,0);

        // This is the "embedding dynamics"
        return new StateVector(
            0,
            state.rDot,
            state.phiDot,
            // radial acceleration on surface
            0,
            (M / (state.r * bracket * bracket)) * state.rDot * state.rDot + bracket * state.phiDot * state.phiDot,
            (-2 / state.r) * state.rDot * state.phiDot
        );
    }

    _derivativeGeodesic(state, M) {
        const bracket = state.r - 2 * M;

        if (bracket <= 0.01)
            return new StateVector(0,0,0,0,0,0);

        return new StateVector(
            state.tDot,
            state.rDot,
            state.phiDot,
            (-M / (state.r * bracket * bracket)) * state.tDot * state.rDot,
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
        state.t     += (dt/6)*(k1.t     + 2*k2.t     + 2*k3.t     + k4.t);
        state.r     += (dt/6)*(k1.r     + 2*k2.r     + 2*k3.r     + k4.r);
        state.phi   += (dt/6)*(k1.phi   + 2*k2.phi   + 2*k3.phi   + k4.phi);
        state.tDot  += (dt/6)*(k1.tDot  + 2*k2.tDot  + 2*k3.tDot  + k4.tDot);
        state.rDot  += (dt/6)*(k1.rDot  + 2*k2.rDot  + 2*k3.rDot  + k4.rDot);
        state.phiDot+= (dt/6)*(k1.phiDot+ 2*k2.phiDot+ 2*k3.phiDot+ k4.phiDot);

        return state;
    }

    updateRealMotion(M, dt) {
        if (!this._isMoving) return;

        if (this._stateVector.r <= 2*M + 0.01) {
            this.stop();
            this.visible = false;
            return;
        }

        this._stateVector = this._rk4Step(this._stateVector, this._derivativeGeodesic, M, dt);
    }

    update(M, dt) {
        if (!this._isMoving) return;
        this._stateVector = this._rk4Step(this._stateVector, this._derivativeSurface, M, dt);
    }

    get r() { return this._stateVector.r; }
    get phi() { return this._stateVector.phi; }
    get distance() { return Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z); }
    get isMoving() { return this._isMoving; }

    start() { this._isMoving = true; }
    stop() { this._isMoving = false; }

    reset(distance) {
        super.reset();
        this.position = Comet.initialPosition(distance);
        this.visible = true;
        this._stateVector = this._startStateVector ? this._startStateVector.clone() : null;
        if (this._stateVector)
            this._stateVector.r = distance;
    }
}

//
// Physics model
//
const comet = new Comet({
    position: Comet.initialPosition(initialCometDistance),
    radius: 1.75,
    stateVector: StateVector.initial(currentIsRingOrbitValue)
});

const flatComet = new Comet({
    position: new Vector3(initialCometDistance, SchwarzschildSurface.yOffset, 0),
    radius: 1.75,
    stateVector: null // important: no own dynamics, just follows comet
});

const realComet = new Comet({
    position: new Vector3(initialCometDistance, SchwarzschildSurface.yOffset, 0),
    radius: 1.75,
    stateVector: StateVector.initial(currentIsRingOrbitValue)
});

function createPhotonSphere(M, segments = 300) {
    const r = 3 * M;
    const points = [];

    for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * 2 * Math.PI;
        points.push(SchwarzschildSurface.gridPointAt(r, phi, M));
    }

    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color: 0x00aaff });
    return new Line(geometry, material);
}
const photonRing = createPhotonSphere(sunMass);
photonRing.visible = false;

function timeStep(clockTime) {
    if (cometInsideCone())
        comet.update(sunMass, 0.001); // 3D geodesic
    if (cometInsideCone() || subSteps(currentIsRingOrbitValue))
        realComet.updateRealMotion(sunMass, 0.001);

    photonRing.material.color.offsetHSL(0, 0, Math.sin(clockTime * 0.002) * 0.1);

    comet.position.copy(SchwarzschildSurface.surfacePointAt(comet.r, comet.phi, sunMass));
    realComet.position.copy(SchwarzschildSurface.gridPointAt(realComet.r, realComet.phi));
    flatComet.position.set(comet.position.x, SchwarzschildSurface.yOffset, comet.position.z);
}

//
// Math (surface) model
//
const coneGeometry = new SchwarzschildSurface(sunMass);

const cometInsideCone = () =>
    coneGeometry.rMin < comet.distance && comet.distance < coneGeometry.rMax;

//
// Set up renderer and views
//
const threeJsRendererOptions = new ThreeJsRenderOptions({
    cameraPosition: new Vector3(5, 7.5, 15).multiplyScalar(11),
    fieldOfView: 45,
    background: ThreeJsRenderer.Background.STARS
});
const canvas = Canvas.withElementId("spaceTimeCanvas");
const overlay = Overlay.withElementId("spaceTimeOverlay")
const renderer = ThreeJsRenderer
    .on(HtmlDiv.withElementId("spaceTimeCanvasWrapper").containsBoth(canvas.and(overlay)))
    .with(threeJsRendererOptions);

// Grid
const grid = new Floor({
    position: new Vector3(0, SchwarzschildSurface.yOffset, 0),
    type: Floor.Type.GRID,
    planeSizeXy: new Vector2(185, 185),
    opacity: 0.05,
    granularity: 20
});
renderer.addObject3D(grid);
renderer.addObject3D(photonRing);

// Curved space-time
const colorMapper = new SurfaceColorMapper(SurfaceColorMapper.Mode.UNIFORM);
const spaceTimeCone = new IsoparametricContoursView({colorMapper});
renderer.synchronize(coneGeometry.onceWith(spaceTimeCone));

// Comets with trails
renderer.synchronize(realComet.alwaysWith(new Sphere({ color: 0xff8800 })));
renderer.synchronize(realComet.alwaysWith(new Trail( { color: 0xff8800 })));
renderer.synchronize(flatComet.alwaysWith(new Sphere({ color: 0xff0000 })));
renderer.synchronize(flatComet.alwaysWith(new Trail( { color: 0xff0000 })));
renderer.synchronize(comet.alwaysWith(new Sphere({ color: 0x00ffff })));
renderer.synchronize(comet.alwaysWith(new Trail( { color: 0x00ffff })));

const simulation = Simulation
    .with(renderer)
    .onScale(1)
    .onClockTick((clockTime, simulatedTime) => timeStep(clockTime));

simulation.onBeforeClockTick((clockTime, simulatedTime) =>
    simulation.substepsCount = subSteps(currentIsRingOrbitValue));

//
// Event handling
//
const controller = EventController.for(simulation);
controller.addStartStopMouseClickEventListenerTo(canvas, () => {
    simulation.toggleRunStatus();
    if (comet.isMoving) {
        realComet.stop();
        comet.stop();
    } else {
        realComet.start();
        comet.start();
    }
});

// TODO naar event handler klasse omzetten
document.getElementById('gridButton').addEventListener('click',
    () => grid.visible = !grid.visible );

document.getElementById('coneButton').addEventListener('click', () => {
    spaceTimeCone.visible = !spaceTimeCone.visible;
});

document.getElementById('photonSphereButton').addEventListener('click', () => photonRing.visible = !photonRing.visible);

// distanceSlider.addEventListener('input',
//     () => document.getElementById('distanceSliderValue').textContent = distanceSlider.value);
// distanceSlider.addEventListener('input', () => {
//     comet.reset(Number(distanceSlider.value));
//     flatComet.reset(Number(distanceSlider.value));
//     realComet.reset(Number(distanceSlider.value));
// });
//
// orbitButton.addEventListener('click', (e) => {
//     realComet.reset(Number(distanceSlider.value));
//     realComet._stateVector = StateVector.initial(orbitButton.checked);
//     comet.reset(Number(distanceSlider.value));
//     comet._stateVector = StateVector.initial(orbitButton.checked);
//     flatComet.reset(Number(distanceSlider.value));
//     distanceSlider.disabled = orbitButton.checked;
// });
//
// canvas.addEventListener("click", () => {
//     if (comet.isMoving) {
//         realComet.stop();
//         comet.stop();
//         ThreeJsUtils.showOverlayMessage(overlay, "Stopped", 500);
//     } else {
//         realComet.start();
//         comet.start();
//         ThreeJsUtils.showOverlayMessage(overlay, "Started", 500);
//     }
// });
