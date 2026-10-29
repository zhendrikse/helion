import {
    Simulation, Sphere, Cylinder, Vec3, Colour, RadialSymmetricBody, Range,
    ModelObjectsCollection, ViewsCollection, Arrow, Slider, AxialSymmetricBody
} from '../../../src/index.js';

const CYLINDER_RADIUS = 1;
const CYLINDER_HEIGHT = 2;

class MomentOfInertiaCylinder {
    constructor(radius = CYLINDER_RADIUS, height = CYLINDER_HEIGHT, ringSpacing = 0.1) {
        /** @type {ModelObjectsCollection<RadialSymmetricBody>} */
        this._atoms = new ModelObjectsCollection();
        this._omega = new Vec3(0, 0, 0);
        this._momentOfInertia = 0;
        this._forceLocation = new Vec3(radius, 0, 0);
        this._createAtoms(radius, height, ringSpacing);
    }

    _createAtoms(radius, height, ds) {
        this._momentOfInertia = 0;
        for (let z = -height / 2; z <= height / 2; z += ds) {
            let theta = 0;
            while (theta < Math.PI * 2) {
                const atom = new RadialSymmetricBody({
                    position: new Vec3(radius * Math.cos(theta), radius * Math.sin(theta), z),
                    radius: 0.05,
                    mass: 1e-3
                });
                this._atoms.add(atom);
                theta += ds / radius;
                this._momentOfInertia += radius * radius * atom.mass;
            }
        }
    }

    get forceLocation() { return this._forceLocation; }
    get atoms() { return this._atoms; }

    applyTorque(torque, dt) {
        this._omega.add(torque.clone().multiplyScalar(dt / this._momentOfInertia));
        const angle = this._omega.length() * dt;
        if (angle > 0)
            this._atoms.forEach(atom => atom.rotateEuler(this._omega.clone().normalize(), angle));
    }
}

const cylinder = new MomentOfInertiaCylinder(CYLINDER_RADIUS, CYLINDER_HEIGHT);
const cylinderAxis = new AxialSymmetricBody({
    position: new Vec3(0, 0, -.5 * CYLINDER_HEIGHT),
    radius: 0.02,
    axis: new Vec3(0, 0, CYLINDER_HEIGHT * 1.5)
});
const forceArrowModel = new AxialSymmetricBody({
    position: new Vec3(CYLINDER_RADIUS, 0, 0),
    radius: 0.05,
    axis: new Vec3(0, 1, 0)
});

const torqueAt = t => {
    const force = new Vec3(0, Math.cos(t), 0);
    return cylinder.forceLocation.clone().cross(force);
}

const cylinderView = ViewsCollection.of(Sphere).with({ color: Colour.Red });
const simulation = Simulation
    .with({
        htmlDivId: 'momentOfInertiaContainer',
        camera: {
            position: new Vec3(3, 3, 5).multiplyScalar(.86),
            fieldOfView: 40
        },
        viewport: { parameterMenuCollapsed: false },
        headUpDisplay: false,
        infoPanel: {
            text: '<strong>🦥 Moment of Inertia — Rotating Cylinder</strong><br/>' +
                '• A torque is applied at the rim: $\\overrightarrow{\\tau} = \\overrightarrow{r} \\times \\overrightarrow{F}(t)$ where $\\overrightarrow{F}(t) = (0, \\cos(t), 0)$.<br/>' +
                '• The cylinder\'s angular velocity $\\overrightarrow{\\omega}$ increments by $\\overrightarrow{\\tau}/I \\cdot dt$.'
        }
    })
    .bind(cylinder.atoms.alwaysWith(cylinderView))
    .bind(cylinderAxis.alwaysWith(new Cylinder({ color: new Colour(0x22ff22) })))
    .bind(forceArrowModel.alwaysWith(new Arrow({
        color: Colour.Cyan,
        size: .15,
        magnitudeMap: mag => 2 * mag
    })))
    .runsEvery(0.0075)
    .onStep((clock, dt) => {
        cylinder.applyTorque(torqueAt(clock.simulatedTime), dt);
        const force = new Vec3(0, Math.cos(clock.simulatedTime), 0);
        forceArrowModel.axis.copy(force);
    })
    .append(new Slider('Angular speed (dt)')
        .withRange(new Range(5, 10, .1))
        .withValue(7.5)
        .onInput(value => simulation.runsEvery( (15 - value) / 1000)))
    .start();

cylinderView.viewAt(cylinder.atoms.size - 1).color = Colour.Yellow; // Yellow marker
