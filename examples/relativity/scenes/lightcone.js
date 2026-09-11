import { Simulation, Vec3, Renderable3D, MathPhysicsModelBehavior, Slider, Range } from "../../../src/index.js";
import { Arrow } from "../../../src/view/3d/primitives/primitives.js";
import { Color, MeshBasicMaterial, Mesh, ConeGeometry, RingGeometry, DoubleSide, Vector3, Box3 } from "three";

// Eén model dat tijd en boost-snelheid bijhoudt — Helion vervangt de losse `t` en `v` globals
class Spacetime extends MathPhysicsModelBehavior {
    constructor({ v = 0.5, maxHeight = 3 } = {}) {
        super();
        this.v = v;
        this.t = 0;
        this.maxHeight = maxHeight;
    }
    get beta() { return this.v; }
    reset() { this.t = 0; }
}

class LightConeView extends Renderable3D {
    constructor({ color = 0xaaffaa, opacity = 0.4, height = 3, maxHeight = 3 } = {}) {
        super();
        this._height = 0;
        this._maxHeight = maxHeight;

        const geo1 = new ConeGeometry(1, 1, 64, 1, true);
        const geo2 = new ConeGeometry(1, 1, 64, 1, true);
        const mat = new MeshBasicMaterial({ color, transparent: true, opacity, side: DoubleSide });
        this._bottomCone = new Mesh(geo1, mat);
        this._topCone = new Mesh(geo2, mat);
        this._topCone.scale.y = -1;

        // kleine offset om z-fighting met kegels te vermijden (zoals origineel height-0.02)
        const ringGeo = new RingGeometry(height - 0.02, height + 0.02, 128);
        const ringMat = new MeshBasicMaterial({ color: 0x33aa33, side: DoubleSide });
        this._topCircle = new Mesh(ringGeo, ringMat);
        this._topCircle.rotation.x = Math.PI / 2;
        this._bottomCircle = new Mesh(ringGeo.clone(), ringMat);
        this._bottomCircle.rotation.x = Math.PI / 2;

        this.add(this._bottomCone, this._topCone, this._topCircle, this._bottomCircle);
        // init op hoogte 0
        this._bottomCone.position.set(0, 0, 0);
        this._topCone.position.set(0, 0, 0);
        this._bottomCone.scale.set(0, 0, 0);
        this._topCone.scale.set(0, 0, 0);
    }
    canBindTo(m) { return m instanceof Spacetime; }
    synchronizeWith(model) {
        const t = Math.min(model.t, 1);
        const h = model.maxHeight * t;
        if (h <= 1e-9) {
            this._topCone.scale.set(0, 0, 0);
            this._bottomCone.scale.set(0, 0, 0);
            this._topCircle.scale.set(0, 0, 0);
            this._bottomCircle.scale.set(0, 0, 0);
            return;
        }
        this._topCone.scale.set(h, -h, h);
        this._topCone.position.y = h / 2;
        this._bottomCone.scale.set(h, h, h);
        this._bottomCone.position.y = -h / 2;
        // factor .935 * h/(2√2) uit origineel behouden voor visuele match
        const s = 0.935 * h / (2 * Math.sqrt(2));
        this._topCircle.scale.set(s, s, 1);
        this._topCircle.position.y = h;
        this._bottomCircle.scale.set(s, s, 1);
        this._bottomCircle.position.y = -h;
    }
    get boundingBox() {
        this.updateMatrixWorld(true);
        return new Box3().setFromObject(this);
    }
}

class PhotonView extends Renderable3D {
    constructor() {
        super();
        this._body = { position: new Vec3(0, 0, 0), axis: new Vec3(1, 1, 0) };
        this._arrow = new Arrow({ color: 0xffff00, size: 0.12, round: true, magnitudeMap: m => m });
        this.add(this._arrow);
    }
    canBindTo(m) { return m instanceof Spacetime; }
    synchronizeWith(model) {
        const t = Math.min(model.t, 1);
        this._body.axis.set(1, 1, 0).multiplyScalar(t * 2.25 * Math.sqrt(2));
        this._arrow.synchronizeWith(this._body);
    }
}

class BoostedAxesView extends Renderable3D {
    constructor() {
        super();
        this._xBody = { position: new Vec3(0, 0, 0), axis: new Vec3(1, 0, 0) };
        this._tBody = { position: new Vec3(0, 0, 0), axis: new Vec3(0, 1, 0) };
        this._xPrime = new Arrow({ color: 0x00ffff, size: 0.12, magnitudeMap: m => m });
        this._tPrime = new Arrow({ color: 0xff8800, size: 0.12, magnitudeMap: m => m });
        this.add(this._xPrime, this._tPrime);
    }
    canBindTo(m) { return m instanceof Spacetime; }
    synchronizeWith(model) {
        const scale = 1;
        const beta = model.v;
        // t' : (β,1,0)  x' : (1,β,0)  genormaliseerd, zoals origineel updateBoostedAxes()
        const tDir = new Vector3(beta, 1, 0).normalize().multiplyScalar(scale);
        const xDir = new Vector3(1, beta, 0).normalize().multiplyScalar(scale);
        this._tBody.axis.set(tDir.x, tDir.y, tDir.z);
        this._xBody.axis.set(xDir.x, xDir.y, xDir.z);
        this._tPrime.synchronizeWith(this._tBody);
        this._xPrime.synchronizeWith(this._xBody);
    }
}

const spacetime = new Spacetime({ v: 0.5, maxHeight: 3 });

const lightconeView = new LightConeView({ maxHeight: 3, height: 3 });
const photonView = new PhotonView();
const boostedView = new BoostedAxesView();

const simulation = Simulation.with({
    htmlDivId: "lightConeContainer",
    camera: { position: new Vec3(3, 6, 8), fieldOfView: 30 },
    headUpDisplay: { enabled: false },
    scene: { background: 0x0a0a0a }
})
    .bind(spacetime.alwaysWith(lightconeView))
    .bind(spacetime.alwaysWith(photonView))
    .bind(spacetime.alwaysWith(boostedView))
    .provideAxesAround(lightconeView, {
        axisLabels: ["x", "t", "y"],
        tickLabels: false,
        annotations: true,
        divisions: 20
    })
    .frameSceneOn(lightconeView, { padding: 0.9, translationY: -1 })
    .runsEvery(0.016)
    .onStep((clock, dt) => {
        // origineel: t += time*1e-6, stop bij t>1 — hier met simulatedTime
        spacetime.t += dt * 0.3; // 0.3 schaalt zodat hele kegel in ~3s opbouwt, zoals origineel
        if (spacetime.t > 1) spacetime.t = 1;
    })
    .append(new Slider("v = β").withRange(new Range(0, 0.9, 0.05)).withValue(0.5).onInput(e => { spacetime.v = Number(e.target.value); }));

simulation.setLatexTitle("$x',t'$ geboost met $\\beta=v/c$, lichtkegel $x^2+y^2=t^2$");
