import {
    Vec3, Simulation, Sphere, Box, RadioGroup, RadialSymmetricBody, Block, VisibleWhen, Slider, Range
} from "../../../src/index.js";

const LENGTH = 0.1;
const DROPLET_RADIUS = 0.04 * LENGTH;
const OUT_OF_SIGHT_DISTANCE = 3 * LENGTH;

// A droplet is not subject to any force. Once released, it
// simply moves with constant velocity until it leaves the
// visible region.
class Droplet extends RadialSymmetricBody {
    constructor() {
        super({ radius: DROPLET_RADIUS });
        this._active = false;
    }

    launch(position, velocity) {
        this.position.copy(position);
        this.velocity.copy(velocity);
        this._active = true;
    }

    update(dt) {
        if (!this._active)
            return;

        this.position.addScaledVector(this.velocity, dt);

        if (this.position.length() > OUT_OF_SIGHT_DISTANCE) {
            this.velocity.set(0, 0, 0);
            this._active = false;
        }
    }

    get active() {return this._active;}

    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this._active = false;
    }
}

// The beam owns a pool of droplets instead of continuously
// allocating new objects.
class WaterBeam {
    constructor(size = 100) {
        this._droplets = [];

        for (let i = 0; i < size; i++)
            this._droplets.push(new Droplet());

        this._nextDroplet = 0;
    }

    get droplets() { return this._droplets; }

    add(position, velocity) {
        // Find an inactive droplet.
        for (let i = 0; i < this._droplets.length; i++) {
            const index = (this._nextDroplet + i) % this._droplets.length;
            const droplet = this._droplets[index];

            if (!droplet.active) {
                droplet.launch(position, velocity);
                this._nextDroplet = (index + 1) % this._droplets.length;
                return;
            }
        }

        // Pool exhausted: recycle the next droplet.
        const droplet = this._droplets[this._nextDroplet];
        droplet.launch(position, velocity);
        this._nextDroplet = (this._nextDroplet + 1) % this._droplets.length;
    }

    update(dt) {
        for (const droplet of this._droplets)
            droplet.update(dt);
    }

    reset() {
        this._nextDroplet = 0;

        for (const droplet of this._droplets)
            droplet.reset();
    }
}

class Sprinkler extends Block {
    constructor({
        length = LENGTH,
        dropletPoolSize = 100
    } = {}) {
        super({
            size: new Vec3(length, 0.05 * length, 0.05 * length),
        });

        this._length = length;
        this._omega = Math.PI;
        this._shootOutward = true;
        this._frequency = 15;
        this._waterVelocity = 0.3;
        this._clockTicks = 0;
        this._theta = 0;
        this._waterBeams = [
            new WaterBeam(dropletPoolSize),
            new WaterBeam(dropletPoolSize)
        ];
    }

    /**
     * @returns {Iterator<Droplet>}
     */
    [Symbol.iterator]() {
        const allDroplets = [
            ...this._waterBeams[0].droplets,
            ...this._waterBeams[1].droplets
        ];
        return allDroplets[Symbol.iterator]();
    }

    rotate(dt) {
        this.orientation.z += this._omega * dt;
    }

    shedWater(dt) {
        if (this._clockTicks >= 1 / this._frequency) {
            this._letOutNewDroplets();
            this._clockTicks = 0;
        }

        this._waterBeams[0].update(dt);
        this._waterBeams[1].update(dt);

        this._clockTicks += dt;
    }

    _letOutNewDroplets() {
        const positions = this._endpointPositions();
        const velocities = this._endpointVelocities();

        this._waterBeams[0].add(positions[0], velocities[0]);
        this._waterBeams[1].add(positions[1], velocities[1]);
    }

    // Endpoint positions: r = (length / 2) * (cos(theta), sin(theta), 0)
    _endpointPositions() {
        const theta = this.orientation.z;
        const r = new Vec3(Math.cos(theta), Math.sin(theta), 0).multiplyScalar(this._length / 2);
        return [r, r.clone().negate()];
    }

    // Endpoint velocities: v = -r x omega + a * waterVelocity * r_hat
    //
    // a = +1  -> shoot outward
    // a = -1  -> shoot inward
    _endpointVelocities() {
        const a = this._shootOutward ? 1 : -1;
        const positions = this._endpointPositions();
        const omega = new Vec3(0, 0, this._omega);
        const velocities = [];

        for (const position of positions) {
            const tangentialVelocity = position
                .clone()
                .cross(omega)
                .multiplyScalar(-1);

            const radialVelocity = position
                .clone()
                .normalize()
                .multiplyScalar(a * this._waterVelocity);

            velocities.push(tangentialVelocity.add(radialVelocity));
        }

        return velocities;
    }

    set omega(value) { this._omega = value; }
    set dropletFrequency(value) { this._frequency = value; }
    set waterVelocity(value) { this._waterVelocity = value; }
    set shootOutward(value) { this._shootOutward = value; }
    get length() {return this._length;}

    reset() {
        this._clockTicks = 0;
        this._theta = 0;

        for (const beam of this._waterBeams)
            beam.reset();
    }
}

const sprinkler = new Sprinkler({ length: LENGTH, dropletPoolSize: 100 });

const simulation = Simulation
    .with({
        htmlDivId: "waterSprinklerContainer",
        cameraPosition: new Vec3(0, 15, 35).multiplyScalar(.275),
        fieldOfView: 40,
        scale: 10,
        headUpDisplay: true
    })
    .withMouseClickEventListener()
    .runsEvery(1e-2)
    .bind(sprinkler.alwaysWith(new Box({ color: 0xffff00 })))
    .bind(new RadialSymmetricBody({ radius: 0.03 * LENGTH }).onceWith(new Sphere({color: 0xff0000})))
    .onStep((clock, dt) => {
        sprinkler.shedWater(dt);
        sprinkler.rotate(dt);
    })
    .onReset(() => sprinkler.reset())
    .append(new RadioGroup()
        .add("Outward", () => sprinkler.shootOutward = true)
        .add("Inward", () => sprinkler.shootOutward = false)
        .checked(0)
    )
    .append(new Slider("Omega")
        .on(sprinkler)
        .withProperty("omega")
        .withRange(new Range(-2 * Math.PI, 2 * Math.PI, .1))
        .withValue(Math.PI)
    )
    .append(new Slider("Droplet / s")
        .on(sprinkler)
        .withProperty("dropletFrequency")
        .withRange(new Range(1, 30, 1))
        .withValue(15)
    )
    .append(new Slider("Water velocity")
        .on(sprinkler)
        .withProperty("waterVelocity")
        .withRange(new Range(0, 1, .01))
        .withValue(.3)
    );


// The pool is allocated once and all views remain bound. During
// the simulation droplets simply become active/inactive.
for (const droplet of sprinkler)
    simulation.bind(droplet.alwaysWith(new VisibleWhen(
        new Sphere({ color: 0x00ffff }),
        droplet => droplet.active
    )));

