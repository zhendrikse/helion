import {
    RadialSymmetricBody, Vec3, Simulation, DiatomicMolecule,
    BodyPair, SwitchableBondView, Aquarium, RadioGroup, SphereSphereCollision, SpringForce, UPlotGraph,
    Interval
} from '../../../src/index.js';
import 'uplot/dist/uPlot.min.css';

// Simulation constants
const SCALE = 1e10;
const MOLECULES_COUNT = 150;
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

    get translationalKineticEnergy() {
        return 0.5 * this.mass * this.comVelocity().lengthSq();
    }

    get vibrationalKineticEnergy() {
        // Project velocities along the bond axis
        const bondAxis = this.body2.position.clone().sub(this.body1.position).normalize();
        const comVel = this.comVelocity();

        const velocityCarbon = this.body2.velocity.clone().sub(comVel);
        const velocityOxygen = this.body1.velocity.clone().sub(comVel);

        const velocityCarbon_along = velocityCarbon.dot(bondAxis);
        const velocityOxygen_along = velocityOxygen.dot(bondAxis);

        return 0.5 * this.body2.mass * velocityCarbon_along ** 2 + 0.5 * this.body1.mass * velocityOxygen_along ** 2;
    }

    get vibrationalPotentialEnergy() {
        const length = this.body2.position.clone().sub(this.body1.position).length();
        const stretch = length - distance;
        return 0.5 * bondForce.k * stretch * stretch;
    }

    get rotationalKineticEnergy() {
        // Rotation around the center of mass
        const comVel = this.comVelocity();
        const bondAxis = this.body2.position.clone().sub(this.body1.position);

        const velocityCarbon_perp = this.body2.velocity.clone()
            .sub(comVel).clone()
            .sub(bondAxis.clone()
                .normalize()
                .multiplyScalar(
                    this.body2.velocity.clone()
                        .sub(comVel)
                        .dot(bondAxis.clone().normalize())
                )
            );

        const velocityOxygen_perp = this.body1.velocity.clone()
            .sub(comVel).clone()
            .sub(bondAxis.clone()
                .normalize()
                .multiplyScalar(
                    this.body1.velocity.clone()
                        .sub(comVel)
                        .dot(bondAxis.clone().normalize())
                )
            );

        return 0.5 * this.body2.mass * velocityCarbon_perp.lengthSq() + 0.5 * this.body1.mass * velocityOxygen_perp.lengthSq();
    }

    comVelocity() {
        return this.body2.velocity.clone()
            .multiplyScalar(this.body2.mass)
            .add(this.body1.velocity.clone().multiplyScalar(this.body1.mass))
            .divideScalar(this.mass);
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
        this._molecules = [];
        this._boxSize = boxSize;
        this._temperature = temperature;
        const mass = 14E-3 / 6E23; // Average mass of Oxygen and Carbon
        const k = 1.38E-23; // Boltzmann constant
        for (let i = 0; i < moleculeCount; i++) {
            const pos = new Vec3(Math.random() - .5, Math.random() - .5, Math.random() - .5)
                .multiplyScalar(boxSize);
            const molecule = new CarbonMonoxide(pos, Math.sqrt(3 * k * temperature / mass));
            this._molecules.push(molecule);
        }
    }

    /**  @returns {Iterator<CarbonMonoxide>} */
    [Symbol.iterator]() {
        return this._molecules[Symbol.iterator]();
    }

    /** @param {number} dt */
    evolve(dt) {
        for (const molecule of this._molecules)
            molecule.apply(bondForce);

        for (const molecule of this._molecules) {
            molecule.integrate(dt);
            molecule.checkBoxBounce(this._boxSize * 2);
        }

        for (let i = 0; i < this._molecules.length; i++)
            for (let j = i + 1; j < this._molecules.length; j++)
                this._molecules[i].resolveCollisionWith(this._molecules[j]);
    }

    /** @param {number} newTemperature */
    updateToNewTemperature(newTemperature) {
        // Modify the speed of all molecules according to equipartition: v ~ sqrt(T)
        const scaleFactor = Math.sqrt(newTemperature / this._temperature); // ratio new temp / old temp
        for (const molecule of this)
            molecule.scaleVelocity(scaleFactor);
        this._temperature = newTemperature;
    }

    get translationalKineticEnergy() {
        return this._molecules.reduce((sum, molecule) => sum + molecule.translationalKineticEnergy, 0);
    }

    get vibrationalKineticEnergy() {
        return this._molecules.reduce((sum, molecule) => sum + molecule.vibrationalKineticEnergy, 0);
    }

    get vibrationalPotentialEnergy() {
        return this._molecules.reduce((sum, molecule) => sum + molecule.vibrationalPotentialEnergy, 0);
    }

    get rotationalKineticEnergy() {
        return this._molecules.reduce((sum, molecule) => sum + molecule.rotationalKineticEnergy, 0);
    }
}


