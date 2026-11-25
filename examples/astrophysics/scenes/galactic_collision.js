import {
    Checkbox, Colour, PointCloud, PointCloudMaterial, PointCloudView, GlowMaterial,
    RadialSymmetricBody, Simulation, Sphere, ThreeJsScene, Trail, Vec3
} from '../../../src/index.js';

/**
 * A deliberately simple model of two interacting galaxies.
 *
 * The two galactic cores attract each other and every star is attracted by
 * both cores. Optional star-star gravity extends the original test-particle
 * model without changing the orbit of the galactic cores.
 */
class TwoGalaxies extends PointCloud {
    constructor({
        numberOfRings = [5, 5],
        ringSeparation = 3,
        ringMultiplier = 9,
        minimumSeparation = 12,
        inclinations = [60, 60],
        eccentricity = 0.6,
        starMassFraction = 0.1,
        gravitationalSoftening = 0.5
    } = {}) {
        const positions = [];
        const velocities = [];
        const colors = [];
        const sizes = [];
        const masses = [1, 1];

        // minimumSeparation is the periastron distance. With e = 0.6,
        // this gives an initial apastron distance of 4 × periastron.
        const semiMajorAxis = minimumSeparation / (1 - eccentricity);
        const apastron = semiMajorAxis * (1 + eccentricity);
        const totalMass = masses[0] + masses[1];
        const relativeSpeed = Math.sqrt(semiMajorAxis * (1 - eccentricity ** 2) * totalMass) / apastron;

        for (let galaxy = 0; galaxy < 2; galaxy++) {
            colors.push(new Colour());
            sizes.push(8);
            masses.push(0);
        }

        positions.push(new Vec3(-apastron * masses[1] / totalMass, 0, 0)); // Position galaxy core 1
        velocities.push(new Vec3(0, -relativeSpeed * masses[1] / totalMass, 0)); // Velocity galaxy core 1
        positions.push(new Vec3( apastron * masses[0] / totalMass, 0, 0)); // Position galaxy core 2
        velocities.push(new Vec3(0,  relativeSpeed * masses[1] / totalMass, 0)); // Velocity galaxy core 2

        for (let galaxy = 0; galaxy < 2; galaxy++) {
            const inclination = inclinations[galaxy] * Math.PI / 180;
            const corePosition = positions[galaxy];
            const coreVelocity = velocities[galaxy];

            for (let ring = 1; ring <= numberOfRings[galaxy]; ring++) {
                const radius = ring * ringSeparation;
                const starCount = ring * ringMultiplier;
                const totalStarCount = numberOfRings[galaxy] * (numberOfRings[galaxy] + 1) / 2 * ringMultiplier;
                const starMass = masses[galaxy] * starMassFraction / totalStarCount;
                const speed = Math.sqrt(masses[galaxy] / radius);

                for (let star = 0; star < starCount; star++) {
                    const angle = 2 * Math.PI * star / starCount;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    positions.push(corePosition.clone().add(new Vec3(
                        radius * cos * Math.cos(inclination),
                        radius * sin,
                        -radius * cos * Math.sin(inclination)
                    )));
                    velocities.push(coreVelocity.clone().add(new Vec3(
                        -speed * sin * Math.cos(inclination),
                        speed * cos,
                        speed * sin * Math.sin(inclination)
                    )));
                    colors.push(galaxy === 0 ? new Colour(0xff7f00) : new Colour(0x0064ff));
                    sizes.push(1.4);
                    masses.push(starMass);
                }
            }
        }

        super({positions, velocities, masses, colors, sizes});

        this.core1 = new RadialSymmetricBody({ position: positions[0], radius: 5 });
        this.core2 = new RadialSymmetricBody({ position: positions[1], radius: 5 });
        this._coreMasses = masses;
        this._gravitationalSofteningSquared = gravitationalSoftening ** 2;
        this._starSelfGravityEnabled = false;
        this._accelerations = this.#calculateAccelerations();
    }

    set starSelfGravityEnabled(enabled) { this._starSelfGravityEnabled = Boolean(enabled); }

