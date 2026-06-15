import { Body, Simulation, Vec3, Arrow, Slider, Range, Button } from "../../../src/index.js";

// Simulation parameters
const speed = 6;  // initial horizontal speed
const size = 1;   // length of a bird vector
const threshold = (5 * size) ** 2;

class Flock {
    constructor(bird_count) {
        this._birds = [];
        this._bird_count = bird_count;
        this._random_weight = 5;
        this._center_weight = 0.1;
        this._direction_weight = 0.05;
        this._avoid_weight = 0.5;

        this._acceleration = new Vec3();
        this._center = new Vec3();
        this._direction = new Vec3();

        const initialPhysicalFlockRadius = 3;
        for (let i = 0; i < bird_count; i++)
            this._birds.push(new Body({
                position: new Vec3().random().multiplyScalar(initialPhysicalFlockRadius),
                velocity: new Vec3(speed, 0, 0).add(new Vec3().random().multiplyScalar(speed)),
            }));
    }

    // avoid nearest birds (A BETTER VERSION WOULD ANTICIPATE COLLISIONS)
    avoidNearestBirds() {
        const avoid = []
        for (let i = 0; i < this._bird_count; i++) {
            avoid.push(new Vec3(0, 0, 0));
            for (let j = 0; j < i; j++) {
                const distanceSquared = this._birds[i].distanceToSquared(this._birds[j]);
                if (distanceSquared < threshold) {
                    const separation_dist = this._birds[i].positionVectorTo(this._birds[j]);
                    avoid[i].sub(separation_dist.divideScalar(distanceSquared));
                    avoid[j].add(separation_dist.divideScalar(distanceSquared));
                }
            }
        }
        return avoid;
    }

    updateBird(count, avoid, dt) {
        const bird = this._birds[count];

        this._acceleration.set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize().multiplyScalar(this._random_weight);
        let diff = this._center.clone().sub(bird.position);
        this._acceleration.add(diff.multiplyScalar(this._center_weight));

        diff = this._direction.clone().sub(bird.velocity);
        this._acceleration.add(diff.multiplyScalar(this._direction_weight));

        diff = avoid[count].clone().normalize().sub(bird.position);
        this._acceleration.add(diff.multiplyScalar(this._avoid_weight));

        const force = this._acceleration; // Since the bird mass = 1, the force F = m a = a!
        bird.apply(force, dt);
    }

    update(dt) {
        // compute average position and direction
        this._center.set(0, 0, 0);
        this._direction.set(0, 0, 0);

        for (let i = 0; i < this._bird_count; i++) {
            const bird = this._birds[i];
            this._center.add(bird.position);
            this._direction.add(bird.velocity);
        }

        this._center.divideScalar(this._bird_count);
        this._direction.divideScalar(this._bird_count);

        const avoid = this.avoidNearestBirds();
        for (let count = 0; count < this._bird_count; count++)
            this.updateBird(count, avoid, dt);
    }

    set randomWeight(value) { this._random_weight = value; }
    set centeringWeight(value) { this._center_weight = value; }
    set directionWeight(number) { this._direction_weight = number; }
    set avoidWeight(number) { this._avoid_weight = number; }

    bird(i) { return this._birds[i]; }

    startleBirds() {
        for (let i = 0; i < this._bird_count; i++)
            this._birds[i].state.velocity = new Vec3().random().multiplyScalar(2 * speed);
    }
}

const birdCount = 250;
const flock = new Flock(birdCount);
const dt = 0.02;
const simulation = Simulation
    .with({
        htmlDivId: "birdsContainer",
        cameraPosition: new Vec3(15, 0, 30).multiplyScalar(1.5),
        fieldOfView: 30
    })
    .withMouseClickEventListener()
    .incrementsTimeBy(dt)
    .onClockTick(() => flock.update(dt))
    .append(new Slider("Random behavior: ")
        .on(flock)
        .withProperty("randomWeight")
        .withRange(new Range(0, 50, 1))
        .withValue(5))
    .append(new Slider("Centering behavior: ")
        .on(flock)
        .withProperty("centeringWeight")
        .withRange(new Range(0, 2, .01))
        .withValue(.1))
    .append(new Slider("Direction behavior: ")
        .on(flock)
        .withProperty("directionWeight")
        .withRange(new Range(0, 2, .01))
        .withValue(.1))
    .append(new Slider("Avoidance behavior: ")
        .on(flock)
        .withProperty("avoidWeight")
        .withRange(new Range(0, 2, .01))
        .withValue(1))
    .append(new Button()
        .withText("Startle birds")
        .addEventListener("click", () => flock.startleBirds()))
    .start();

for (let i = 0; i < birdCount; i++)
    simulation.synchronize(flock.bird(i).velocityVector.alwaysWith(new Arrow({
        round: true,
        color: 0xffff77,
        size: .25,
        magnitudeMap: magnitude => magnitude * .1
    })));
