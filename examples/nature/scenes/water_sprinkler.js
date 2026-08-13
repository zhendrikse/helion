import {
    Vec3, Simulation, Sphere, Box, RadioGroup,
    RadialSymmetricBody, MathPhysicsModelBehavior, Renderable3D, Block
} from "../../../src/index.js";

const LENGTH = 0.1;
const DROPLET_RADIUS = 0.04 * LENGTH;
const OUT_OF_SIGHT_DISTANCE = 3 * LENGTH;

// A droplet is not subject to any force. Once released, it
// simply moves with constant velocity until it leaves the
// visible region.
class Droplet extends RadialSymmetricBody {
    constructor() {
        super({
            position: new Vec3(),
            velocity: new Vec3(),
            mass: 1,
            charge: 0,
            radius: DROPLET_RADIUS
        });

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

    get length() {return this._length;}

    get droplets() {
        return [
            ...this._waterBeams[0].droplets,
            ...this._waterBeams[1].droplets
        ];
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

    setOmega(value) { this._omega = value; }
    setDropletFrequency(value) { this._frequency = value; }
    setWaterVelocity(value) { this._waterVelocity = value; }
    setShootOutward(value) { this._shootOutward = value; }

    reset() {
        this._clockTicks = 0;
        this._theta = 0;

        for (const beam of this._waterBeams)
            beam.reset();
    }
}

class DropletView extends Renderable3D {
    constructor({
        color = 0x00ffff
    } = {}) {
        super();
        this._sphere = new Sphere({ color });
        this.add(this._sphere);
    }

    canBindTo(droplet) {
        return droplet.position && droplet.radius && droplet.active !== undefined;
    }

    synchronizeWith(droplet) {
        this.visible = droplet.active;

        if (!droplet.active)
            return;

        this._sphere.position.copy(droplet.position);
        this._sphere.scale.setScalar(droplet.radius);
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
        .add("Outward", () => sprinkler.setShootOutward(true))
        .add("Inward", () => sprinkler.setShootOutward(false))
        .checked(0)
    )
    .append(new RadioGroup()
        .add("π", () => sprinkler.setOmega(Math.PI))
        .add("0.5π", () => sprinkler.setOmega(0.5 * Math.PI))
        .add("1.5π", () => sprinkler.setOmega(1.5 * Math.PI))
        .add("2π", () => sprinkler.setOmega(2 * Math.PI))
        .checked(0)
    )
    .append(new RadioGroup()
        .add("15", () => sprinkler.setDropletFrequency(15))
        .add("20", () => sprinkler.setDropletFrequency(20))
        .add("30", () => sprinkler.setDropletFrequency(30))
        .checked(0)
    )
    .append(new RadioGroup()
        .add("0.0", () => sprinkler.setWaterVelocity(0.0))
        .add("0.3", () => sprinkler.setWaterVelocity(0.3))
        .add("0.6", () => sprinkler.setWaterVelocity(0.6))
        .add("1.0", () => sprinkler.setWaterVelocity(1.0))
        .checked(1)
    );


//
// Bind the droplet views.
//
// The pool is allocated once and all views remain bound. During
// the simulation droplets simply become active/inactive.
//
for (const droplet of sprinkler.droplets)
    simulation.bind(droplet.alwaysWith(new DropletView({ color: 0x00ffff })));

