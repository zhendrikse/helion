import {
    Bond, RadialSymmetricBody, Vec3, resolveSphereSphereCollisionBetween, Simulation, DiatomicMolecule,
    TwoBodies, SwitchableBondView, Aquarium
} from "../../../src/index.js";

// Simulation constants
const SCALE = 1e10;
const MOLECULES_COUNT = 150;
const one_third = 1. / 3.;
const L = ((24.4E-3 / 6E23) * MOLECULES_COUNT) ** one_third / 50; // 2L is the length of the cubic container box

export class CarbonMonoxide extends TwoBodies {
    constructor(position, initialSpeed) {
        const radius = 31E-12;
        const distance = 2.5 * radius;
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
        super(oxygen.and(carbon));
        
        this._bond = Bond.between(oxygen.and(carbon), {
            restLength: distance,
            k: 18600,
            radius: .5 * radius
        });
        this.body1 = oxygen;
        this.body2 = carbon;
    }

    update(startPosition, endPosition) {
        this.body1.moveTo(startPosition);
        this.body2.moveTo(endPosition);
        this._bond.update();
    }

    confineToBox(atom, size) {
        const half = size / 2;
        ["x", "y", "z"].forEach(axis => {
            if (atom.position[axis] > half - atom.radius)
                atom.state.velocity[axis] = -Math.abs(atom.velocity[axis]);
            if (atom.position[axis] < -half + atom.radius)
                atom.state.velocity[axis] = Math.abs(atom.velocity[axis]);
        });
    }

    checkBoxBounce(boxLength) {
        this.confineToBox(this.body1, boxLength);
        this.confineToBox(this.body2, boxLength);
    }

    resolveCollisionWith(otherMolecule) {
        resolveSphereSphereCollisionBetween(this.body1.and(otherMolecule.body1));
        resolveSphereSphereCollisionBetween(this.body1.and(otherMolecule.body2));
        resolveSphereSphereCollisionBetween(this.body2.and(otherMolecule.body1));
        resolveSphereSphereCollisionBetween(this.body2.and(otherMolecule.body2));
    }

    changeBondType(type) {
        this._bond.changeBondType(type);
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
        const stretch = length - this._bond.restLength;
        return 0.5 * this._bond.k * stretch * stretch;
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

    scaleVelocity(scaleFactor) {
        this.body2.scaleVelocity(scaleFactor);
        this.body1.scaleVelocity(scaleFactor);
    }

    get mass() { return this.body2.mass + this.body1.mass; }
    get bond() { return this._bond; }
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

    /**
     * @returns {Iterator<CarbonMonoxide>}
     */
    [Symbol.iterator]() {
        return this._molecules[Symbol.iterator]();
    }

    update(dt) {
        for (const molecule of this._molecules) {
            molecule.body1.clearForce();
            molecule.body2.clearForce();
        }

        for (const molecule of this._molecules)
            molecule.bond.applyForce();

        for (const molecule of this._molecules) {
            molecule.body1.integrate(dt);
            molecule.body2.integrate(dt);
            molecule.checkBoxBounce(this._boxSize * 2);
        }

        for (let i = 0; i < this._molecules.length; i++)
            for (let j = i + 1; j < this._molecules.length; j++)
                this._molecules[i].resolveCollisionWith(this._molecules[j]);
    }

    updateToNewTemperature(newTemperature) {
        // Modify the speed of all molecules according to equipartition: v ~ sqrt(T)
        const scaleFactor = Math.sqrt(newTemperature / this._temperature); // ratio new temp / old temp
        for (let molecule of this._molecules)
            molecule.scaleVelocity(scaleFactor);
        this._temperature = newTemperature;
    }

    changeBondType(type) {
        for (let molecule of this._molecules)
            molecule.changeBondType(type);
        this.update(0);
    }

    get translationalKineticEnergy() {
        return this._molecules.reduce((sum, m) => sum + m.translationalKineticEnergy, 0);
    }

    get vibrationalKineticEnergy() {
        return this._molecules.reduce((sum, m) => sum + m.vibrationalKineticEnergy, 0);
    }

    get vibrationalPotentialEnergy() {
        return this._molecules.reduce((sum, m) => sum + m.vibrationalPotentialEnergy, 0);
    }

    get rotationalKineticEnergy() {
        return this._molecules.reduce((sum, m) => sum + m.rotationalKineticEnergy(), 0);
    }

    get count() { return this._molecules.length; }
}

const simulation = Simulation
    .with({
        htmlDivId: "energyEquipartitionContainer",
        scale: SCALE,
        headUpDisplay: true,
        cameraPosition: new Vec3(4.25, 1.25, 7.25).multiplyScalar(1.5)
    })
    .withMouseClickEventListener()
    .runsEvery(0.001)
    .onStep(() => gas.update(5e-16))
    .addObject3D(new Aquarium({
        size: new Vec3(1, 1, 1).multiplyScalar(2 * L)
    }));


const gas = new CarbonMonoxideGas();

// Perform some initial timesteps to make the gas look more realistic
for (let i = 0; i < 150; i++)
    gas.update(5e-16);

for (const molecule of gas)
    simulation.bind(molecule.alwaysWith(new DiatomicMolecule({
        bondType: SwitchableBondView.Type.Cylinder
    })))