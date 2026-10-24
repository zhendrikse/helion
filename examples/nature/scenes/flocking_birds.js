import {
    Body, Simulation, Vec3, Slider, Range, Button, VectorView, Colour, ModelsCollection, ViewsCollection
} from '../../../src/index.js';

// Simulation parameters
const speed = 6;  // initial horizontal speed
const size = 1;   // length of a bird vector
const threshold = (5 * size) ** 2;

class Flock {
    constructor(bird_count) {
        this._random_weight = 5;
        this._center_weight = 0.1;
        this._direction_weight = 0.05;
        this._avoid_weight = 0.5;

        this._acceleration = new Vec3();
        this._center = new Vec3();
        this._direction = new Vec3();

        this._birds = new ModelsCollection();
        const initialPhysicalFlockRadius = 3;
        for (let i = 0; i < bird_count; i++)
            this._birds.add(new Body({
                position: new Vec3().random().multiplyScalar(initialPhysicalFlockRadius),
                velocity: new Vec3(speed, 0, 0).add(new Vec3().random().multiplyScalar(speed)),
            }));
    }

    get birds() { return this._birds; }

    // avoid nearest birds (A BETTER VERSION WOULD ANTICIPATE COLLISIONS)
    avoidNearestBirds() {
        const avoid = [];
        this._birds.forEach((bird, i) => {
            avoid.push(new Vec3(0, 0, 0));
            for (let j = 0; j < i; j++) {
                const distanceSquared = bird.distanceToSquared(this._birds.modelObject(j));
                if (distanceSquared < threshold) {
                    const separation_dist = bird.positionVectorTo(this._birds.modelObject(j));
                    avoid[i].sub(separation_dist.divideScalar(distanceSquared));
                    avoid[j].add(separation_dist.divideScalar(distanceSquared));
                }
            }
        })
        return avoid;
    }

    _updateBird(bird, count, avoid, dt) {
        this._acceleration.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            .normalize()
            .multiplyScalar(this._random_weight);

        let diff = this._center.clone().sub(bird.position);
        this._acceleration.add(diff.multiplyScalar(this._center_weight));

        diff = this._direction.clone().sub(bird.velocity);
        this._acceleration.add(diff.multiplyScalar(this._direction_weight));

        const avoidVec = avoid[count];
        if (avoidVec.lengthSq() > 0) {
            diff = avoidVec.clone().normalize().sub(bird.position);
            this._acceleration.add(diff.multiplyScalar(this._avoid_weight));
        }

        bird.force.copy(this._acceleration); // Since the bird mass = 1, the force F = m a = a!
        bird.integrate(dt);
    }

    update(dt) {
        // compute average position and direction
        this._center.set(0, 0, 0);
        this._direction.set(0, 0, 0);

        this._birds.forEach(bird => {
            this._center.add(bird.position);
            this._direction.add(bird.velocity);
        });

        this._center.divideScalar(this._birds.size);
        this._direction.divideScalar(this._birds.size);

        const avoid = this.avoidNearestBirds();
        this._birds.forEach((bird, i) => this._updateBird(bird, i, avoid, dt));
    }

    set randomWeight(value) { this._random_weight = value; }
    set centeringWeight(value) { this._center_weight = value; }
    set directionWeight(number) { this._direction_weight = number; }
    set avoidWeight(number) { this._avoid_weight = number; }

    startleBirds() {
        for (const bird of this._birds)
            bird.velocity.copy(new Vec3().random().multiplyScalar(2 * speed));
    }
}

const birdCount = 250;
const flock = new Flock(birdCount);

Simulation
    .with({
        htmlDivId: 'birdsContainer',
        camera: {
            position: new Vec3(15, 0, 30).multiplyScalar(1.5),
            fieldOfView: 30
        },
        headUpDisplay: {
            enabled: false
        }
    })
    .bind(flock.birds.alwaysWith(ViewsCollection.of(VectorView).with({
        vectorProperty: body => body.velocity,
        color: new Colour(0x77ff77),
        size: 0.2,
        magnitudeMap: _mag => .7
    })))
    .withMouseClickEventListener()
    .runsEvery(0.01)
    .onStep((_, dt) => flock.update(dt))
    .append(new Slider('Random behavior: ')
        .withRange(new Range(0, 50, 1))
        .on(flock)
        .withProperty('randomWeight')
        .withValue(5))
    .append(new Slider('Centering behavior: ')
        .withRange(new Range(0, 2, .01))
        .on(flock)
        .withProperty('centeringWeight')
        .withValue(.1))
    .append(new Slider('Direction behavior: ')
        .withRange(new Range(0, 2, .01))
        .on(flock)
        .withProperty('directionWeight')
        .withValue(.1))
    .append(new Slider('Avoidance behavior: ')
        .withRange(new Range(0, 2, .01))
        .on(flock)
        .withProperty('avoidWeight')
        .withValue(1))
    .append(new Button()
        .withText('Startle birds')
        .addEventListener('click', () => flock.startleBirds()))
    .start();
