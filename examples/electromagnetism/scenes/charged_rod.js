import { Color } from "three";
import { RadialSymmetricBody, VectorField, Range, Sphere, ArrowField, Trail, ThreeJsRenderer,
    ThreeJsRenderOptions, Simulation, Canvas, Overlay, EventController, HtmlDiv, Vec3
} from "../../../src/index.js";

//
// Constants
//
const EPS0K = 9e9;     // Coulomb constant
const MU0 = 1e-7;      // magnetic constant
const C = 3e8;
const electricScale = 0.002;
const magneticScale = 2e15;

class MovingPointCharge extends RadialSymmetricBody {
    constructor({
        position,
        velocity,
        charge,
        mass = 1.67e-27,
        radius = 0.1
    }) {
        super({position, velocity, charge, mass, radius});
    }

    electricFieldAt(position) {
        const r = position.clone().sub(this.position);
        const r2 = r.lengthSq();

        if (r2 < 1e-6)
            return new Vec3();

        const beta2 = this.velocity.lengthSq() / (C * C);
        return r.normalize().multiplyScalar(EPS0K * this.charge / r2 * (1 - beta2));
    }

    magneticFieldAt(position) {
        const r = position.clone().sub(this.position);
        const r2 = r.lengthSq();

        if (r2 < 1e-6)
            return new Vec3();

        return this.velocity.clone()
            .cross(r.clone().normalize())
            .multiplyScalar(MU0 * this.charge / r2);
    }

    update(dt) {
        this.position.add(this.velocity.clone().multiplyScalar(dt));
    }
}

class ChargedRod {
    constructor({
        length = 1,
        numCharges = 10,
        charge = 1e-9
    } = {}) {
        this._charges = [];
        const dy = length / numCharges;
        const y0 = -length / 2 + dy / 2;

        for (let i = 0; i < numCharges; i++)
            this._charges.push(new MovingPointCharge({
                position: new Vec3(0, y0 + i * dy, 0),
                velocity: new Vec3(0, 0.2, 0),
                charge: charge / numCharges,
                radius: dy * 0.2
            }));
    }

    update(dt) {
        for (const charge of this._charges)
            charge.update(dt);
    }

    electricFieldAt(position) {
        const field = new Vec3();
        for (const charge of this._charges)
            field.add(charge.electricFieldAt(position));

        return field;
    }

    magneticFieldAt(position) {
        const field = new Vec3();
        for (const charge of this._charges)
            field.add(charge.magneticFieldAt(position));

        return field;
    }

    get charges() { return this._charges; }
}

class RodElectricField extends VectorField {
    constructor(rod) {
        super();
        this._rod = rod;
    }

    vectorAt(position) {
        return this._rod.electricFieldAt(position).multiplyScalar(electricScale);
    }
}

class RodMagneticField extends VectorField {
    constructor(rod) {
        super();
        this._rod = rod;
    }

    vectorAt(position) {
        return this._rod.magneticFieldAt(position).multiplyScalar(magneticScale);
    }
}

//
// Physics objects
//
const rod = new ChargedRod({ length: 1, numCharges: 10 });
const electricField = new RodElectricField(rod);
const magneticField = new RodMagneticField(rod);

//
// Renderer + view model
//
const renderer = ThreeJsRenderer.on(HtmlDiv.withElementId("chargedRodWrapper")
    .containsBoth(Canvas.withElementId("chargedRodCanvas").and(Overlay.withElementId("chargedRodOverlay"))))
    .with(new ThreeJsRenderOptions({
        cameraPosition: new Vec3(2, 1.5, 2.5),
        fieldOfView: 30
    }));

for (const charge of rod.charges) {
    const sphere = new Sphere({ color: new Color("yellow") });
    renderer.synchronize(charge.alwaysWith(sphere));
    renderer.synchronize(charge.alwaysWith(new Trail({ maxPoints: 150, color: sphere.color })));
}

renderer.synchronize(electricField.alwaysWith(new ArrowField({
    xRange: new Range(-0.4, 0.4, 0.12),
    yRange: new Range(-0.5, 0.5, 0.2),
    zRange: new Range(-0.4, 0.4, 0.12),
    scaleFactor: 0.15,
    magnitudeMap: m => m < 0.05 ? 0 : Math.sqrt(m), // set tiny arrows to zero
    colorMap: () => new Color("red"),
    round: true
})));

renderer.synchronize(magneticField.alwaysWith(new ArrowField({
    xRange: new Range(-0.4, 0.4, 0.12),
    yRange: new Range(-0.5, 0.5, 0.2),
    zRange: new Range(-0.4, 0.4, 0.12),
    scaleFactor: 0.15,
    magnitudeMap: m => m < 0.05 ? 0 : Math.sqrt(m), // set tiny arrows to zero
    colorMap: () => new Color("cyan"),
    round: true
})));

//
// Simulation
//
const dt = 0.01;
const allGone = () => rod.charges.every(c => c.position.y > 1);
const simulation = Simulation
    .with(renderer)
    .incrementsTimeBy(dt)
    .onClockTick(() => {
        if (!allGone())
            rod.update(dt);
    }, 2);

//
// Controls
//
const eventController = EventController.for(simulation);
eventController.addStartStopMouseClickEventListenerTo(Canvas.withElementId("chargedRodCanvas"));