    /**
     * Calculate acceleration from the two massive cores (G = 1).
     * Optionally include the pairwise attraction between stars.
     *
     * @returns {Vec3[]}
     */
    #calculateAccelerations() {
        const accelerations = this._positions.map((position, index) => {
            const acceleration = new Vec3();

            for (let core = 0; core < 2; core++) {
                if (index === core)
                    continue;

                const displacement = this._positions[core].clone().sub(position);
                const distanceSquared = displacement.lengthSq();
                if (distanceSquared > 1e-12) {
                    acceleration.addScaledVector(
                        displacement,
                        this._coreMasses[core] / (distanceSquared * Math.sqrt(distanceSquared))
                    );
                }
            }

            return acceleration;
        });

        if (this._starSelfGravityEnabled) {
            // Symmetric pairwise star-star gravity. The two cores remain
            // unaffected by the stars, as in the simplified core-orbit model.
            for (let i = 2; i < this.length; i++) {
                for (let j = i + 1; j < this.length; j++) {
                    const displacement = this._positions[j].clone().sub(this._positions[i]);
                    const distanceSquared = displacement.lengthSq() + this._gravitationalSofteningSquared;
                    const inverseCube = 1 / (distanceSquared * Math.sqrt(distanceSquared));

                    accelerations[i].addScaledVector(displacement, this._masses[j] * inverseCube);
                    accelerations[j].addScaledVector(displacement, -this._masses[i] * inverseCube);
                }
            }
        }

        return accelerations;
    }

    /** Advance the system with a velocity-Verlet / leapfrog step. @param {number} dt */
    evolve(dt) {
        const halfStep = 0.5 * dt;

        for (let i = 0; i < this.length; i++) {
            this._velocities[i].addScaledVector(this._accelerations[i], halfStep);
            this._positions[i].addScaledVector(this._velocities[i], dt);
        }

        this._accelerations = this.#calculateAccelerations();
        for (let i = 0; i < this.length; i++)
            this._velocities[i].addScaledVector(this._accelerations[i], halfStep);

        this.core1.position.copy(this._positions[0]);
        this.core2.position.copy(this._positions[1]);
    }
}

const galaxies = new TwoGalaxies();
const stars = new PointCloudView({
    material: PointCloudMaterial.galaxy(),
    // The first two particles are the cores, now rendered as separate spheres.
    sizeMapper: (pointCloud, index) => index < 2 ? 0 : pointCloud.sizeAt(index)
});

Simulation
    .with({
        htmlDivId: 'twoGalaxiesContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: { position: new Vec3(0, -75, 25), fieldOfView: 40 },
        scene: { background: ThreeJsScene.Background.STARS },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌌 Two interacting galaxies</strong><br/>' +
                'The two galactic cores attract one another and all stars move under their gravity. ' +
                'Optionally enable the mutual attraction between stars.'
        }
    })
    .bind(galaxies.alwaysWith(stars))
    .bind(galaxies.core1.alwaysWith(new Trail({ color: new Colour(0xffc864), trailStep: 10, maxPoints: 1000 })))
    .bind(galaxies.core1.alwaysWith(new Sphere({
        material: new GlowMaterial({ intensity: { value: 3.75 },  uColor: { value: new Colour(0xffc864).asThreeJsColor() } }).material
    })))
    .bind(galaxies.core2.alwaysWith(new Trail({ color: new Colour(0xc8c8ff), trailStep:10, maxPoints: 1000 })))
    .bind(galaxies.core2.alwaysWith(new Sphere({
        material: new GlowMaterial({ intensity: { value: 3.75 }, uColor: { value: new Colour(0xc8c8ff).asThreeJsColor() } }).material
    })))
    .append(new Checkbox('Star–star gravity')
        .checked(false)
        .onChange(enabled => galaxies.starSelfGravityEnabled = enabled))
    .advancesBy(0.025)
    .substeps(5)
    .onStep((clock, dt) => galaxies.evolve(dt))
    .onReset(() => galaxies.reset())
    .withMouseClickEventListener();
