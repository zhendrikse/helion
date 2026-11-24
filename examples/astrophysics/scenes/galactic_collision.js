import {
    Colour, PointCloud, PointCloudMaterial, PointCloudView, Simulation, ThreeJsScene, Vec3
} from '../../../src/index.js';

/**
 * A deliberately simple model of two interacting galaxies.
 *
 * The two galactic cores attract each other and every star is attracted by
 * both cores. The gravitational influence of the stars on one another is
 * ignored, matching the original two_galaxies simulation.
 */
class TwoGalaxies extends PointCloud {
    constructor({
        numberOfRings = [5, 5],
        ringSeparation = 3,
        ringMultiplier = 6,
        minimumSeparation = 12,
        inclinations = [60, 60],
        masses = [1, 1],
        eccentricity = 0.6
    } = {}) {
        super();

        this._coreMasses = masses;
        this._initialPositions = [];
        this._initialVelocities = [];

        // minimumSeparation is the periastron distance. With e = 0.6,
        // this gives an initial apastron distance of 4 × periastron.
        const semiMajorAxis = minimumSeparation / (1 - eccentricity);
        const apastron = semiMajorAxis * (1 + eccentricity);
        const totalMass = masses[0] + masses[1];
        const relativeSpeed = Math.sqrt(semiMajorAxis * (1 - eccentricity ** 2) * totalMass) / apastron;

        const corePositions = [
            new Vec3(-apastron * masses[1] / totalMass, 0, 0),
            new Vec3(apastron * masses[0] / totalMass, 0, 0)
        ];
        const coreVelocities = [
            new Vec3(0, -relativeSpeed * masses[1] / totalMass, 0),
            new Vec3(0, relativeSpeed * masses[0] / totalMass, 0)
        ];

        const galaxyColors = [new Colour(0xff7f00), new Colour(0x0064ff)];
        const coreColors = [new Colour(0xffc864), new Colour(0xc8c8ff)];

        for (let galaxy = 0; galaxy < 2; galaxy++) {
            this._positions.push(corePositions[galaxy].clone());
            this._velocities.push(coreVelocities[galaxy].clone());
            this._colors.push(coreColors[galaxy]);
            this._sizes.push(8);
        }

        for (let galaxy = 0; galaxy < 2; galaxy++) {
            const inclination = inclinations[galaxy] * Math.PI / 180;
            const corePosition = corePositions[galaxy];
            const coreVelocity = coreVelocities[galaxy];

            for (let ring = 1; ring <= numberOfRings[galaxy]; ring++) {
                const radius = ring * ringSeparation;
                const starCount = ring * ringMultiplier;
                const speed = Math.sqrt(masses[galaxy] / radius);

                for (let star = 0; star < starCount; star++) {
                    const angle = 2 * Math.PI * star / starCount;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    this._positions.push(corePosition.clone().add(new Vec3(
                        radius * cos * Math.cos(inclination),
                        radius * sin,
                        -radius * cos * Math.sin(inclination)
                    )));
                    this._velocities.push(coreVelocity.clone().add(new Vec3(
                        -speed * sin * Math.cos(inclination),
                        speed * cos,
                        speed * sin * Math.sin(inclination)
                    )));
                    this._colors.push(galaxyColors[galaxy]);
                    this._sizes.push(1.4);
                }
            }
        }

        this._initialPositions = this._positions.map(position => position.clone());
        this._initialVelocities = this._velocities.map(velocity => velocity.clone());
        this._accelerations = this.#calculateAccelerations();
    }

    /**
     * Calculate acceleration from the two massive cores (G = 1).
     * Stars are treated as test particles; only the cores have mass.
     *
     * @returns {Vec3[]}
     */
    #calculateAccelerations() {
        return this._positions.map((position, index) => {
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
    }

    reset() {
        for (let i = 0; i < this.length; i++) {
            this._positions[i].copy(this._initialPositions[i]);
            this._velocities[i].copy(this._initialVelocities[i]);
        }
        this._accelerations = this.#calculateAccelerations();
    }
}

const galaxies = new TwoGalaxies();
const stars = new PointCloudView({ material: PointCloudMaterial.galaxy() });

Simulation
    .with({
        htmlDivId: 'twoGalaxiesContainer',
        viewport: { aspectRatio: '4 / 3' },
        camera: {
            position: new Vec3(0, -65, 50),
            target: new Vec3(0, 0, 0),
            fieldOfView: 45
        },
        scene: { background: ThreeJsScene.Background.STARS },
        lighting: { enabled: false },
        infoPanel: {
            text: '<strong>🌌 Two interacting galaxies</strong><br/>' +
                'A simplified gravitational model: the two galactic cores attract one another, ' +
                'while all stars move under the gravity of both cores. Stellar self-gravity is ignored.'
        }
    })
    .bind(galaxies.alwaysWith(stars))
    .advancesBy(0.025)
    .substeps(5)
    .onStep((clock, dt) => galaxies.evolve(dt))
    .onReset(() => galaxies.reset())
    .withMouseClickEventListener();