const gas = new CarbonMonoxideGas();
/** @type {DiatomicMolecule[]} */
const moleculeViews = [];

const dt = 5e-16;
let t = 0;
let steps = 0;
let totalTranslational = 0;
let totalVibrationalKE = 0;
let totalVibrationalPE = 0;
let totalRotational = 0;

// Perform some initial timesteps to make the gas look more realistic
for (let i = 0; i < 150; i++)
    gas.evolve(dt);

const graph = new UPlotGraph({
    dataDefinition: [
        { label: 't' },
        { label: 'Translational KE', color: 'green' },
        { label: 'Vibrational KE', color: 'cyan' },
        { label: 'Vibrational PE', color: 'red' },
        { label: 'Rotational KE', color: 'yellow' }
    ],
    title: 'Energies vs Time',
    xLabel: 'Time [ps]',
    yLabel: 'Energy [J]',
    maxPoints: 1000,
    labelColor: 'black',
    yRange: new Interval(0, 1.1e-14)
});

const simulation = Simulation
    .with({
        htmlDivId: 'energyEquipartitionContainer',
        scene: {
            scale: SCALE
        },
        camera: {
            position: new Vec3(4.25, 1.25, 7.25).multiplyScalar(1.5)
        }
    })
    .withMouseClickEventListener()
    .addGraph(graph)
    .runsEvery(0.003)
    .substeps(3)
    .onStep((clock, _dt) => {
        gas.evolve(dt);
        t += dt;

        if (!simulation.isRunning) return;

        // 1-op-1 oude logica: cumulatief gemiddelde, decimated plot
        totalTranslational += gas.translationalKineticEnergy;
        totalVibrationalKE += gas.vibrationalKineticEnergy;
        totalVibrationalPE += gas.vibrationalPotentialEnergy;
        totalRotational += gas.rotationalKineticEnergy;
        steps++;

        if (steps % 150 === 0) {
            graph.push([
                t * 1e12,
                totalTranslational / steps,
                totalVibrationalKE / steps,
                totalVibrationalPE / steps,
                totalRotational / steps,
            ]);
        }
    })
    .onReset(() => {
        t = 0;
        steps = 0;
        totalTranslational = totalVibrationalKE = totalVibrationalPE = totalRotational = 0;
        graph.reset();
        graph.push([0, 0, 0, 0, 0]);
    })
    .addObject3D(new Aquarium({ size: new Vec3(1, 1, 1).multiplyScalar(2 * L) }))
    .append(new RadioGroup()
        .add('Springs', () => {
            for (const moleculeView of moleculeViews)
                moleculeView.bondType = SwitchableBondView.Type.Spring;
        })
        .add('Cylinders', () => {
            for (const moleculeView of moleculeViews)
                moleculeView.bondType = SwitchableBondView.Type.Cylinder;
        })
        .checked(1)
    );

for (const molecule of gas) {
    const moleculeView = new DiatomicMolecule();
    moleculeViews.push(moleculeView);
    simulation.bind(molecule.alwaysWith(moleculeView));
}

