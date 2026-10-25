import { Color, AmbientLight, PointLight } from 'three';
import {
    RadialSymmetricBody, EC, Range, Simulation, Trail, Vec3, Slider, Sphere, ArrowField, CoulombForce,
    VectorField, Colour, ModelObjectsCollection, ViewsCollection
} from '../../../src/index.js';

const K = 9e9;
const scale = 1e14;

class Capacitor {
    constructor(topY = 10e-14, bottomY = -10e-14) {
        this._charges = new ModelObjectsCollection();

        for (let x = -20; x <= 20; x += 2)
            for (let z = -20; z <= 20; z += 2)
                for (const y of [topY, bottomY])
                    this._charges.add(new RadialSymmetricBody({
                        position: new Vec3(x / scale, y, z / scale),
                        radius: 1e-14,
                        charge: EC * (y > 0 ? 1 : -1)
                    }));
    }

    get charges() { return this._charges; }

    fieldAt(position, target) {
        target.set(0, 0, 0);
        for (const charge of this._charges)
            target.add(charge.fieldAt(position).multiplyScalar(K));
    }
}

class CapacitorField extends VectorField {
    constructor(capacitor) {
        super();
        this._capacitor = capacitor;
    }

    sample(positionVector, target) {
        this._capacitor.fieldAt(positionVector, target);
    }
}

//
// Physics objects
//
const capacitor = new Capacitor();
const capacitorField = new CapacitorField(capacitor);
const coulombForce = CoulombForce.in(capacitorField);
const movingCharge = new RadialSymmetricBody({
    position: new Vec3(-30, 4, 0).divideScalar(scale),
    velocity: new Vec3(15, 0, 0).divideScalar(scale),
    mass: 1.6e-27,
    radius: 1.2e-14,
    charge: 5e-42 * EC
});

const sphere = new Sphere({ color: new Colour(0x44ff44) });
const arrowField = new ArrowField({
    xRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    yRange: new Range(-9 / scale, 9 / scale, 4 / scale),
    zRange: new Range(-18 / scale, 18 / scale, 8 / scale),
    round: false,
    magnitudeMap: magnitude => 1e-15 * Math.log(1 + magnitude),
    colorMap: (axis, magnitude) => new Color(1, Math.sqrt(magnitude) * 1e-10, 0)
});

const chargeSlider = new Slider('🪫 Charge: ')
    .withUnits(' electron charge(s)')
    .withValue(1)
    .withRange(new Range(0, 5, .1))
    .onInput(value => movingCharge.state.charge = value * 5e-42 * EC);
const speedSlider = new Slider('🚀 Speed: ')
    .withUnits(' x 1E-14 m/s')
    .withValue(25)
    .withRange(new Range(1, 50, 1))
    .onInput(value => movingCharge.state.velocity.x = value / scale);

const chargesView = ViewsCollection.of(Sphere);
Simulation
    .with({
        htmlDivId: 'movingChargeContainer',
        camera: {
            position: new Vec3(-50, 0, 75).multiplyScalar(0.5),
            fieldOfView: 60,
        },
        viewport: {
            aspectRatio: '19/12',
        },
        scene: {
            scale: scale
        },
        lighting: {
            light: false // setting our own lights
        }
    })
    .addObject3D(new PointLight(0xffffff, 2e3))
    .addObject3D(new AmbientLight(0xffffff, 0.8))
    .withMouseClickEventListener()
    .bind(movingCharge.alwaysWith(sphere))
    .bind(movingCharge.alwaysWith(new Trail({ maxPoints: 400, color: sphere.color })))
    .bind(capacitorField.onceWith(arrowField))
    .bind(capacitor.charges.alwaysWith(chargesView))
    .runsEvery(5e-3)
    .onStep((_, dt) => {
        if (movingCharge.position.x > 60 / scale)
            return;

        movingCharge
            .apply(coulombForce)
            .integrate(dt);
    })
    .onReset(() => {
        movingCharge.state.charge = Number(chargeSlider.value) * 5e-42 * EC;
        movingCharge.state.velocity.x = Number(speedSlider.value) / scale;
    })
    .append(chargeSlider)
    .append(speedSlider);

chargesView.forEach((view, index) =>
    view.color = capacitor.charges.modelObject(index).charge > 0 ? new Colour(0x4444ff) : Colour.Red);
