import {
    RadialSymmetricBody, Vec3, Simulation, DiatomicMolecule, ViewsCollection, ModelsCollection,
    BodyPair, SwitchableBondView, Aquarium, RadioGroup, SphereSphereCollision, SpringForce,
} from '../../../src/index.js';

// Simulation constants
const SCALE = 1e10;
const MOLECULES_COUNT = 80;
const one_third = 1. / 3.;
const L = ((24.4E-3 / 6E23) * MOLECULES_COUNT) ** one_third / 50; // 2L is the length of the cubic container box
const radius = 31E-12;
const distance = 2.5 * radius;

const sphereSphereCollision = new SphereSphereCollision();
const bondForce = new SpringForce({
    restLength: distance,
    k: 18600
});

export class CarbonMonoxide extends BodyPair {
    /**
     * @param {Vec3} position
     * @param {number} initialSpeed
     */
    constructor(position, initialSpeed) {
        const axis = new Vec3(distance, 0, 0);
        const oxygenMass = 16E-23, carbonMass = 12E-23;
        const oxygen = new RadialSymmetricBody({
            position: position,
            velocity: new Vec3().random().multiplyScalar(initialSpeed),
            mass: oxygenMass,
            radius: radius
        });
        const carbon = new RadialSymmetricBody({
            position: axis.clone().add(position),
            velocity: new Vec3().random().multiplyScalar(initialSpeed),
            mass: carbonMass,
            radius: radius
        });
        super(oxygen, carbon);
    }

    _confineToBox(atom, size) {
        const half = size / 2;
        ['x', 'y', 'z'].forEach(axis => {
            if (atom.position[axis] > half - atom.radius)
                atom.state.velocity[axis] = -Math.abs(atom.velocity[axis]);
            if (atom.position[axis] < -half + atom.radius)
                atom.state.velocity[axis] = Math.abs(atom.velocity[axis]);
        });
    }

    /** @param {number} boxLength */
    checkBoxBounce(boxLength) {
        this._confineToBox(this.body1, boxLength);
        this._confineToBox(this.body2, boxLength);
    }

    /** @param {CarbonMonoxide} otherMolecule */
    resolveCollisionWith(otherMolecule) {
        this.body1.and(otherMolecule.body1).apply(sphereSphereCollision);
        this.body1.and(otherMolecule.body2).apply(sphereSphereCollision);
        this.body2.and(otherMolecule.body1).apply(sphereSphereCollision);
        this.body2.and(otherMolecule.body2).apply(sphereSphereCollision);
    }

    /** @param {number} scaleFactor */
    scaleVelocity(scaleFactor) {
        this.body2.scaleVelocity(scaleFactor); // TODO
        this.body1.scaleVelocity(scaleFactor); // TODO
    }

    get mass() { return this.body2.mass + this.body1.mass; }
}

class CarbonMonoxideGas {
    constructor(moleculeCount = MOLECULES_COUNT, temperature = 298, boxSize = L) {
        this._molecules = new ModelsCollection();
        this._boxSize = boxSize;
        this._temperature = temperature;
        const mass = 14E-3 / 6E23; // Average mass of Oxygen and Carbon
        const k = 1.38E-23; // Boltzmann constant
        for (let i = 0; i < moleculeCount; i++) {
            const pos = new Vec3(Math.random() - .5, Math.random() - .5, Math.random() - .5)
                .multiplyScalar(boxSize);
            const molecule = new CarbonMonoxide(pos, Math.sqrt(3 * k * temperature / mass));
            this._molecules.add(molecule);
        }
    }

    get molecules() { return this._molecules; }

    /** @param {number} dt */
    evolve(dt) {
        for (const molecule of this._molecules)
            molecule.apply(bondForce);

        for (const molecule of this._molecules) {
            molecule.integrate(dt);
            molecule.checkBoxBounce(this._boxSize * 2);
        }

        this._molecules.forEach((molecule, index) => {
            for (let j = index + 1; j < this._molecules.size; j++)
                molecule.resolveCollisionWith(this._molecules.modelObject(j));
        });
    }
}

const gas = new CarbonMonoxideGas();
const gasView = ViewsCollection.of(DiatomicMolecule).with({bondType: SwitchableBondView.Type.Spring});

// Perform some initial timesteps to make the gas look more realistic
for (let i = 0; i < 150; i++)
    gas.evolve(5e-16);

Simulation
    .with({
        htmlDivId: 'energyEquipartitionDemo',
        scene: { scale: SCALE },
        headUpDisplay: false,
        camera: { position: new Vec3(4.25, 1.25, 7.25).multiplyScalar(1.2) },
        viewport: { controls: false }
    })
    .bind(gas.molecules.alwaysWith(gasView))
    .runsEvery(0.003)
    .advancesBy(5e-16)
    .substeps(3)
    .onStep((_, dt) => gas.evolve(dt))
    .addObject3D(new Aquarium({ size: new Vec3(1, 1, 1).multiplyScalar(2 * L) }))
    .start();
